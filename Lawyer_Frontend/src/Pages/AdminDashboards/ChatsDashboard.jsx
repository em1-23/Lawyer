import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function ChatsDashboard() {
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)

  async function loadConversations(event) {
    event?.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/admin/conversations`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل السجلات.')
      setConversations(data.conversations)
      setSelectedConversation(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  async function openConversation(publicId) {
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/conversations/${encodeURIComponent(publicId)}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل المحادثة.')
      setSelectedConversation(data)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function deleteSelectedConversation() {
    const publicId = selectedConversation?.conversation.public_id
    if (!publicId || !window.confirm('هل أنت متأكد من حذف المحادثة ورسائلها نهائيًا؟')) return

    setIsDeleting(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/conversations/${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'تعذر حذف المحادثة.')
      setConversations((currentConversations) => currentConversations.filter((conversation) => conversation.public_id !== publicId))
      setSelectedConversation(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsDeleting(false)
    }
  }

  async function deleteAllConversations() {
    if (!conversations.length || !window.confirm('سيتم حذف كل المحادثات ورسائلها نهائيًا. هل أنت متأكد؟')) return

    setIsDeletingAll(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/conversations`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'تعذر حذف كل المحادثات.')
      setConversations([])
      setSelectedConversation(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsDeletingAll(false)
    }
  }

  return (
    <main className="Sections First-Section AdminDashboard">
      <header className="AdminDashboardHeader">
        <h1>سجلات المحادثات</h1>
        <div className="AdminAccessForm">
          <button className="AdminLoadButton" type="button" onClick={loadConversations} disabled={isLoading}>{isLoading ? 'جاري التحميل...' : 'تحديث السجلات'}</button>
          <button className="AdminDeleteAllButton" type="button" onClick={deleteAllConversations} disabled={isDeletingAll || isLoading || !conversations.length}>
            {isDeletingAll ? 'جاري حذف الكل...' : 'حذف كل المحادثات'}
          </button>
        </div>
      </header>

      {error && <p className="AdminError">{error}</p>}
      <section className="AdminConversationList">
        {conversations.map((conversation) => (
          <button className="AdminConversationItem" type="button" key={conversation.public_id} onClick={() => openConversation(conversation.public_id)}>
            <strong>{conversation.visitor_name || 'بدون اسم'}</strong>
            <span>{conversation.visitor_phone || 'بدون رقم'}</span>
            <span>{conversation.public_id}</span>
            <span>{conversation.status}</span>
            <span>{conversation.message_count} رسالة</span>
          </button>
        ))}
      </section>

      {selectedConversation && (
        <article className="AdminConversationDetails">
          <div className="AdminConversationHeading">
            <div>
              <h2>{selectedConversation.conversation.visitor_name || 'بدون اسم'}</h2>
              <p>{selectedConversation.conversation.visitor_phone || 'بدون رقم'}</p>
              <p>{selectedConversation.conversation.public_id}</p>
            </div>
            <button className="AdminDeleteButton" type="button" onClick={deleteSelectedConversation} disabled={isDeleting}>
              {isDeleting ? 'جاري الحذف...' : 'حذف المحادثة والرسائل'}
            </button>
          </div>
          <div className="AdminMessages">
            {selectedConversation.messages.map((message, index) => (
              <div className={`AdminMessage AdminMessage-${message.role}`} key={`${message.created_at}-${index}`}>
                <strong>{message.role}</strong>
                <p>{message.content}</p>
                <time>{message.created_at}</time>
              </div>
            ))}
          </div>
        </article>
      )}
    </main>
  )
}

export default ChatsDashboard