import { Link , useParams } from "react-router-dom"
import Services from "../Services.json"

function ServiceDetails() {
  const { serviceName } = useParams()
  const decodedName = decodeURIComponent(serviceName || "")
  const Service = Services.find((item) => item.Name === decodedName)

  if (!Service) {
    return (
      <main className="Sections Service-Details">
        <h1>الخدمة غير موجودة</h1>
        <Link to="/service">العودة إلى الخدمات</Link>
      </main>
    )
  }

  return (
    <main className="Sections First-Section Service-Details">
      <img src={`/ServiceImages/${Service.Name}.jpg`} className="Background" alt={Service.Name} />
      <div className="Center-Section">
        <h1>{Service.Name}</h1>
        <Link to="/consultation" className="Box Submit">اطلب استشارة</Link>
      </div>  
    </main>
  )
}

export default ServiceDetails