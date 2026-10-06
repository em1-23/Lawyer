import LineThrow from "../LineThrow"
import ServiceCard from './ServiceCard'
import Services from '../Services.json'
import { useState } from "react"

function OfficeServicesSection() {
  const [number , setNumber] = useState(3)
  const handleShowMore = () => {
    setNumber(prevNumber => prevNumber + 3);
  };
  const hasMore = number < Services.length;
  return (
    <div className="Sections Secound-Section Transition">
      <h1>من الخدمات اللي بيقدمها المكتب</h1>
      <LineThrow />
      <div className="Services">
        {Services.slice(0,number).map((category) => (
          <ServiceCard
            key={category.id} 
            NameOfTheData={category} 
          />
        ))}
      </div>
      {hasMore && 
        <button 
          onClick={handleShowMore} 
          className="Box Submit" 
          style={{border:"1px solid var(--Color)"}}
        >المزيد</button>
      }
    </div>
  )
}

export default OfficeServicesSection
