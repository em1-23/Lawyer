import { useState } from "react";
import LineThrow from "../LineThrow";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function MoreSection() {
  const [name, setName] = useState("");
  const [messege, setMessege] = useState("نوع القضيه اللي هيظهر لك");
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (name.trim() === "") {
      setMessege("من فضلك اكتب استفسارك أولاً.");
      return;
    }

    setLoading(true);
    setMessege("جاري إرسال الطلب للسيرفر والتحليل...");

    try {
      const response = await fetch(`${API_URL}/api/analyze-case`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: name })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessege(data.result);
      } else {
        setMessege(data.error || "حدث خطأ في السيرفر.");
      }

    } catch (error) {
      console.error("Frontend Error:", error);
      setMessege("فشل الاتصال بسيرفر الـ Backend. تأكد من تشغيله.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='Section Third-Section'>
      <h1>خبرة قانونية متكاملة</h1>
      <LineThrow />
      <div className="Description"> 
        أستفسر عن أي حاجة أنت محتاجها عنا واحنا نطلع لك أقرب قضية ممكنة ليك <br />
        <form onSubmit={handleFormSubmit}> 
          <input 
            type="text" 
            placeholder="اكتب استفسارك القانوني هنا..." 
            className="Input-Box" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            disabled={loading}
          />
          <button type="submit" className="Input-Box Submit" disabled={loading}>
            {loading ? "جاري التحليل..." : "أرسال"}
          </button>
        </form>
        <div className="TheMassage" style={{ whiteSpace: "pre-line" }}>
          {messege}
        </div>
      </div>
    </div>
  );
}

export default MoreSection;