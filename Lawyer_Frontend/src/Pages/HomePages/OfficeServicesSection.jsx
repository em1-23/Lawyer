import LineThrow from "../LineThrow"
import ServiceCard from './ServiceCard'
import Services from '../Services.json'
import { Link } from "react-router-dom"

function OfficeServicesSection() {
  return (
    <div className="Section Secound-Section">
      <h1>من الخدمات اللي بيقدمها المكتب</h1>
      <LineThrow />
      <div className="Services">
        {Services.slice(0,3).map((category) => (
          <ServiceCard
            key={category.id} 
            NameOfTheData={category} 
          />
        ))}
      </div>
      <Link to="/service" className="Box Submit">شوف الباقي</Link>
    </div>
  )
}

export default OfficeServicesSection
