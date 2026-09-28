import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai/index.js";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(currentDirectory, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
fs.mkdirSync(path.join(currentDirectory, "data"), { recursive: true });
const database = new Database(path.join(currentDirectory, "data", "chat.sqlite"));
const servicesPath = path.join(currentDirectory, "..", "Lawyer_Frontend", "src", "Pages", "Services.json");
const lawyersPath = path.join(currentDirectory, "..", "Lawyer_Frontend", "src", "Pages", "Lawyers.json");
const services = JSON.parse(fs.readFileSync(servicesPath, "utf8"));
const lawyers = JSON.parse(fs.readFileSync(lawyersPath, "utf8"));

database.pragma("journal_mode = WAL");
database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_id TEXT NOT NULL UNIQUE,
        visitor_name TEXT,
        visitor_phone TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        close_reason TEXT,
        violation_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
    CREATE TABLE IF NOT EXISTS consultations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        consultation_type TEXT NOT NULL,
        preferred_date TEXT,
        details TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_access_codes (
        email TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_presence (
        session_hash TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        device TEXT,
        user_agent TEXT,
        ip_address TEXT,
        latitude REAL,
        longitude REAL,
        last_seen_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS consultation_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_id TEXT NOT NULL UNIQUE,
        visitor_token_hash TEXT NOT NULL,
        visitor_name TEXT NOT NULL,
        visitor_email TEXT,
        request_details TEXT,
        preferred_at TEXT,
        scheduled_at TEXT,
        appointment_ends_at TEXT,
        visitor_typing_until INTEGER NOT NULL DEFAULT 0,
        admin_typing_until INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS consultation_chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        sender_role TEXT NOT NULL CHECK (sender_role IN ('visitor', 'admin')),
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES consultation_chats(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS consultation_chat_email_links (
        token_hash TEXT PRIMARY KEY,
        chat_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (chat_id) REFERENCES consultation_chats(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS messages_conversation_index ON messages(conversation_id, id);
    CREATE INDEX IF NOT EXISTS consultations_created_index ON consultations(created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS consultation_chats_updated_index ON consultation_chats(updated_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS consultation_chat_messages_index ON consultation_chat_messages(chat_id, id);
`);
database.pragma("foreign_keys = ON");
const consultationChatColumns = new Set(database.pragma("table_info(consultation_chats)").map((column) => column.name));
for (const [name, definition] of [
    ["visitor_email", "TEXT"],
    ["request_details", "TEXT"],
    ["preferred_at", "TEXT"],
    ["scheduled_at", "TEXT"],
    ["appointment_ends_at", "TEXT"],
    ["visitor_typing_until", "INTEGER NOT NULL DEFAULT 0"],
    ["admin_typing_until", "INTEGER NOT NULL DEFAULT 0"],
]) {
    if (!consultationChatColumns.has(name)) {
        database.exec(`ALTER TABLE consultation_chats ADD COLUMN ${name} ${definition}`);
    }
}
const consultationMessageColumns = new Set(database.pragma("table_info(consultation_chat_messages)").map((column) => column.name));
for (const [name, definition] of [["sender_id", "TEXT"], ["edited_at", "TEXT"]]) {
    if (!consultationMessageColumns.has(name)) {
        database.exec(`ALTER TABLE consultation_chat_messages ADD COLUMN ${name} ${definition}`);
    }
}
database.prepare("UPDATE consultation_chat_messages SET sender_id = 'visitor' WHERE sender_role = 'visitor' AND sender_id IS NULL").run();
try {
    database.exec("ALTER TABLE conversations ADD COLUMN violation_count INTEGER NOT NULL DEFAULT 0");
} catch (error) {
    if (!error.message.includes("duplicate column name")) throw error;
}
for (const column of ["visitor_name TEXT", "visitor_phone TEXT"]) {
    try {
        database.exec(`ALTER TABLE conversations ADD COLUMN ${column}`);
    } catch (error) {
        if (!error.message.includes("duplicate column name")) throw error;
    }
}

const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_ORIGIN,
].filter(Boolean));
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed."));
    },
    credentials: true,
}));
app.use(express.json());
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

const insertConversation = database.prepare("INSERT OR IGNORE INTO conversations (public_id, visitor_name, visitor_phone) VALUES (?, ?, ?)");
const getConversation = database.prepare("SELECT * FROM conversations WHERE public_id = ?");
const getConversationSummaries = database.prepare(`SELECT public_id, visitor_name, visitor_phone, status, close_reason, violation_count, created_at, updated_at, (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id) AS message_count FROM conversations ORDER BY updated_at DESC`);
const getConversationMessages = database.prepare("SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC");
const deleteConversationMessages = database.prepare("DELETE FROM messages WHERE conversation_id = ?");
const deleteConversation = database.prepare("DELETE FROM conversations WHERE id = ?");
const deleteAllMessages = database.prepare("DELETE FROM messages");
const deleteAllConversations = database.prepare("DELETE FROM conversations");
const insertMessage = database.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)");
const getMessages = database.prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 12");
const closeConversation = database.prepare("UPDATE conversations SET status = 'closed', close_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
const incrementViolation = database.prepare("UPDATE conversations SET violation_count = violation_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
const touchConversation = database.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
const createConsultation = database.prepare("INSERT INTO consultations (name, phone, email, consultation_type, preferred_date, details) VALUES (?, ?, ?, ?, ?, ?)");
const getConsultation = database.prepare("SELECT * FROM consultations WHERE id = ?");
const getConsultations = database.prepare("SELECT * FROM consultations ORDER BY created_at DESC, id DESC");
const updateConsultationStatus = database.prepare("UPDATE consultations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
const deleteConsultation = database.prepare("DELETE FROM consultations WHERE id = ?");

function normalizeText(value) {
    return value.toLocaleLowerCase("ar-EG").replace(/[،,؟!?؛:()[\]{}"']/g, " ").replace(/\s+/g, " ").trim();
}

function isUnsafeRequest(value) {
    const text = normalizeText(value);
    return /<\/?script|javascript|\b(let|const|var|function|fetch|async|await|import|export)\b|document\s*\.|document\.(cookie|localstorage)|localstorage|process\.env|api\s*key|system\s*prompt|ignore\s+(all\s+)?previous|show\s+me\s+(the\s+)?(source|code)|give\s+me\s+(the\s+)?(site|website)\s+(data|database|files?)|website\s+data|بيانات\s+(الموقع|الموقع بالكامل)|كود\s+(الموقع|المنصة)|قاعدة\s+البيانات|select\s+.+\s+from|drop\s+table|union\s+select/i.test(text);
}

function isPlatformQuestion(value) {
    const text = normalizeText(value);
    return /منصه|المنصة|الموقع|الخدمات|الخدمه|الخدمة|اختصاص|تخصص|محام|قضيه|قضية|قانون|استشار|توكيل|عقد|عقار|شركة|ضرائب|مكتب|صانع|منشئ|creator|lawyer|legal|case|service|hello|اهلا|أهلا|سلام|مساعده|مساعدة|help/i.test(text);
}

function getPlatformReply(value) {
    const text = normalizeText(value);
    if (/مين\s+(دي|ده)|ايه\s+(دي|ده)|ما\s+هي|ما\s+هذا|منصه\s+مين|مين\s+(صاحب|مالك)\s+(المنصه|المنصة|الموقع)|المنصة\s+دي|الموقع\s+ده|اسم\s+(المنصة|الموقع)/.test(text)) {
        return "دي منصة م/ محمد سعد أبو الفرج للخدمات والاستشارات القانونية.";
    }
    if (/صانع|منشئ|باني|بنى|عمل\s+(المنصة|الموقع)|creator|who\s+(made|built)|made\s+this|built\s+this/.test(text)) {
        return "صانع المنصة هو نوكس أو محمود احمد النجاء تقدر تخش تشوف الصفحه بتاعته من هنا";
    }
    return null;
}

function textIncludesToken(text, token) {
    const normalizedToken = token.replace(/^ال/, "").replace(/ات$/, "");
    return text.includes(token) || (normalizedToken.length > 2 && text.includes(normalizedToken));
}

function findRoute(value) {
    const text = normalizeText(value);
    const asksForLawyersPage = /اعرف\s+(المحامين|المحامي)|شوف\s+(المحامين|المحامي)|صفحه\s+(المحامين|المحامي)|صفحة\s+(المحامين|المحامي)|قائمه\s+(المحامين|المحامي)|قائمة\s+(المحامين|المحامي)|lawyers?\s+page|our[- ]lawyers/.test(text);
    const mentionsCase = /قضيه|قضية|جنايات|جنائي|جنائية|نصب|سرقه|سرقة|قتل|ضرب|تبديد|طلاق|خلع|زواج|نفقة|ميراث|عقار|أرض|شركه|شركة|ضرائب|تجاري|criminal|divorce|fraud|inheritance/i.test(text);
    if (asksForLawyersPage && !mentionsCase) {
        return { route: "/our-lawyers", type: "lawyers" };
    }

    let bestMatch = null;
    for (const service of services) {
        const serviceName = normalizeText(service.Name);
        const nameWords = serviceName.split(" ").filter((word) => word.length > 2);
        const nameMatches = nameWords.filter((word) => textIncludesToken(text, word)).length;
        const descriptionWords = normalizeText(service.Description || "").split(" ").filter((word) => word.length > 4);
        const descriptionMatches = descriptionWords.filter((word) => textIncludesToken(text, word)).length;
        const score = (text.includes(serviceName) ? 10 : 0) + nameMatches * 2 + Math.min(descriptionMatches, 2);

        if (score >= 4 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { score, route: `/services/${encodeURIComponent(service.Name)}`, type: "service", service };
        }
    }
    return bestMatch;
}

function findNearestLawyer(value) {
    const text = normalizeText(value);
    const caseWords = /قضيه|قضية|جنايات|جنائي|جنائية|نصب|سرقه|سرقة|قتل|ضرب|تبديد|طلاق|خلع|زواج|نفقة|ميراث|عقار|أرض|شركه|شركة|ضرائب|تجاري|administrative|criminal|divorce|fraud|inheritance|real estate/i;
    if (!caseWords.test(text)) return null;

    const rankedLawyers = lawyers.map((lawyer) => {
        const specializationWords = normalizeText(lawyer.specialization).split(" ").filter((word) => word.length > 2);
        const matches = specializationWords.filter((word) => textIncludesToken(text, word)).length;
        return { lawyer, score: matches };
    }).sort((first, second) => second.score - first.score);

    return rankedLawyers[0]?.lawyer || null;
}

function isLawyerRequest(value) {
    return /محام|المحامين|المحامي|محامى|lawyer|lawyers|attorney|attorneys/i.test(normalizeText(value));
}

function isLawyerCatalogQuestion(value) {
    const text = normalizeText(value);
    const asksAboutSpecialties = /اختصاص|تخصص|مجال/.test(text)
        && /محام|lawyer|attorney|عندكم|لدينا/.test(text);
    const asksAboutLawyerServices = /خدمات|الخدمه|الخدمة/.test(text)
        && /محام|lawyer|attorney/.test(text);
    return asksAboutSpecialties || asksAboutLawyerServices;
}

function getLawyerCatalogReply() {
    const specializations = [...new Set(lawyers
        .map((lawyer) => lawyer.specialization)
        .filter((specialization) => typeof specialization === "string" && specialization.trim()))];
    const serviceNames = [...new Set(services
        .map((service) => service.Name)
        .filter((name) => typeof name === "string" && name.trim()))];

    if (!specializations.length) return "لا توجد اختصاصات مسجلة.";
    return specializations
        .map((specialization) => [specialization, ...serviceNames].join("\n"))
        .join("\n\n");
}

function getOrCreateConversation(publicId, visitorName = null, visitorPhone = null) {
    const safePublicId = typeof publicId === "string" && /^[a-zA-Z0-9_-]{8,100}$/.test(publicId)
        ? publicId
        : randomUUID();
    insertConversation.run(safePublicId, visitorName, visitorPhone);
    return getConversation.get(safePublicId);
}

const ADMIN_ROLES = new Set(["admin", "main_admin", "master_admin"]);
let adminAccounts = [];
try {
    const configuredAccounts = JSON.parse(process.env.ADMIN_ACCOUNTS || "[]");
    if (!Array.isArray(configuredAccounts)) throw new Error("ADMIN_ACCOUNTS must be a JSON array.");
    adminAccounts = configuredAccounts.map((account) => ({
        email: typeof account.email === "string" ? account.email.trim().toLowerCase() : "",
        name: typeof account.name === "string" ? account.name.trim() : "",
        role: account.role,
    }));
    if (adminAccounts.some((account) => !account.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email) || !ADMIN_ROLES.has(account.role))) {
        throw new Error("Each ADMIN_ACCOUNTS entry needs a valid email and role.");
    }
    if (new Set(adminAccounts.map((account) => account.email)).size !== adminAccounts.length) {
        throw new Error("ADMIN_ACCOUNTS cannot contain duplicate email addresses.");
    }
} catch (error) {
    console.error(`Invalid admin configuration: ${error.message}`);
    process.exit(1);
}

const adminByEmail = new Map(adminAccounts.map((account) => [account.email, account]));
const SESSION_COOKIE = "lawyer_admin_session";
const SESSION_TTL = 14 * 24 * 60 * 60 * 1000;
const ACCESS_CODE_TTL = 7 * 24 * 60 * 60 * 1000;
const ONLINE_WINDOW = 90 * 1000;
const loginAttempts = new Map();
const consultationRequestAttempts = new Map();
const mailTransport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    })
    : null;

function hashValue(value) {
    return createHash("sha256").update(value).digest("hex");
}

function getCookie(req, name) {
    const cookie = req.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : "";
}

function setSessionCookie(res, token) {
    const sameSite = process.env.ADMIN_COOKIE_SAME_SITE || "Lax";
    const secure = process.env.NODE_ENV === "production" || sameSite.toLowerCase() === "none";
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/api/admin; SameSite=${sameSite}; Max-Age=${SESSION_TTL / 1000}${secure ? "; Secure" : ""}`);
}

function clearSessionCookie(res) {
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/api/admin; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

function updatePresence(req, sessionHash, email, device = {}) {
    const latitude = Number(device.latitude);
    const longitude = Number(device.longitude);
    database.prepare(`
        INSERT INTO admin_presence (session_hash, email, device, user_agent, ip_address, latitude, longitude, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_hash) DO UPDATE SET device = excluded.device, user_agent = excluded.user_agent,
            ip_address = excluded.ip_address, latitude = COALESCE(excluded.latitude, admin_presence.latitude),
            longitude = COALESCE(excluded.longitude, admin_presence.longitude), last_seen_at = excluded.last_seen_at
    `).run(
        sessionHash,
        email,
        typeof device.device === "string" ? device.device.slice(0, 100) : null,
        typeof device.userAgent === "string" ? device.userAgent.slice(0, 500) : req.get("user-agent")?.slice(0, 500) || null,
        req.ip?.slice(0, 100) || null,
        Number.isFinite(latitude) && Math.abs(latitude) <= 90 ? latitude : null,
        Number.isFinite(longitude) && Math.abs(longitude) <= 180 ? longitude : null,
        Date.now(),
    );
}

function requireAdmin(req, res, next) {
    const token = getCookie(req, SESSION_COOKIE);
    if (!token) return res.status(401).json({ error: "سجّل الدخول للمتابعة." });

    const tokenHash = hashValue(token);
    const session = database.prepare("SELECT email, role, expires_at FROM admin_sessions WHERE token_hash = ?").get(tokenHash);
    const configuredAccount = session && adminByEmail.get(session.email);
    if (!session || session.expires_at <= Date.now() || !configuredAccount || configuredAccount.role !== session.role) {
        database.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(tokenHash);
        database.prepare("DELETE FROM admin_presence WHERE session_hash = ?").run(tokenHash);
        clearSessionCookie(res);
        return res.status(401).json({ error: "انتهت صلاحية الجلسة. سجّل الدخول مرة أخرى." });
    }

    req.admin = { ...configuredAccount, sessionHash: tokenHash };
    return next();
}

function requireMasterAdmin(req, res, next) {
    if (req.admin?.role !== "master_admin") return res.status(403).json({ error: "هذه الصفحة متاحة للـ Master Admin فقط." });
    return next();
}

function requireConsultationAdmin(req, res, next) {
    if (req.admin?.role !== "main_admin" && req.admin?.role !== "master_admin") {
        return res.status(403).json({ error: "محادثات الاستشارات متاحة للـ Main Admin والـ Master Admin فقط." });
    }
    return next();
}

function getConsultationChatState(chat) {
    if (chat.status === "closed") return "closed";
    if (!chat.scheduled_at || !chat.appointment_ends_at) return "awaiting_appointment";
    const now = Date.now();
    const startsAt = Date.parse(chat.scheduled_at);
    const endsAt = Date.parse(chat.appointment_ends_at);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) return "awaiting_appointment";
    if (now < startsAt) return "scheduled";
    if (now >= endsAt) {
        database.prepare("UPDATE consultation_chats SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'open'").run(chat.id);
        database.prepare("DELETE FROM consultation_chat_email_links WHERE chat_id = ?").run(chat.id);
        chat.status = "closed";
        return "closed";
    }
    return "open";
}

async function sendEmail(to, subject, text) {
    if (!mailTransport || !(process.env.SMTP_FROM || process.env.SMTP_USER)) return false;
    await mailTransport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
    return true;
}

app.use("/api/admin", (req, res, next) => {
    const origin = req.get("origin");
    if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: "مصدر الطلب غير مسموح." });
    return next();
});

app.post("/api/admin/login", (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const account = adminByEmail.get(email);
    const attemptKey = `${req.ip}:${email}`;
    const now = Date.now();
    const attempts = loginAttempts.get(attemptKey) || { count: 0, resetAt: now + 15 * 60 * 1000 };
    if (attempts.resetAt <= now) {
        attempts.count = 0;
        attempts.resetAt = now + 15 * 60 * 1000;
    }
    attempts.count += 1;
    loginAttempts.set(attemptKey, attempts);
    if (attempts.count > 8) return res.status(429).json({ error: "محاولات كثيرة. حاول بعد 15 دقيقة." });
    if (!mailTransport) return res.status(503).json({ error: "إعداد إرسال البريد غير مكتمل على السيرفر." });

    const accessCode = database.prepare("SELECT code_hash, expires_at FROM admin_access_codes WHERE email = ?").get(email);
    const submittedHash = hashValue(code);
    const codeMatches = accessCode && accessCode.expires_at > now
        && timingSafeEqual(Buffer.from(accessCode.code_hash, "hex"), Buffer.from(submittedHash, "hex"));
    if (!account || !/^\d{8}$/.test(code) || !codeMatches) {
        return res.status(401).json({ error: "البريد أو كود الدخول غير صحيح أو منتهي الصلاحية." });
    }

    const sessionToken = randomBytes(32).toString("base64url");
    const sessionHash = hashValue(sessionToken);
    database.prepare("INSERT INTO admin_sessions (token_hash, email, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
        .run(sessionHash, account.email, account.role, now, Math.min(now + SESSION_TTL, accessCode.expires_at));
    updatePresence(req, sessionHash, account.email, req.body.device);
    setSessionCookie(res, sessionToken);
    loginAttempts.delete(attemptKey);
    return res.json({ admin: { email: account.email, name: account.name, role: account.role } });
});

app.get("/api/admin/session", requireAdmin, (req, res) => {
    const code = database.prepare("SELECT expires_at FROM admin_access_codes WHERE email = ?").get(req.admin.email);
    return res.json({
        admin: { email: req.admin.email, name: req.admin.name, role: req.admin.role },
        codeExpiresAt: code?.expires_at || null,
    });
});

app.post("/api/admin/access-codes/rotate", requireAdmin, requireMasterAdmin, async (req, res) => {
    if (!mailTransport || !(process.env.SMTP_FROM || process.env.SMTP_USER)) {
        return res.status(503).json({ error: "إعداد إرسال البريد غير مكتمل على السيرفر." });
    }

    const sent = [];
    const failed = [];
    const expiresAt = Date.now() + ACCESS_CODE_TTL;
    for (const account of adminAccounts) {
        const code = String(randomInt(10000000, 100000000));
        try {
            await mailTransport.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: account.email,
                subject: "كود دخول جديد للوحة إدارة المنصة",
                text: `مرحبًا ${account.name || ""}\n\nتم إصدار كود دخول جديد: ${code}\n\nالكود صالح لمدة 7 أيام وينتهي في ${new Date(expiresAt).toLocaleString("ar-EG")}. الأكواد والجلسات السابقة لهذا الحساب لم تعد صالحة.`,
            });
            database.prepare(`
                INSERT INTO admin_access_codes (email, code_hash, expires_at) VALUES (?, ?, ?)
                ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at
            `).run(account.email, hashValue(code), expiresAt);
            database.prepare("DELETE FROM admin_presence WHERE email = ? AND session_hash != ?")
                .run(account.email, req.admin.sessionHash);
            database.prepare("DELETE FROM admin_sessions WHERE email = ? AND token_hash != ?")
                .run(account.email, req.admin.sessionHash);
            sent.push(account.email);
        } catch (error) {
            console.error(`Could not rotate the admin access code for ${account.email}: ${error.message}`);
            failed.push(account.email);
        }
    }
    updatePresence(req, req.admin.sessionHash, req.admin.email);
    return res.status(failed.length ? 502 : 200).json({ sent, failed, expiresAt });
});

app.post("/api/admin/presence", requireAdmin, (req, res) => {
    updatePresence(req, req.admin.sessionHash, req.admin.email, req.body?.device);
    return res.sendStatus(204);
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
    database.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(req.admin.sessionHash);
    database.prepare("DELETE FROM admin_presence WHERE session_hash = ?").run(req.admin.sessionHash);
    clearSessionCookie(res);
    return res.json({ loggedOut: true });
});

app.get("/api/admin/admins", requireAdmin, requireMasterAdmin, (req, res) => {
    const presenceRows = database.prepare(`
        SELECT email, device, user_agent, ip_address, latitude, longitude, last_seen_at
        FROM admin_presence ORDER BY last_seen_at DESC
    `).all();
    const byEmail = new Map();
    for (const row of presenceRows) {
        if (!byEmail.has(row.email)) byEmail.set(row.email, []);
        byEmail.get(row.email).push({ ...row, online: Date.now() - row.last_seen_at <= ONLINE_WINDOW });
    }
    return res.json({ admins: adminAccounts.map((account) => ({
        ...account,
        devices: byEmail.get(account.email) || [],
        online: (byEmail.get(account.email) || []).some((device) => device.online),
    })) });
});

app.get("/api/admin/conversations", requireAdmin, (req, res) => {
    return res.json({ conversations: getConversationSummaries.all() });
});

app.get("/api/admin/conversations/:conversationId", requireAdmin, (req, res) => {
    const conversation = getConversation.get(req.params.conversationId);
    if (!conversation) return res.status(404).json({ error: "المحادثة غير موجودة." });
    return res.json({ conversation, messages: getConversationMessages.all(conversation.id) });
});

app.delete("/api/admin/conversations", requireAdmin, (req, res) => {
    const removeAllConversations = database.transaction(() => {
        deleteAllMessages.run();
        deleteAllConversations.run();
    });
    removeAllConversations();

    return res.json({ deleted: true });
});

app.delete("/api/admin/conversations/:conversationId", requireAdmin, (req, res) => {
    const conversation = getConversation.get(req.params.conversationId);
    if (!conversation) return res.status(404).json({ error: "المحادثة غير موجودة." });

    const removeConversation = database.transaction(() => {
        deleteConversationMessages.run(conversation.id);
        deleteConversation.run(conversation.id);
    });
    removeConversation();

    return res.json({ deleted: true, conversationId: conversation.public_id });
});

app.get("/api/admin/consultations", requireAdmin, (req, res) => {
    return res.json({ consultations: getConsultations.all() });
});

app.patch("/api/admin/consultations/:consultationId", requireAdmin, (req, res) => {
    const consultationId = Number(req.params.consultationId);
    const { status } = req.body ?? {};
    const allowedStatuses = new Set(["pending", "confirmed", "completed", "cancelled"]);

    if (!Number.isSafeInteger(consultationId) || consultationId < 1) {
        return res.status(400).json({ error: "رقم طلب الاستشارة غير صحيح." });
    }
    if (!allowedStatuses.has(status)) {
        return res.status(400).json({ error: "حالة طلب الاستشارة غير صحيحة." });
    }
    if (!getConsultation.get(consultationId)) {
        return res.status(404).json({ error: "طلب الاستشارة غير موجود." });
    }

    updateConsultationStatus.run(status, consultationId);
    return res.json({ consultation: getConsultation.get(consultationId) });
});

app.delete("/api/admin/consultations/:consultationId", requireAdmin, (req, res) => {
    const consultationId = Number(req.params.consultationId);
    if (!Number.isSafeInteger(consultationId) || consultationId < 1) {
        return res.status(400).json({ error: "رقم طلب الاستشارة غير صحيح." });
    }

    const result = deleteConsultation.run(consultationId);
    if (!result.changes) return res.status(404).json({ error: "طلب الاستشارة غير موجود." });
    return res.json({ deleted: true, consultationId });
});

app.get("/api/admin/consultation-chats", requireAdmin, requireConsultationAdmin, (req, res) => {
    const chats = database.prepare(`
        SELECT chat.id, chat.public_id, chat.visitor_name, chat.visitor_email, chat.request_details,
            chat.preferred_at, chat.scheduled_at, chat.appointment_ends_at, chat.status, chat.created_at, chat.updated_at,
            (SELECT content FROM consultation_chat_messages WHERE chat_id = chat.id ORDER BY id DESC LIMIT 1) AS last_message,
            (SELECT COUNT(*) FROM consultation_chat_messages WHERE chat_id = chat.id) AS message_count
        FROM consultation_chats AS chat ORDER BY chat.updated_at DESC, chat.id DESC
    `).all().map((chat) => ({ ...chat, availability: getConsultationChatState(chat) }));
    return res.json({ chats });
});

app.get("/api/admin/consultation-chats/:chatId", requireAdmin, requireConsultationAdmin, (req, res) => {
    const chat = database.prepare(`
        SELECT id, public_id, visitor_name, visitor_email, request_details, preferred_at,
            scheduled_at, appointment_ends_at, visitor_typing_until, admin_typing_until, status, created_at, updated_at
        FROM consultation_chats WHERE public_id = ?
    `)
        .get(req.params.chatId);
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    const messages = database.prepare("SELECT id, sender_role, sender_name, sender_id, content, created_at, edited_at FROM consultation_chat_messages WHERE chat_id = ? ORDER BY id ASC")
        .all(chat.id)
        .map(({ sender_id: senderId, ...message }) => ({
            ...message,
            canEdit: message.sender_role === "admin" && senderId === req.admin.email,
        }));
    const availability = getConsultationChatState(chat);
    return res.json({
        chat: { ...chat, availability },
        messages,
        typing: { visitor: chat.visitor_typing_until > Date.now(), admin: chat.admin_typing_until > Date.now() },
    });
});

app.post("/api/admin/consultation-chats/:chatId/messages", requireAdmin, requireConsultationAdmin, (req, res) => {
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (!content || content.length > 4000) return res.status(400).json({ error: "اكتب رسالة لا تتجاوز 4000 حرف." });
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ?").get(req.params.chatId);
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    if (getConsultationChatState(chat) !== "open") return res.status(409).json({ error: "الرد متاح خلال موعد المحادثة فقط." });
    const inserted = database.prepare("INSERT INTO consultation_chat_messages (chat_id, sender_role, sender_name, sender_id, content) VALUES (?, 'admin', ?, ?, ?)")
        .run(chat.id, req.admin.name || req.admin.email, req.admin.email, content);
    database.prepare("UPDATE consultation_chats SET admin_typing_until = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(chat.id);
    const message = database.prepare("SELECT id, sender_role, sender_name, content, created_at, edited_at FROM consultation_chat_messages WHERE id = ?")
        .get(inserted.lastInsertRowid);
    return res.status(201).json({ message: { ...message, canEdit: true } });
});

app.patch("/api/admin/consultation-chats/:chatId/messages/:messageId", requireAdmin, requireConsultationAdmin, (req, res) => {
    const messageId = Number(req.params.messageId);
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (!Number.isSafeInteger(messageId) || messageId < 1 || !content || content.length > 4000) {
        return res.status(400).json({ error: "اكتب رسالة صحيحة لا تتجاوز 4000 حرف." });
    }
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ?").get(req.params.chatId);
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    if (getConsultationChatState(chat) !== "open") return res.status(409).json({ error: "التعديل متاح خلال موعد المحادثة فقط." });
    const message = database.prepare("SELECT id FROM consultation_chat_messages WHERE id = ? AND chat_id = ? AND sender_role = 'admin' AND sender_id = ?")
        .get(messageId, chat.id, req.admin.email);
    if (!message) return res.status(404).json({ error: "الرسالة غير موجودة أو لا تملك صلاحية تعديلها." });
    database.prepare("UPDATE consultation_chat_messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(content, messageId);
    const updatedMessage = database.prepare("SELECT id, sender_role, sender_name, content, created_at, edited_at FROM consultation_chat_messages WHERE id = ?")
        .get(messageId);
    return res.json({ message: { ...updatedMessage, canEdit: true } });
});

app.delete("/api/admin/consultation-chats/:chatId/messages/:messageId", requireAdmin, requireConsultationAdmin, (req, res) => {
    const messageId = Number(req.params.messageId);
    if (!Number.isSafeInteger(messageId) || messageId < 1) return res.status(400).json({ error: "رقم الرسالة غير صحيح." });
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ?").get(req.params.chatId);
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    if (getConsultationChatState(chat) !== "open") return res.status(409).json({ error: "الحذف متاح خلال موعد المحادثة فقط." });
    const result = database.prepare("DELETE FROM consultation_chat_messages WHERE id = ? AND chat_id = ? AND sender_role = 'admin' AND sender_id = ?")
        .run(messageId, chat.id, req.admin.email);
    if (!result.changes) return res.status(404).json({ error: "الرسالة غير موجودة أو لا تملك صلاحية حذفها." });
    database.prepare("UPDATE consultation_chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(chat.id);
    return res.json({ deleted: true, messageId });
});

app.patch("/api/admin/consultation-chats/:chatId", requireAdmin, requireConsultationAdmin, (req, res) => {
    const status = req.body?.status;
    if (status !== "closed") return res.status(400).json({ error: "يمكن إغلاق المحادثة فقط من هذا الإجراء." });
    const result = database.prepare("UPDATE consultation_chats SET status = 'closed', visitor_typing_until = 0, admin_typing_until = 0, updated_at = CURRENT_TIMESTAMP WHERE public_id = ?")
        .run(req.params.chatId);
    if (!result.changes) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    const chat = database.prepare("SELECT id FROM consultation_chats WHERE public_id = ?").get(req.params.chatId);
    database.prepare("DELETE FROM consultation_chat_email_links WHERE chat_id = ?").run(chat.id);
    return res.json({ updated: true, status });
});

app.post("/api/admin/consultation-chats/:chatId/schedule", requireAdmin, requireConsultationAdmin, async (req, res) => {
    const scheduledAt = typeof req.body?.scheduledAt === "string" ? req.body.scheduledAt : "";
    const startsAt = Date.parse(scheduledAt);
    if (!Number.isFinite(startsAt) || startsAt <= Date.now() || startsAt > Date.now() + 90 * 24 * 60 * 60 * 1000) {
        return res.status(400).json({ error: "اختر موعدًا قادمًا وصحيحًا." });
    }
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ?").get(req.params.chatId);
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    const currentState = getConsultationChatState(chat);
    if (currentState === "closed") return res.status(409).json({ error: "لا يمكن تحديد موعد لمحادثة مغلقة." });
    if (currentState === "open") return res.status(409).json({ error: "بدأت نافذة المحادثة بالفعل." });

    const endsAt = new Date(startsAt + 20 * 60 * 1000).toISOString();
    const normalizedStart = new Date(startsAt).toISOString();
    database.prepare("UPDATE consultation_chats SET scheduled_at = ?, appointment_ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(normalizedStart, endsAt, chat.id);
    const dateLabel = new Date(startsAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
    let emailSent = false;
    if (chat.visitor_email) {
        const emailAccessToken = randomBytes(32).toString("base64url");
        database.prepare("DELETE FROM consultation_chat_email_links WHERE chat_id = ?").run(chat.id);
        database.prepare("INSERT INTO consultation_chat_email_links (token_hash, chat_id, expires_at) VALUES (?, ?, ?)")
            .run(hashValue(emailAccessToken), chat.id, startsAt + 20 * 60 * 1000);
        try {
            const frontendUrl = req.get("origin") || process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || "http://localhost:5173";
            emailSent = await sendEmail(
                chat.visitor_email,
                "تم تحديد موعد محادثة الاستشارة",
                `أهلًا ${chat.visitor_name},\n\nتم تحديد موعد محادثتك يوم ${dateLabel} بتوقيت القاهرة. افتح الرابط وقت الموعد؛ ستظل المحادثة متاحة لمدة 20 دقيقة.\n\n${frontendUrl}/consultation?chatId=${encodeURIComponent(chat.public_id)}&access=${encodeURIComponent(emailAccessToken)}`,
            );
        } catch (error) {
            console.error(`Could not send the appointment email for ${chat.public_id}: ${error.message}`);
        }
    }
    return res.json({ scheduledAt: normalizedStart, appointmentEndsAt: endsAt, emailSent });
});

app.delete("/api/admin/consultation-chats/:chatId", requireAdmin, requireConsultationAdmin, (req, res) => {
    const removeChat = database.transaction(() => {
        const chat = database.prepare("SELECT id FROM consultation_chats WHERE public_id = ?").get(req.params.chatId);
        if (!chat) return false;
        database.prepare("DELETE FROM consultation_chat_messages WHERE chat_id = ?").run(chat.id);
        database.prepare("DELETE FROM consultation_chats WHERE id = ?").run(chat.id);
        return true;
    });
    if (!removeChat()) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    return res.json({ deleted: true });
});

app.post("/api/admin/consultation-chats/:chatId/typing", requireAdmin, requireConsultationAdmin, (req, res) => {
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ?").get(req.params.chatId);
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    if (getConsultationChatState(chat) !== "open") return res.status(409).json({ error: "المحادثة ليست مفتوحة الآن." });
    const typingUntil = req.body?.typing === true ? Date.now() + 4000 : 0;
    database.prepare("UPDATE consultation_chats SET admin_typing_until = ? WHERE id = ?").run(typingUntil, chat.id);
    return res.sendStatus(204);
});

app.post("/api/consultation-chats", async (req, res) => {
    const attemptKey = req.ip || "unknown";
    const now = Date.now();
    const attempts = consultationRequestAttempts.get(attemptKey) || { count: 0, resetAt: now + 60 * 60 * 1000 };
    if (attempts.resetAt <= now) {
        attempts.count = 0;
        attempts.resetAt = now + 60 * 60 * 1000;
    }
    attempts.count += 1;
    consultationRequestAttempts.set(attemptKey, attempts);
    if (attempts.count > 5) return res.status(429).json({ error: "وصلت للحد الأقصى لطلبات المواعيد. حاول بعد ساعة." });

    const visitorName = typeof req.body?.visitorName === "string" ? req.body.visitorName.trim() : "";
    const visitorEmail = typeof req.body?.visitorEmail === "string" ? req.body.visitorEmail.trim().toLowerCase() : "";
    const requestDetails = typeof req.body?.requestDetails === "string" ? req.body.requestDetails.trim() : "";
    const preferredAt = typeof req.body?.preferredAt === "string" ? req.body.preferredAt : "";
    const preferredTimestamp = Date.parse(preferredAt);
    const introMessages = Array.isArray(req.body?.introMessages) && req.body.introMessages.length === 2
        ? req.body.introMessages.map((message) => typeof message === "string" ? message.trim().slice(0, 500) : "")
        : [];
    if (!visitorName || visitorName.length > 120) return res.status(400).json({ error: "اكتب اسمًا لا يتجاوز 120 حرفًا." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail) || visitorEmail.length > 254) return res.status(400).json({ error: "اكتب بريدًا إلكترونيًا صحيحًا." });
    if (!requestDetails || requestDetails.length > 2000) return res.status(400).json({ error: "اكتب تفاصيل مختصرة لا تتجاوز 2000 حرف." });
    if (!Number.isFinite(preferredTimestamp) || preferredTimestamp <= Date.now()) return res.status(400).json({ error: "اختر وقتًا مفضلًا قادمًا." });
    const publicId = randomUUID();
    const visitorToken = randomBytes(32).toString("base64url");
    const result = database.prepare("INSERT INTO consultation_chats (public_id, visitor_token_hash, visitor_name, visitor_email, request_details, preferred_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(publicId, hashValue(visitorToken), visitorName, visitorEmail, requestDetails, new Date(preferredTimestamp).toISOString());
    const insertIntro = database.prepare("INSERT INTO consultation_chat_messages (chat_id, sender_role, sender_name, content) VALUES (?, 'admin', 'المساعد الذكي', ?)");
    insertIntro.run(result.lastInsertRowid, introMessages[0] || `أهلًا ${visitorName}، أنا المساعد الذكي للمكتب. هساعدك توصل طلبك للإدارة وتحجز وقت مناسب للمحادثة.`);
    insertIntro.run(result.lastInsertRowid, introMessages[1] || "اكتب ملخصًا للمساعدة المطلوبة، وبريدك وموعدك المفضل وصلوا للإدارة. هتظهر المحادثة بعد تأكيد الموعد ولمدة 20 دقيقة.");

    const mainAdmins = adminAccounts.filter((account) => account.role === "main_admin");
    let notifiedAdmins = 0;
    const frontendUrl = req.get("origin") || process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    for (const account of mainAdmins) {
        try {
            if (await sendEmail(
                account.email,
                `طلب محادثة استشارة جديد من ${visitorName}`,
                `طلب محادثة جديد من ${visitorName}\nالبريد: ${visitorEmail}\nالموعد المفضل: ${new Date(preferredTimestamp).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}\n\nالتفاصيل:\n${requestDetails}\n\nرقم المحادثة: ${publicId}\nلوحة المحادثات: ${frontendUrl}/control-center/secure-lawyer-conversations-admin-7f3a9c2e8b1d4a6f/admin-consultation`,
            )) notifiedAdmins += 1;
        } catch (error) {
            console.error(`Could not notify a Main Admin about chat ${publicId}: ${error.message}`);
        }
    }
    return res.status(201).json({ chatId: publicId, visitorToken, notifiedAdmins });
});

app.post("/api/consultation-chats/:chatId/email-access", (req, res) => {
    const accessToken = typeof req.body?.accessToken === "string" ? req.body.accessToken : "";
    const tokenHash = hashValue(accessToken);
    const link = database.prepare("SELECT chat_id, expires_at FROM consultation_chat_email_links WHERE token_hash = ?")
        .get(tokenHash);
    if (!link || link.expires_at <= Date.now()) {
        if (link) database.prepare("DELETE FROM consultation_chat_email_links WHERE token_hash = ?").run(tokenHash);
        return res.status(410).json({ error: "انتهت صلاحية رابط الموعد." });
    }
    const chat = database.prepare("SELECT public_id, visitor_token_hash, status FROM consultation_chats WHERE id = ?")
        .get(link.chat_id);
    if (!chat || chat.status === "closed") return res.status(410).json({ error: "المحادثة مغلقة." });
    database.prepare("DELETE FROM consultation_chat_email_links WHERE token_hash = ?").run(tokenHash);
    const visitorToken = randomBytes(32).toString("base64url");
    database.prepare("UPDATE consultation_chats SET visitor_token_hash = ? WHERE id = ?").run(hashValue(visitorToken), link.chat_id);
    return res.json({ chatId: chat.public_id, visitorToken });
});

app.get("/api/consultation-chats/:chatId/messages", (req, res) => {
    const visitorToken = req.get("x-consultation-token") || "";
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ? AND visitor_token_hash = ?")
        .get(req.params.chatId, hashValue(visitorToken));
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    const messages = database.prepare("SELECT id, sender_role, sender_name, sender_id, content, created_at, edited_at FROM consultation_chat_messages WHERE chat_id = ? ORDER BY id ASC")
        .all(chat.id)
        .map(({ sender_id: senderId, ...message }) => ({
            ...message,
            canEdit: message.sender_role === "visitor" && senderId === "visitor",
        }));
    const availability = getConsultationChatState(chat);
    return res.json({
        chat: {
            public_id: chat.public_id,
            visitor_name: chat.visitor_name,
            visitor_email: chat.visitor_email,
            scheduled_at: chat.scheduled_at,
            appointment_ends_at: chat.appointment_ends_at,
            status: chat.status,
            availability,
        },
        messages,
        typing: { admin: chat.admin_typing_until > Date.now() },
    });
});

app.post("/api/consultation-chats/:chatId/messages", (req, res) => {
    const visitorToken = req.get("x-consultation-token") || "";
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ? AND visitor_token_hash = ?")
        .get(req.params.chatId, hashValue(visitorToken));
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    if (getConsultationChatState(chat) !== "open") return res.status(409).json({ error: "الرسائل متاحة خلال الموعد المحدد فقط." });
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (!content || content.length > 4000) return res.status(400).json({ error: "اكتب رسالة لا تتجاوز 4000 حرف." });
    const inserted = database.prepare("INSERT INTO consultation_chat_messages (chat_id, sender_role, sender_name, sender_id, content) VALUES (?, 'visitor', ?, 'visitor', ?)")
        .run(chat.id, chat.visitor_name, content);
    database.prepare("UPDATE consultation_chats SET visitor_typing_until = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(chat.id);
    const message = database.prepare("SELECT id, sender_role, sender_name, content, created_at, edited_at FROM consultation_chat_messages WHERE id = ?")
        .get(inserted.lastInsertRowid);
    return res.status(201).json({ message: { ...message, canEdit: true } });
});

app.patch("/api/consultation-chats/:chatId/messages/:messageId", (req, res) => {
    const visitorToken = req.get("x-consultation-token") || "";
    const messageId = Number(req.params.messageId);
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (!Number.isSafeInteger(messageId) || messageId < 1 || !content || content.length > 4000) {
        return res.status(400).json({ error: "اكتب رسالة صحيحة لا تتجاوز 4000 حرف." });
    }
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ? AND visitor_token_hash = ?")
        .get(req.params.chatId, hashValue(visitorToken));
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    if (getConsultationChatState(chat) !== "open") return res.status(409).json({ error: "التعديل متاح خلال موعد المحادثة فقط." });
    const message = database.prepare("SELECT id FROM consultation_chat_messages WHERE id = ? AND chat_id = ? AND sender_role = 'visitor' AND sender_id = 'visitor'")
        .get(messageId, chat.id);
    if (!message) return res.status(404).json({ error: "الرسالة غير موجودة أو لا تملك صلاحية تعديلها." });
    database.prepare("UPDATE consultation_chat_messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(content, messageId);
    const updatedMessage = database.prepare("SELECT id, sender_role, sender_name, content, created_at, edited_at FROM consultation_chat_messages WHERE id = ?")
        .get(messageId);
    return res.json({ message: { ...updatedMessage, canEdit: true } });
});

app.delete("/api/consultation-chats/:chatId/messages/:messageId", (req, res) => {
    const visitorToken = req.get("x-consultation-token") || "";
    const messageId = Number(req.params.messageId);
    if (!Number.isSafeInteger(messageId) || messageId < 1) return res.status(400).json({ error: "رقم الرسالة غير صحيح." });
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ? AND visitor_token_hash = ?")
        .get(req.params.chatId, hashValue(visitorToken));
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    if (getConsultationChatState(chat) !== "open") return res.status(409).json({ error: "الحذف متاح خلال موعد المحادثة فقط." });
    const result = database.prepare("DELETE FROM consultation_chat_messages WHERE id = ? AND chat_id = ? AND sender_role = 'visitor' AND sender_id = 'visitor'")
        .run(messageId, chat.id);
    if (!result.changes) return res.status(404).json({ error: "الرسالة غير موجودة أو لا تملك صلاحية حذفها." });
    database.prepare("UPDATE consultation_chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(chat.id);
    return res.json({ deleted: true, messageId });
});

app.post("/api/consultation-chats/:chatId/typing", (req, res) => {
    const visitorToken = req.get("x-consultation-token") || "";
    const chat = database.prepare("SELECT * FROM consultation_chats WHERE public_id = ? AND visitor_token_hash = ?")
        .get(req.params.chatId, hashValue(visitorToken));
    if (!chat) return res.status(404).json({ error: "محادثة الاستشارة غير موجودة." });
    if (getConsultationChatState(chat) !== "open") return res.status(409).json({ error: "المحادثة ليست مفتوحة الآن." });
    const typingUntil = req.body?.typing === true ? Date.now() + 4000 : 0;
    database.prepare("UPDATE consultation_chats SET visitor_typing_until = ? WHERE id = ?").run(typingUntil, chat.id);
    return res.sendStatus(204);
});

async function sendWeeklyAdminCodes() {
    if (!adminAccounts.length) {
        console.warn("No admin accounts configured. Set ADMIN_ACCOUNTS in the backend environment.");
        return;
    }
    if (!mailTransport || !(process.env.SMTP_FROM || process.env.SMTP_USER)) {
        console.warn("Admin login codes are paused until SMTP_HOST and SMTP_FROM are configured.");
        return;
    }

    const now = Date.now();
    for (const account of adminAccounts) {
        const currentCode = database.prepare("SELECT expires_at FROM admin_access_codes WHERE email = ?").get(account.email);
        if (currentCode?.expires_at > now) continue;

        const code = String(randomInt(10000000, 100000000));
        const expiresAt = now + ACCESS_CODE_TTL;
        try {
            await mailTransport.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: account.email,
                subject: "كود دخول لوحة إدارة المنصة",
                text: `مرحبًا ${account.name || ""}\n\nكود دخول لوحة الإدارة: ${code}\n\nالكود صالح لمدة 7 أيام وينتهي في ${new Date(expiresAt).toLocaleString("ar-EG")}. لا تشاركه مع أي شخص.`,
            });
            database.prepare(`
                INSERT INTO admin_access_codes (email, code_hash, expires_at) VALUES (?, ?, ?)
                ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at
            `).run(account.email, hashValue(code), expiresAt);
            console.log(`Admin access code sent to ${account.email}.`);
        } catch (error) {
            console.error(`Could not send an admin access code to ${account.email}: ${error.message}`);
        }
    }
}

void sendWeeklyAdminCodes();
setInterval(() => void sendWeeklyAdminCodes(), 60 * 1000).unref();
setInterval(() => {
    database.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(Date.now());
    for (const [key, attempt] of loginAttempts) {
        if (attempt.resetAt <= Date.now()) loginAttempts.delete(key);
    }
    for (const [key, attempt] of consultationRequestAttempts) {
        if (attempt.resetAt <= Date.now()) consultationRequestAttempts.delete(key);
    }
}, 60 * 60 * 1000).unref();

app.post("/api/consultations", (req, res) => {
    const { name, phone, email = "", consultationType, preferredDate = "", details = "" } = req.body ?? {};
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
        return res.status(400).json({ error: "اكتب اسمًا صحيحًا لا يزيد عن 120 حرفًا." });
    }
    if (typeof phone !== "string" || !/^[\d+()\s-]{7,24}$/.test(phone.trim())) {
        return res.status(400).json({ error: "اكتب رقم هاتف صحيحًا." });
    }
    if (typeof consultationType !== "string" || !consultationType.trim() || consultationType.trim().length > 120) {
        return res.status(400).json({ error: "اختر نوع الاستشارة." });
    }
    if (typeof email !== "string" || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return res.status(400).json({ error: "البريد الإلكتروني غير صحيح." });
    }
    if (typeof preferredDate !== "string" || (preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate))) {
        return res.status(400).json({ error: "تاريخ الموعد غير صحيح." });
    }
    if (typeof details !== "string" || details.length > 2000) {
        return res.status(400).json({ error: "تفاصيل الاستشارة يجب ألا تتجاوز 2000 حرف." });
    }

    const result = createConsultation.run(
        name.trim(),
        phone.trim(),
        email.trim() || null,
        consultationType.trim(),
        preferredDate || null,
        details.trim() || null,
    );
    return res.status(201).json({ consultation: getConsultation.get(result.lastInsertRowid) });
});

app.post("/api/analyze-case", async (req, res) => {
    const { question } = req.body ?? {};

    if (!question || question.trim() === "") {
        return res.status(400).json({ error: "من فضلك اكتب استفسارك أولاً." });
    }

    if (isUnsafeRequest(question)) {
        return res.json({ closed: true, reason: "unsafe_data_request" });
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [
                {
                    role: "system",
                    content:`أنت خبير في تصنيف القوانين المصرية. 
                         وظيفتك الوحيدة هي قراءة استفسار المستخدم والرد بـ (اسم نوع القضية فقط) في سطر واحد وكلمات معدودة (مثال: قضية طلاق، قضية تبديد منقولات، قضية نصب، قضية قضاء إداري). 
                            ممنوع تماماً كتابة أي نصائح، أو تفاصيل، أو نقاط، أو قوائم، أو تفسيرات قانونية. فقط اسم القضية أو نوع الخطأ بحد أقصى 3 أو 4 كلمات.`
                },
                { role: "user", content: question }
            ],
            temperature: 0.3
        });
        if (chatCompletion.choices[0]?.message?.content) {
            return res.json({ result: chatCompletion.choices[0].message.content });
        } else {
            return res.status(500).json({ error: "الذكاء الاصطناعي لم يرجع إجابة واضحة." });
        }

    } catch (error) {
        console.error("Groq API Error Details:", error.message);
        return res.status(500).json({ error: `فشل السيرفر في الاتصال بـ Groq: ${error.message}` });
    }
});

app.post("/api/chat", async (req, res) => {
    const { conversationId, message, visitorName, visitorPhone } = req.body ?? {};

    if (typeof message !== "string" || message.trim() === "") {
        return res.status(400).json({ error: "من فضلك اكتب استفسارك أولاً." });
    }

    const conversation = getOrCreateConversation(conversationId, visitorName, visitorPhone);
    if (conversation.status === "closed") {
        return res.json({ closed: true, conversationId: conversation.public_id });
    }

    const userMessage = message.trim();
    insertMessage.run(conversation.id, "user", userMessage);

    if (isUnsafeRequest(userMessage)) {
        closeConversation.run("unsafe_data_request", conversation.id);
        return res.json({
            closed: true,
            reason: "unsafe_data_request",
            conversationId: conversation.public_id,
        });
    }

    const platformReply = getPlatformReply(userMessage);
    if (platformReply) {
        const creatorQuestion = /صانع|منشئ|باني|بنى|creator|who\s+(made|built)|made\s+this|built\s+this/i.test(normalizeText(userMessage));
        const result = creatorQuestion ? `${platformReply} ${process.env.CREATORE || ""}`.trim() : platformReply;
        insertMessage.run(conversation.id, "assistant", result);
        touchConversation.run(conversation.id);
        return res.json({
            result,
            creatorUrl: creatorQuestion ? process.env.CREATORE : null,
            conversationId: conversation.public_id,
        });
    }

    if (isLawyerCatalogQuestion(userMessage)) {
        const result = getLawyerCatalogReply();
        insertMessage.run(conversation.id, "assistant", result);
        touchConversation.run(conversation.id);
        return res.json({ result, conversationId: conversation.public_id });
    }

    if (!isPlatformQuestion(userMessage)) {
        incrementViolation.run(conversation.id);
        const violationCount = conversation.violation_count + 1;

        if (violationCount >= 3) {
            closeConversation.run("repeated_out_of_context", conversation.id);
            return res.json({
                closed: true,
                reason: "repeated_out_of_context",
                conversationId: conversation.public_id,
            });
        }

        const warning = violationCount === 1
            ? "أنا أقدر أساعدك فقط في خدمات واستشارات المنصة القانونية."
            : "لو الكلام خرج عن موضوع المنصة مرة تانية، هوقف المحادثة نهائياً.";
        insertMessage.run(conversation.id, "assistant", warning);
        return res.json({
            result: warning,
            warning: true,
            violationCount,
            conversationId: conversation.public_id,
        });
    }

    if (isLawyerRequest(userMessage)) {
        const platformLawyer = lawyers[0] || null;
        const result = "محامي المنصة هو المحامي الظاهر أمامك.";
        insertMessage.run(conversation.id, "assistant", result);
        touchConversation.run(conversation.id);
        return res.json({
            result,
            caseType: "محامي المنصة",
            nearestLawyer: platformLawyer,
            conversationId: conversation.public_id,
        });
    }

    const route = findRoute(userMessage);
    if (route) {
        const routeMessage = route.type === "lawyers"
            ? "هحوّلك لصفحة المحامين الآن."
            : `هحوّلك لخدمة ${route.service.Name} الآن.`;
        insertMessage.run(conversation.id, "assistant", routeMessage);
        touchConversation.run(conversation.id);
        return res.json({
            result: routeMessage,
            route: route.route,
            conversationId: conversation.public_id,
        });
    }

    const nearestLawyer = findNearestLawyer(userMessage);
    if (nearestLawyer) {
        const result = "أفضل محامي من محامين المنصة للحالة دي هو المحامي الظاهر أمامك.";
        insertMessage.run(conversation.id, "assistant", result);
        touchConversation.run(conversation.id);
        return res.json({
            result,
            caseType: userMessage,
            nearestLawyer,
            conversationId: conversation.public_id,
        });
    }

    const history = getMessages.all(conversation.id).reverse();
    const catalogContext = [
        `اختصاصات المحامين المسجلة: ${[...new Set(lawyers.map((lawyer) => lawyer.specialization).filter(Boolean))].join("، ") || "لا يوجد"}`,
        `أسماء الخدمات المسجلة: ${services.map((service) => service.Name).filter(Boolean).join("، ") || "لا توجد"}`,
        "لا تذكر اختصاصًا أو خدمة غير موجودة في هذه البيانات.",
    ].join("\n");

    try {
        const chatCompletion = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [
                {
                    role: "system",
                    content: `أنت مساعد قانوني مصري ودود. أجب بالعربية بوضوح واختصار، وقدم معلومات عامة فقط دون اعتبار ردك استشارة قانونية نهائية. إذا احتاج المستخدم تفاصيل أو تمثيلاً قانونياً، وجهه لحجز موعد مع محامٍ.\n${catalogContext}`,
                },
                ...history,
            ],
            temperature: 0.4,
        });
        const result = chatCompletion.choices[0]?.message?.content;

        if (!result) return res.status(500).json({ error: "الذكاء الاصطناعي لم يرجع إجابة واضحة." });
        insertMessage.run(conversation.id, "assistant", result);
        touchConversation.run(conversation.id);
        return res.json({ result, conversationId: conversation.public_id });
    } catch (error) {
        console.error("Groq Chat Error Details:", error.message);
        return res.status(500).json({ error: "تعذر الاتصال بخدمة المحادثة حالياً." });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
