import { useEffect, useState } from "react"

function ConsultationAttachmentImage({ apiUrl, chatId, attachmentId, accessToken, isAdmin = false, alt }) {
  const [imageUrl, setImageUrl] = useState("")
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let objectUrl = ""
    setImageUrl("")
    setUnavailable(false)

    fetch(`${apiUrl}/api/${isAdmin ? "admin/" : ""}consultation-chats/${encodeURIComponent(chatId)}/attachments/${attachmentId}`, {
      credentials: "include",
      headers: isAdmin ? {} : { "x-consultation-token": accessToken },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل الصورة.")
        return response.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (active) setImageUrl(objectUrl)
      })
      .catch(() => active && setUnavailable(true))

    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accessToken, apiUrl, attachmentId, chatId, isAdmin])

  if (unavailable) return <span className="ConsultationAttachmentUnavailable">تعذر عرض الصورة</span>
  if (!imageUrl) return <span className="ConsultationAttachmentLoading">جارٍ تحميل الصورة...</span>

  return (
    <a className="ConsultationAttachmentImage" href={imageUrl} target="_blank" rel="noreferrer">
      <img src={imageUrl} alt={alt || "مرفق في محادثة الاستشارة"} loading="lazy" />
    </a>
  )
}

export default ConsultationAttachmentImage