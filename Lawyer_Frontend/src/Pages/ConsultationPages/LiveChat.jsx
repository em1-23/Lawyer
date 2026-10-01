import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NearestLawyer from './NearestLawyer'

const API_URL = import.meta.env.VITE_API_URL || 'https://lawyer-production-be12.up.railway.app'

function LiveChat() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [nearestLawyer, setNearestLawyer] = useState(null)
  const [caseType, setCaseType] = useState('')
  const [isClosed, setIsClosed] = useState(false)
  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [hasStarted, setHasStarted] = useState(false)
  const [conversationId] = useState(() => window.crypto?.randomUUID?.() || `chat-${Date.now()}`)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'أهلاً بك، كيف يمكنني مساعدتك في استفسارك القانوني؟' },
  ])

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || isLoading || isClosed) return

    const nextMessages = [...messages, { role: 'user', content: trimmedQuestion }]
    setMessages(nextMessages)
    setQuestion('')
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: trimmedQuestion, visitorName, visitorPhone }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'حدث خطأ أثناء إرسال الرسالة.')

      if (data.closed) {
        setIsClosed(true)
        setIsOpen(false)
        return
      }

      setMessages([...nextMessages, { role: 'assistant', content: data.result }])
      setNearestLawyer(data.nearestLawyer || null)
      setCaseType(data.caseType || '')
      if (data.creatorUrl) {
        window.location.assign(data.creatorUrl)
        return
      }
      if (data.route) {
        setIsOpen(false)
        navigate(data.route)
      }
    } catch (requestError) {
      setError(requestError.message || 'تعذر الاتصال بالسيرفر.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleIdentitySubmit(event) {
    event.preventDefault()
    if (!visitorName.trim() && !visitorPhone.trim()) return
    setHasStarted(true)
  }
  
  return (
    <div className='Live-Chat'>
      <div className={`Chat${isOpen ? ' is-open' : ''}`}>
        <div className="HeaderC Header-Chat">
          <h4>محادثة حية</h4>
          <span className="Number">id : {conversationId}</span>
        </div>
        {!hasStarted ? (
          <form className="ChatIdentity" onSubmit={handleIdentitySubmit}>
            <h5>بيانات التواصل</h5>
            <input className="Box VisitorName" value={visitorName} onChange={(event) => setVisitorName(event.target.value)} placeholder="الاسم" />
            <input className="Box VisitorPhone" value={visitorPhone} onChange={(event) => setVisitorPhone(event.target.value)} placeholder="رقم الهاتف" inputMode="tel" />
            <button type="submit" className='Box Submit' disabled={!visitorName.trim() && !visitorPhone.trim()}>بدء المحادثة</button>
          </form>
        ) : <div className="TheChat">
          {messages.map((message, index) => (
            <div className={`ChatMessege ChatMessage ${message.role === 'user' ? 'YourChat' : 'AssistantChat'}`} key={`${message.role}-${index}`}>
              {message.content}
            </div>
          ))}
          {isLoading && <div className="ChatMessege AssistantChat loading">جاري كتابة الرد...</div>}
          <NearestLawyer lawyer={nearestLawyer} caseType={caseType} />
          {error && <div className="ChatError">{error}</div>}
        </div>}
        {hasStarted && <form className="ChatForm" onSubmit={handleSubmit}>
          <textarea className="ChatTextarea" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="اكتب استفسارك هنا..." aria-label="اكتب استفسارك هنا" disabled={isLoading || isClosed} rows="1" />
          <button type="submit" disabled={isLoading || isClosed || !question.trim()}>إرسال</button>
        </form>}
      </div>
      <div className="Icon">
        <input type="checkbox" id="Icon-CheckBox" checked={isOpen} onChange={(event) => setIsOpen(event.target.checked)} disabled={isClosed} />
        <label htmlFor="Icon-CheckBox" className="Icon-Label">
          <svg className='Chat-Icon' xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg>
        </label>
      </div>
    </div>
  )
}

export default LiveChat