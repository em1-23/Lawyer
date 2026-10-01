import { useEffect, useRef, useState } from "react"
import ConsultationAutomaticMessages from "./ConsultationAutomaticMessages"
import ConsultationAttachmentImage from "./ConsultationAttachmentImage"

const API_URL = import.meta.env.VITE_API_URL || "https://lawyer-production-be12.up.railway.app"
const CHAT_STORAGE_KEY = "lawyer-consultation-chat"

function toLocalDateTime(date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function readSavedChat() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAT_STORAGE_KEY) || "null")
  } catch {
    return null
  }
}

function ConsultationChat() {
  const [savedChat, setSavedChat] = useState(readSavedChat)
  const [visitorName, setVisitorName] = useState("")
  const [visitorEmail, setVisitorEmail] = useState("")
  const [requestDetails, setRequestDetails] = useState("")
  const [preferredAt, setPreferredAt] = useState("")
  const [messageText, setMessageText] = useState("")
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingMessageText, setEditingMessageText] = useState("")
  const [messages, setMessages] = useState([])
  const [availability, setAvailability] = useState("awaiting_appointment")
  const [scheduledAt, setScheduledAt] = useState(null)
  const [appointmentEndsAt, setAppointmentEndsAt] = useState(null)
  const [adminIsTyping, setAdminIsTyping] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const typingTimer = useRef(null)
  const imageInputRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const chatId = params.get("chatId")
    const accessToken = params.get("access")
    if (!chatId || !accessToken) return undefined
    let active = true
    fetch(`${API_URL}/api/consultation-chats/${encodeURIComponent(chatId)}/email-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "رابط الموعد غير صالح.")
      if (!active) return
      const nextChat = { chatId: data.chatId, visitorToken: data.visitorToken }
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(nextChat))
      setSavedChat(nextChat)
      setNotice("تم فتح رابط موعدك. المحادثة متاحة خلال وقت الموعد فقط.")
    }).catch((requestError) => {
      if (active) setError(requestError.message)
    }).finally(() => {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`)
    })
    return () => { active = false }
  }, [])

  function returnToIdentityForm(message) {
    sessionStorage.removeItem(CHAT_STORAGE_KEY)
    setSavedChat(null)
    setVisitorName("")
    setMessages([])
    setAvailability("awaiting_appointment")
    setScheduledAt(null)
    setAppointmentEndsAt(null)
    setNotice(message)
  }

  useEffect(() => {
    if (!savedChat?.chatId || !savedChat?.visitorToken) return undefined
    let active = true
    const loadMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/api/consultation-chats/${encodeURIComponent(savedChat.chatId)}/messages`, {
          headers: { "x-consultation-token": savedChat.visitorToken },
        })
        const data = await response.json()
        if (response.status === 404) {
          if (active) returnToIdentityForm("انتهت المحادثة السابقة. اكتب اسمك من جديد لبدء طلب آخر.")
          return
        }
        if (!response.ok) throw new Error(data.error || "تعذر تحميل المحادثة.")
        if (active) {
          setMessages(data.messages)
          setAvailability(data.chat.availability)
          setScheduledAt(data.chat.scheduled_at)
          setAppointmentEndsAt(data.chat.appointment_ends_at)
          setAdminIsTyping(data.typing.admin)
          if (data.chat.availability === "closed") {
            returnToIdentityForm("انتهى وقت المحادثة. اكتب اسمك من جديد لطلب موعد آخر.")
          }
          setError("")
        }
      } catch (requestError) {
        if (active) setError(requestError.message)
      }
    }
    loadMessages()
    const timer = window.setInterval(loadMessages, 1500)
    return () => {
      active = false
      window.clearInterval(timer)
      window.clearTimeout(typingTimer.current)
    }
  }, [savedChat])

  async function startChat(event) {
    event.preventDefault()
    if (!visitorName.trim() || !visitorEmail.trim() || !requestDetails.trim() || !preferredAt || isStarting) return
    setIsStarting(true)
    setError("")
    try {
      const response = await fetch(`${API_URL}/api/consultation-chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: visitorName.trim(),
          visitorEmail: visitorEmail.trim(),
          requestDetails: requestDetails.trim(),
          preferredAt: new Date(preferredAt).toISOString(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر بدء المحادثة.")
      const nextChat = { chatId: data.chatId, visitorToken: data.visitorToken }
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(nextChat))
      setNotice(data.notifiedAdmins ? "تم إرسال طلبك إلى الإدارة. هنرسل لك الموعد على بريدك الإلكتروني." : "تم استلام طلبك، لكن تعذر إرسال تنبيه البريد للإدارة.")
      setSavedChat(nextChat)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsStarting(false)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    const content = messageText.trim()
    if (!content || !savedChat || isSending || availability !== "open") return
    setIsSending(true)
    setError("")
    try {
      const response = await fetch(`${API_URL}/api/consultation-chats/${encodeURIComponent(savedChat.chatId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-consultation-token": savedChat.visitorToken },
        body: JSON.stringify({ content }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر إرسال الرسالة.")
      setMessages((current) => [...current, data.message])
      setMessageText("")
      fetch(`${API_URL}/api/consultation-chats/${encodeURIComponent(savedChat.chatId)}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-consultation-token": savedChat.visitorToken },
        body: JSON.stringify({ typing: false }),
      }).catch(() => {})
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  async function sendImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !savedChat || isUploadingImage || availability !== "open") return
    setIsUploadingImage(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("caption", messageText.trim())
      const response = await fetch(`${API_URL}/api/consultation-chats/${encodeURIComponent(savedChat.chatId)}/attachments`, {
        method: "POST",
        headers: { "x-consultation-token": savedChat.visitorToken },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر إرسال الصورة.")
      setMessages((current) => [...current, data.message])
      setMessageText("")
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setIsUploadingImage(false)
    }
  }

  function beginEditMessage(message) {
    setEditingMessageId(message.id)
    setEditingMessageText(message.content)
  }

  async function saveMessageEdit(messageId) {
    const content = editingMessageText.trim()
    if (!content || !savedChat) return
    try {
      const response = await fetch(`${API_URL}/api/consultation-chats/${encodeURIComponent(savedChat.chatId)}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-consultation-token": savedChat.visitorToken },
        body: JSON.stringify({ content }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر تعديل الرسالة.")
      setMessages((current) => current.map((message) => message.id === messageId ? data.message : message))
      setEditingMessageId(null)
      setEditingMessageText("")
    } catch (editError) {
      setError(editError.message)
    }
  }

  async function deleteOwnMessage(messageId) {
    if (!savedChat || !window.confirm("حذف رسالتك؟")) return
    try {
      const response = await fetch(`${API_URL}/api/consultation-chats/${encodeURIComponent(savedChat.chatId)}/messages/${messageId}`, {
        method: "DELETE",
        headers: { "x-consultation-token": savedChat.visitorToken },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر حذف الرسالة.")
      setMessages((current) => current.filter((message) => message.id !== messageId))
      if (editingMessageId === messageId) setEditingMessageId(null)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  function handleMessageChange(value) {
    setMessageText(value)
    if (!savedChat || availability !== "open") return
    fetch(`${API_URL}/api/consultation-chats/${encodeURIComponent(savedChat.chatId)}/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-consultation-token": savedChat.visitorToken },
      body: JSON.stringify({ typing: Boolean(value.trim()) }),
    }).catch(() => {})
    window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => {
      fetch(`${API_URL}/api/consultation-chats/${encodeURIComponent(savedChat.chatId)}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-consultation-token": savedChat.visitorToken },
        body: JSON.stringify({ typing: false }),
      }).catch(() => {})
    }, 2500)
  }

  return (
    <section className="ConsultationChat" dir="rtl">
      <header className="ConsultationChatHeader">
        <div>
          <span>تواصل مباشر</span>
          <h2>محادثة مع إدارة المنصة</h2>
        </div>
        {savedChat && <span className={`ConsultationChatStatus ${availability}`}>{availability === "open" ? "مفتوحة الآن" : availability === "scheduled" ? "لها موعد" : availability === "closed" ? "مغلقة" : "بانتظار الموعد"}</span>}
      </header>
      {savedChat ? (
        <>
          <div className="ConsultationChatMeta">رقم المحادثة: <code>{savedChat.chatId}</code></div>
          {notice && <p className="ConsultationChatNotice" role="status">{notice}</p>}
          {availability !== "open" && availability !== "closed" && <p className="ConsultationChatNotice">
            {availability === "scheduled" && scheduledAt ? `موعدك ${new Date(scheduledAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}` : "المحادثة هتفتح بعد ما الإدارة تؤكد الموعد المرسل لبريدك."}
            {availability === "scheduled" && appointmentEndsAt && ` وتنتهي ${new Date(appointmentEndsAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}.`}
          </p>}
          {availability !== "closed" && <div className="ConsultationStartedAutomaticStage"><ConsultationAutomaticMessages /></div>}
          <div className="ConsultationChatMessages" aria-live="polite">
            {messages.filter((message) => message.sender_name !== "المساعد الذكي").map((message) => (
              <article className={`ConsultationChatMessage ${message.sender_role}`} key={message.id}>
                <div><strong>{message.sender_role === "visitor" ? "أنت" : message.sender_name}</strong><time>{new Date(`${message.created_at}Z`).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</time></div>
                {editingMessageId === message.id ? (
                  <div className="ConsultationMessageEditor">
                    <textarea value={editingMessageText} onChange={(event) => setEditingMessageText(event.target.value)} maxLength={4000} autoFocus />
                    <button type="button" onClick={() => saveMessageEdit(message.id)} disabled={!editingMessageText.trim()}>حفظ التعديل</button>
                    <button type="button" onClick={() => setEditingMessageId(null)}>إلغاء</button>
                  </div>
                ) : (
                  <>
                    <p>{message.content}{message.edited_at && <small className="ConsultationEditedLabel"> (تم التعديل)</small>}</p>
                    {message.attachmentId && <ConsultationAttachmentImage apiUrl={API_URL} chatId={savedChat.chatId} attachmentId={message.attachmentId} accessToken={savedChat.visitorToken} alt={message.attachmentName} />}
                    {message.canEdit && <div className="ConsultationMessageActions">
                      <button type="button" onClick={() => beginEditMessage(message)}>تعديل</button>
                      <button type="button" onClick={() => deleteOwnMessage(message.id)}>حذف</button>
                    </div>}
                  </>
                )}
              </article>
            ))}
            {adminIsTyping && <div className="ConsultationTyping" aria-label="الإدارة تكتب"><i /><i /><i /></div>}
            {!messages.length && <p className="ConsultationChatEmpty">ابدأ بكتابة رسالتك.</p>}
          </div>
          {error && <p className="AdminError" role="alert">{error}</p>}
          {availability === "open" ? (
            <form className="ConsultationChatComposer" onSubmit={sendMessage}>
              <input ref={imageInputRef} className="ConsultationImageInput" type="file" accept="image/jpeg,image/png,image/webp" onChange={sendImage} />
              <button type="button" className="ConsultationAttachButton" onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage}>{isUploadingImage ? "جارٍ رفع الصورة..." : "إضافة صورة"}</button>
              <textarea value={messageText} onChange={(event) => handleMessageChange(event.target.value)} placeholder="اكتب رسالتك..." rows={2} maxLength={4000} aria-label="رسالتك" />
              <button type="submit" disabled={isSending || !messageText.trim()}>{isSending ? "جارٍ الإرسال..." : "إرسال"}</button>
            </form>
          ) : availability === "closed" ? <button className="ConsultationNewChat" type="button" onClick={() => returnToIdentityForm("اكتب اسمك من جديد لبدء طلب محادثة آخر.")}>طلب موعد جديد</button> : null}
        </>
      ) : (
        <form className="ConsultationChatStart" onSubmit={startChat}>
          <div className="ConsultationInitialAutomaticStage"><ConsultationAutomaticMessages /></div>
          <p>املأ البيانات ليراجع الادمن طلبك ويحدد موعدًا مناسبًا.</p>
          <label htmlFor="consultation-visitor-name">الاسم</label>
          <input id="consultation-visitor-name" value={visitorName} onChange={(event) => setVisitorName(event.target.value)} maxLength={120} required />
          <label htmlFor="consultation-visitor-email">البريد الإلكتروني لاستلام الموعد</label>
          <input id="consultation-visitor-email" type="email" value={visitorEmail} onChange={(event) => setVisitorEmail(event.target.value)} maxLength={254} required />
          <label htmlFor="consultation-request-details">ما الذي تحتاج المساعدة فيه؟</label>
          <textarea id="consultation-request-details" value={requestDetails} onChange={(event) => setRequestDetails(event.target.value)} maxLength={2000} rows={3} required />
          <label htmlFor="consultation-preferred-time">الوقت المفضل للمحادثة</label>
          <input id="consultation-preferred-time" type="datetime-local" min={toLocalDateTime(new Date(Date.now() + 60_000))} value={preferredAt} onChange={(event) => setPreferredAt(event.target.value)} required />
          {notice && <p className="ConsultationChatNotice" role="status">{notice}</p>}
          {error && <p className="AdminError" role="alert">{error}</p>}
          <button type="submit" disabled={isStarting || !visitorName.trim() || !visitorEmail.trim() || !requestDetails.trim() || !preferredAt}>{isStarting ? "جارٍ إرسال الطلب..." : "إرسال طلب الموعد"}</button>
        </form>
      )}
    </section>
  )
}

export default ConsultationChat