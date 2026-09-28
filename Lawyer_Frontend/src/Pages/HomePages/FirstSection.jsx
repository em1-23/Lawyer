import { Link } from "react-router-dom"
import NumberOfTheAge from '../Lawyers.json'
import Servicess from '../Services.json'
function FirstSection() { 
  let RealTime = new Date()
  let FTime = RealTime.getFullYear()
  let Exp = FTime - NumberOfTheAge[0].experience
  return (
    <div className="Sections First-Section">
      <img src="/First_Photo.jpg" alt="First Photo" className="Background" />
      <div className="Center-Section">
        <h2>خبرة قانونية تمتد لاكثر من  {Exp} سنه داخل</h2>
        <h3>جمهورية مصر العربية</h3>
        <p className="Description">
          {Servicess.map((N)=>(
            <span key={N.id} style={{margin:"0 10px",display:"inline-block"}} >{N.Name}</span>
          ))}
        </p>
        <div className="Buttons">
          <Link to="/call-us" className="Button Outline">تواصل معنا</Link>
          <Link to="/consultation" className="Button Outline">أطلب أستشاره</Link>
        </div>
      </div>
    </div>
  )
}

export default FirstSection
