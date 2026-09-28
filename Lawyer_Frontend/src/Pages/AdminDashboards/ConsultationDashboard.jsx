import { useEffect, useState } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

function toLocalDateTime(date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function ConsultationDashboard() {
  const [chats, setChats] = useState([])
  const [selectedChatId, setSelectedChatId] = useState("")
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageText, setMessageText] = useState("")
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingMessageText, setEditingMessageText] = useState("")
  const [scheduleAt, setScheduleAt] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [visitorIsTyping, setVisitorIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const loadChats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/consultation-chats`, { credentials: "include" })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "تعذر تحميل المحادثات.")
        if (active) {
          setChats(data.chats)
          setError("")
        }
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadChats()
    const timer = window.setInterval(loadChats, 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!selectedChatId) {
      setSelectedChat(null)
      return undefined
    }
    let active = true
    let firstLoad = true
    const loadChat = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/consultation-chats/${encodeURIComponent(selectedChatId)}`, { credentials: "include" })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "تعذر تحميل الرسائل.")
        if (active) {
          setSelectedChat(data)
          setVisitorIsTyping(data.typing.visitor)
          if (firstLoad) setScheduleAt(data.chat.scheduled_at ? toLocalDateTime(new Date(data.chat.scheduled_at)) : data.chat.preferred_at ? toLocalDateTime(new Date(data.chat.preferred_at)) : "")
          firstLoad = false
        }
      } catch (requestError) {
        if (active) setError(requestError.message)
      }
    }
    loadChat()
    const timer = window.setInterval(loadChat, 3000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [selectedChatId])

  async function sendReply(event) {
    event.preventDefault()
    const content = messageText.trim()
    if (!content || !selectedChatId || isSending) return
    setIsSending(true)
    setError("")
    try {
      const response = await fetch(`${API_URL}/api/admin/consultation-chats/${encodeURIComponent(selectedChatId)}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر إرسال الرد.")
      setSelectedChat((current) => current ? { ...current, messages: [...current.messages, data.message] } : current)
      setMessageText("")
      fetch(`${API_URL}/api/admin/consultation-chats/${encodeURIComponent(selectedChatId)}/typing`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: false }),
      }).catch(() => {})
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  function beginEditMessage(message) {
    setEditingMessageId(message.id)
    setEditingMessageText(message.content)
  }

  async function saveMessageEdit(messageId) {
    const content = editingMessageText.trim()
    if (!content || !selectedChatId) return
    try {
      const response = await fetch(`${API_URL}/api/admin/consultation-chats/${encodeURIComponent(selectedChatId)}/messages/${messageId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر تعديل الرسالة.")
      setSelectedChat((current) => current ? {
        ...current,
        messages: current.messages.map((message) => message.id === messageId ? data.message : message),
      } : current)
      setEditingMessageId(null)
      setEditingMessageText("")
    } catch (editError) {
      setError(editError.message)
    }
  }

  async function deleteOwnMessage(messageId) {
    if (!selectedChatId || !window.confirm("حذف رسالتك؟")) return
    try {
      const response = await fetch(`${API_URL}/api/admin/consultation-chats/${encodeURIComponent(selectedChatId)}/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر حذف الرسالة.")
      setSelectedChat((current) => current ? {
        ...current,
        messages: current.messages.filter((message) => message.id !== messageId),
      } : current)
      if (editingMessageId === messageId) setEditingMessageId(null)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function toggleChatStatus() {
    if (!selectedChat) return
    const status = "closed"
    try {
      const response = await fetch(`${API_URL}/api/admin/consultation-chats/${encodeURIComponent(selectedChatId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر تحديث المحادثة.")
      setSelectedChat((current) => current ? { ...current, chat: { ...current.chat, status: data.status, availability: "closed" } } : current)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function scheduleAppointment(event) {
    event.preventDefault()
    if (!selectedChatId || !scheduleAt || isScheduling) return
    setIsScheduling(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch(`${API_URL}/api/admin/consultation-chats/${encodeURIComponent(selectedChatId)}/schedule`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: new Date(scheduleAt).toISOString() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر تحديد الموعد.")
      setSelectedChat((current) => current ? { ...current, chat: { ...current.chat, scheduled_at: data.scheduledAt, appointment_ends_at: data.appointmentEndsAt, availability: "scheduled" } } : current)
      setNotice(data.emailSent ? "تم تحديد الموعد وإرسال رسالة التأكيد للزائر." : "تم تحديد الموعد، لكن تعذر إرسال بريد التأكيد للزائر.")
    } catch (scheduleError) {
      setError(scheduleError.message)
    } finally {
      setIsScheduling(false)
    }
  }

  async function deleteChat() {
    if (!selectedChatId || !window.confirm("حذف المحادثة ورسائلها نهائيًا؟ سيُطلب من الزائر بدء طلب جديد.")) return
    try {
      const response = await fetch(`${API_URL}/api/admin/consultation-chats/${encodeURIComponent(selectedChatId)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "تعذر حذف المحادثة.")
      setChats((current) => current.filter((chat) => chat.public_id !== selectedChatId))
      setSelectedChatId("")
      setSelectedChat(null)
      setNotice("تم حذف المحادثة. سيُطلب من الزائر إدخال اسمه لبدء طلب جديد.")
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  function handleAdminMessageChange(value) {
    setMessageText(value)
    if (!selectedChatId || selectedChat?.chat.availability !== "open") return
    fetch(`${API_URL}/api/admin/consultation-chats/${encodeURIComponent(selectedChatId)}/typing`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typing: Boolean(value.trim()) }),
    }).catch(() => {})
  }

  return (
    <main className="AdminConsultationPage">
      <header className="AdminConsultationHeader">
        <div><p>صندوق الوارد</p><h1>محادثات الاستشارات</h1></div>
        <span>{chats.length} محادثة</span>
      </header>
      {error && <p className="AdminError" role="alert">{error}</p>}
      {notice && <p className="AdminRotationNotice" role="status">{notice}</p>}
      <div className="AdminConsultationInbox">
        <aside className="AdminConsultationList" aria-label="قائمة المحادثات">
          {isLoading && <p className="AdminConsultationEmpty">جارٍ تحميل المحادثات...</p>}
          {!isLoading && chats.length === 0 && <p className="AdminConsultationEmpty">لا توجد محادثات حتى الآن.</p>}
          {chats.map((chat) => (
            <button className={`AdminConsultationItem${chat.public_id === selectedChatId ? " selected" : ""}`} key={chat.public_id} type="button" onClick={() => setSelectedChatId(chat.public_id)}>
              <span className="AdminConsultationItemTop"><strong>{chat.visitor_name}</strong><small>{chat.availability === "open" ? "مفتوحة الآن" : chat.availability === "scheduled" ? "بموعد" : chat.availability === "closed" ? "مغلقة" : "بانتظار موعد"}</small></span>
              <code>{chat.public_id}</code>
              <span>{chat.last_message || "لا توجد رسائل"}</span>
              <time>{new Date(`${chat.updated_at}Z`).toLocaleString("ar-EG")}</time>
            </button>
          ))}
        </aside>
        <section className="AdminConsultationThread" aria-label="تفاصيل المحادثة">
          {!selectedChat ? <div className="AdminConsultationEmpty">اختر محادثة لعرض الرسائل.</div> : (
            <>
              <header className="AdminConsultationThreadHeader">
                <div><h2>{selectedChat.chat.visitor_name}</h2><a href={`mailto:${selectedChat.chat.visitor_email}`}>{selectedChat.chat.visitor_email}</a><code>{selectedChat.chat.public_id}</code></div>
                <div className="AdminConsultationActions">
                  {selectedChat.chat.status === "open" && <button type="button" onClick={toggleChatStatus}>إنهاء وطلب الاسم من جديد</button>}
                  <button type="button" className="danger" onClick={deleteChat}>حذف المحادثة</button>
                </div>
              </header>
              <section className="AdminConsultationRequest">
                <p><strong>طلب الزائر:</strong> {selectedChat.chat.request_details}</p>
                <p><strong>الوقت المفضل:</strong> {selectedChat.chat.preferred_at ? new Date(selectedChat.chat.preferred_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" }) : "غير محدد"}</p>
                {selectedChat.chat.availability === "open" && <p><strong>موعد المحادثة:</strong> تنتهي {new Date(selectedChat.chat.appointment_ends_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" })}</p>}
                {selectedChat.chat.availability !== "open" && selectedChat.chat.status === "open" && <form className="AdminScheduleForm" onSubmit={scheduleAppointment}>
                  <label htmlFor="consultation-schedule">تحديد موعد (المحادثة تفتح 20 دقيقة)</label>
                  <input id="consultation-schedule" type="datetime-local" min={toLocalDateTime(new Date(Date.now() + 60_000))} value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} required />
                  <button type="submit" disabled={isScheduling || !scheduleAt}>{isScheduling ? "جارٍ الإرسال..." : "تأكيد الموعد وإرسال البريد"}</button>
                </form>}
              </section>
              <div className="AdminConsultationMessages" aria-live="polite">
                {selectedChat.messages.map((message) => (
                  <article className={`AdminConsultationMessage ${message.sender_role}`} key={message.id}>
                    <div><strong>{message.sender_name}</strong><time>{new Date(`${message.created_at}Z`).toLocaleString("ar-EG")}</time></div>
                    {editingMessageId === message.id ? (
                      <div className="ConsultationMessageEditor">
                        <textarea value={editingMessageText} onChange={(event) => setEditingMessageText(event.target.value)} maxLength={4000} autoFocus />
                        <button type="button" onClick={() => saveMessageEdit(message.id)} disabled={!editingMessageText.trim()}>حفظ التعديل</button>
                        <button type="button" onClick={() => setEditingMessageId(null)}>إلغاء</button>
                      </div>
                    ) : (
                      <>
                        <p>{message.content}{message.edited_at && <small className="ConsultationEditedLabel"> (تم التعديل)</small>}</p>
                        {message.canEdit && selectedChat.chat.availability === "open" && <div className="ConsultationMessageActions">
                          <button type="button" onClick={() => beginEditMessage(message)}>تعديل</button>
                          <button type="button" onClick={() => deleteOwnMessage(message.id)}>حذف</button>
                        </div>}
                      </>
                    )}
                  </article>
                ))}
                  {visitorIsTyping && <div className="ConsultationTyping" aria-label="الزائر يكتب"><i /><i /><i /></div>}
              </div>
                {selectedChat.chat.availability === "open" && <form className="AdminConsultationComposer" onSubmit={sendReply}>
                  <textarea value={messageText} onChange={(event) => handleAdminMessageChange(event.target.value)} placeholder="اكتب ردك..." rows={2} maxLength={4000} aria-label="الرد" />
                <button type="submit" disabled={isSending || !messageText.trim()}>{isSending ? "جارٍ الإرسال..." : "إرسال الرد"}</button>
              </form>}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default ConsultationDashboard