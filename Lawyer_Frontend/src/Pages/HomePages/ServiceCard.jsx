import { Link } from "react-router-dom"
function ServiceCard({ NameOfTheData }) {
  let ImgLink = `/ServiceImages/${NameOfTheData.Name}.jpg`
  let Links = `/services/${NameOfTheData.Name}`
  let descriptions = Array.isArray(NameOfTheData.descriptions)
    ? NameOfTheData.descriptions
    : []
  
  return (
    <div className="ServicesCards">
      <div className='Service-Card'>
        <img src={ImgLink} className="Image-Of-The-Service" alt={NameOfTheData.Name} />
        <div className="CenterIcon">
          <svg className="CenterIcon-Svg" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M80-120v-80h360v-447q-26-9-45-28t-28-45H240l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280h-80v-80h247q12-35 43-57.5t70-22.5q39 0 70 22.5t43 57.5h247v80h-80l120 280q0 50-41 85t-99 35q-58 0-99-35t-41-85l120-280H593q-9 26-28 45t-45 28v447h360v80H80Zm585-320h150l-75-174-75 174Zm-520 0h150l-75-174-75 174Zm335-280q17 0 28.5-11.5T520-760q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760q0 17 11.5 28.5T480-720Z"/></svg>
        </div>
        <h3 className="Name">{NameOfTheData.Name}</h3>
        <ul className="Description List">
          {descriptions.map((desc, index) => (
            <li key={index}>{desc}</li>
          ))}
        </ul>
        <Link to={Links} className="Choose">أختار دي</Link>
      </div>
    </div>
  )
}

export default ServiceCard
