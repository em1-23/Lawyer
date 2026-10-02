import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"

const API_URL = (import.meta.env.VITE_API_URL || "https://lawyer-production-be12.up.railway.app").replace(/\/+$/, "")

function getDeviceLabel() {
  const agent = navigator.userAgent
  const platform = navigator.userAgentData?.platform || navigator.platform || "جهاز غير معروف"
  const browser = /Edg\//.test(agent) ? "Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : "متصفح غير معروف"
  return `${platform} - ${browser}`
}

function AdminDashboard() {
  const [admin, setAdmin] = useState(null)
  const [codeExpiresAt, setCodeExpiresAt] = useState(null)
  const [isChecking, setIsChecking] = useState(true)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSharingLocation, setIsSharingLocation] = useState(false)
  const [isRotatingCodes, setIsRotatingCodes] = useState(false)
  const [rotationNotice, setRotationNotice] = useState("")
  const [admins, setAdmins] = useState([])

  useEffect(() => {
    let active = true
    fetch(`${API_URL}/api/admin/session`, { credentials: "include" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !data) return
        setAdmin(data.admin)
        setCodeExpiresAt(data.codeExpiresAt)
      })
      .catch(() => {})
      .finally(() => active && setIsChecking(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!admin) return undefined
    const device = { device: getDeviceLabel(), userAgent: navigator.userAgent }
    const heartbeat = () => fetch(`${API_URL}/api/admin/presence`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device }),
    }).catch(() => {})
    heartbeat()
    const timer = window.setInterval(heartbeat, 30_000)
    document.addEventListener("visibilitychange", heartbeat)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", heartbeat)
    }
  }, [admin])

  useEffect(() => {
    if (admin?.role !== "master_admin") return undefined
    let active = true
    const loadAdmins = () => fetch(`${API_URL}/api/admin/admins`, { credentials: "include" })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "تعذر تحميل حالة الأدمنز.")
        return data
      })
      .then((data) => active && setAdmins(data.admins))
      .catch(() => {})
    loadAdmins()
    const timer = window.setInterval(loadAdmins, 30_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [admin])

  async function handleLogin(event) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, device: { device: getDeviceLabel(), userAgent: navigator.userAgent } }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر تسجيل الدخول.")
      const sessionResponse = await fetch(`${API_URL}/api/admin/session`, { credentials: "include" })
      const sessionData = sessionResponse.ok ? await sessionResponse.json() : null
      if (!sessionData) throw new Error("تم قبول بيانات الدخول لكن تعذر حفظ الجلسة. تحقق من إعدادات الكوكيز.")
      setAdmin(sessionData.admin)
      setCodeExpiresAt(sessionData.codeExpiresAt)
      setCode("")
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function shareLocation() {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم مشاركة الموقع.")
      return
    }
    setIsSharingLocation(true)
    setError("")
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`${API_URL}/api/admin/presence`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device: { device: getDeviceLabel(), userAgent: navigator.userAgent, latitude: coords.latitude, longitude: coords.longitude } }),
        })
        if (!response.ok) throw new Error("تعذر تحديث الموقع.")
      } catch (locationError) {
        setError(locationError.message)
      } finally {
        setIsSharingLocation(false)
      }
    }, () => {
      setError("لم تتم مشاركة الموقع. يمكنك السماح به من إعدادات المتصفح.")
      setIsSharingLocation(false)
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 })
  }

  async function handleLogout() {
    await fetch(`${API_URL}/api/admin/logout`, { method: "POST", credentials: "include" }).catch(() => {})
    setAdmin(null)
    setAdmins([])
  }

  async function rotateAccessCodes() {
    setIsRotatingCodes(true)
    setRotationNotice("")
    setError("")
    try {
      const response = await fetch(`${API_URL}/api/admin/access-codes/rotate`, {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok && !data.sent?.length && !data.failed?.length) throw new Error(data.error || "تعذر تجديد الأكواد.")
      setRotationNotice(data.failed?.length
        ? `قبل خادم البريد ${data.sent.length} رسالة، وتعذر قبول الإرسال إلى: ${data.failed.join("، ")}`
        : `قبل خادم البريد رسائل الأكواد إلى ${data.sent.length} أدمن.`)
      setCodeExpiresAt(data.expiresAt)
    } catch (rotationError) {
      setError(rotationError.message)
    } finally {
      setIsRotatingCodes(false)
    }
  }

  if (isChecking) return <main className="AdminGate"><p>جارٍ التحقق من الجلسة...</p></main>

  if (!admin) return (
    <main className="AdminGate" dir="rtl">
      <form className="AdminLogin" onSubmit={handleLogin}>
        <p className="AdminEyebrow">منطقة محمية</p>
        <h1>دخول لوحة الإدارة</h1>
        <label htmlFor="admin-email">البريد الإلكتروني</label>
        <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label htmlFor="admin-code">كود الدخول المرسل إلى بريدك</label>
        <input id="admin-code" type="text" inputMode="text" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="one-time-code" pattern="[A-Za-z0-9]{3,128}" maxLength={128} value={code} onChange={(event) => setCode(event.target.value)} required />
        {error && <p className="AdminError" role="alert">{error}</p>}
        <button className="AdminLoadButton" type="submit" disabled={isSubmitting}>{isSubmitting ? "جارٍ التحقق..." : "دخول آمن"}</button>
      </form>
    </main>
  )

  return (
    <div className="Section Dashboard" dir="rtl">
      <header className="AdminSessionBar">
        <div>
          <strong>{admin.name || admin.email}</strong>
          <span>{admin.role === "master_admin" ? "Master Admin" : admin.role === "main_admin" ? "Main Admin" : "Admin"}</span>
          {codeExpiresAt && <small>انتهاء الكود: {new Date(codeExpiresAt).toLocaleDateString("ar-EG")}</small>}
        </div>
        <div className="AdminSessionActions">
          {admin.role === "master_admin" && <button type="button" onClick={rotateAccessCodes} disabled={isRotatingCodes}>{isRotatingCodes ? "جارٍ تجديد الأكواد..." : "تجديد أكواد دخول الأدمنز"}</button>}
          <button type="button" onClick={shareLocation} disabled={isSharingLocation}>{isSharingLocation ? "جارٍ تحديد الموقع..." : "مشاركة موقعي"}</button>
          <button type="button" onClick={handleLogout}>تسجيل الخروج</button>
        </div>
      </header>
      {error && <p className="AdminError" role="alert">{error}</p>}
      {rotationNotice && <p className="AdminRotationNotice" role="status">{rotationNotice}</p>}
      {admin.role === "master_admin" && (
        <section className="AdminPresence" aria-label="حالة الأدمنز">
          <h2>حالة الأدمنز</h2>
          <div className="AdminPresenceList">
            {admins.map((entry) => (
              <article className="AdminPresenceItem" key={entry.email}>
                <div className="AdminPresenceHeading">
                  <strong>{entry.name || entry.email}</strong>
                  <span className={entry.online ? "is-online" : "is-offline"}>{entry.online ? "متصل الآن" : "غير متصل"}</span>
                </div>
                <small>{entry.email} · {entry.role}</small>
                {entry.devices.map((device) => (
                  <p key={device.last_seen_at}>
                    {device.device || "جهاز غير معروف"} · {device.ip_address || "IP غير متاح"}
                    {device.latitude !== null && device.longitude !== null ? ` · ${device.latitude.toFixed(3)}, ${device.longitude.toFixed(3)}` : " · لم يشارك الموقع"}
                    {` · آخر نشاط ${new Date(device.last_seen_at).toLocaleString("ar-EG")}`}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>
      )}
      <Outlet context={{ admin }} />
    </div>
  )
}

export default AdminDashboard