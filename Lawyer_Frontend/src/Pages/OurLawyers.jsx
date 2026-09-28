import FirstSection from "./OurLawyers/FirstSection"
import LawyerCard from "./OurLawyers/LawyerCard"
import Lawyers from './Lawyers.json'

function OurLawyers() {
  return (
    <div className="Section Our-Lawyers">
      <FirstSection />
      {Lawyers.map((N)=>(
        <LawyerCard 
          Name={N.name}
          Image_Link={N.image}
          Pro={N.specialization}
          Facebook={N.facebook}
          Whatsapp={N.whatsapp}
          Instagram={N.instagram}
        />
      ))}
    </div>
  )
}

export default OurLawyers