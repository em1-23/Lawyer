import { Link } from "react-router-dom"

function ConsultationFirstSection() {
  return (
    <div className="Sections First-Section Consultation">
      <div className="Background">
        <img src="/Consultation.png" alt="Consultation Right_Photo" />
        <svg width="300" height="300" fill="black" viewBox="0 0 600 600">
          <defs>
            <clipPath id="myClip">
              <path className="aaa" transform="translate(300,300)" d="M129.9,-199.2C164.6,-179.8,186.4,-137.5,203.1,-94.6C219.7,-51.8,231.1,-8.5,229,35.7C226.9,79.8,211.3,124.7,184.5,165.1C157.6,205.5,119.5,241.4,73.3,259.3C27.1,277.3,-27.1,277.3,-68.5,255.2C-110,233.1,-138.5,188.9,-170.6,149.3C-202.7,109.6,-238.5,74.5,-253.2,30.9C-268,-12.6,-261.8,-64.7,-232.9,-97.3C-203.9,-130,-152.2,-143.2,-109.6,-159.1C-67,-175,-33.5,-193.5,7,-204.4C47.6,-215.4,95.2,-218.7,129.9,-199.2Z" fill="#f0c"  />
            </clipPath>
          </defs>
        </svg>
      </div>
      <div className="Center-Section">
        <h3>الأستشــــــــارات</h3>
        <p className="Description">
          أطلب أستشارتك وحدد معادك
        </p>
      </div>
    </div>
  )
}

export default ConsultationFirstSection