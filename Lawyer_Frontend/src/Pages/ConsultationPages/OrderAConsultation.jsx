import { useState } from "react"

function OrderAConsultation() {
  const [name , setName]  = useState("")
  const [number , setNumber]  = useState("")
  const [date , setDate]  = useState()
  const [time , setTime]  = useState()
  
  const change = (e) => {
    e.preventDefault()
  }
  
  return (
    <div className="Sections First-Section" style={{textAlign:"center"}}>
      <h1>أطلب أستشاراتك حالا</h1>
      <form>
        <input type="text" onChange={(e) => (setName(e.target.value))}  value={name} className="Input-Box" placeholder="الأســم" /><br />
        <input type="text" onChange={(e) => (setNumber(e.target.value))} value={number} className="Input-Box" placeholder="الرقم" /><br />
        <input type="date" onChange={(e) => (setDate(e.target.value))} value={date} className="Input-Box Small" placeholder="التاريخ" />
        <input type="time" onChange={(e) => (setTime(e.target.value))} value={time} className="Input-Box Small" placeholder="الوقت" /><br />
        <button className="Input-Box Submit Rev">أرسال</button>
      </form>
    </div>
  )
}

export default OrderAConsultation