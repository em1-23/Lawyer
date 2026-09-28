import { Link } from "react-router-dom"

function Service_Card({ Name }) {
  let ImageLink = `/ServiceImages/${Name}.jpg`
  let Links = `/services/${encodeURIComponent(Name)}`
  return (
    <div className="Service-Card-Two">
      <img src={ImageLink} alt={Name} className="Background" />
      <div className="Desc">
        <h2 className="Name">{Name}</h2>
        <div className="Icon">
          <svg xmlns="http://www.w3.org/2000/svg" className="Svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M160-120v-80h480v80H160Zm226-194L160-540l84-86 228 226-86 86Zm254-254L414-796l86-84 226 226-86 86Zm184 408L302-682l56-56 522 522-56 56Z"/></svg>
        </div>
        <Link className="Seeit" to={Links} >اختار دي</Link>
      </div>
    </div>
  )
}

export default Service_Card