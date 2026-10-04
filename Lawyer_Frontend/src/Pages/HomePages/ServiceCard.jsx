import { Link } from "react-router-dom"
function ServiceCard({ NameOfTheData }) {
  let ImgLink = `/ServiceImages/${NameOfTheData.Name}.jpg`
  let Links = `/services/${NameOfTheData.Name}`
  let descriptions = Array.isArray(NameOfTheData.descriptions)
    ? NameOfTheData.descriptions
    : []
  
  return (
    <div className="ServicesCards">
      <Link to={Links} className='Service-Card'>
        <img src={ImgLink} className="Image-Of-The-Service" alt={NameOfTheData.Name} />
        <div className="Center-Section">
          <h3 className="Name">{NameOfTheData.Name}</h3>
        </div>
      </Link>
    </div>
  )
}

export default ServiceCard