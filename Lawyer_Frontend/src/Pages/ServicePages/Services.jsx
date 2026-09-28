import Service_Card from "./Service_Card"
import Servicess from '../Services.json'
function Services() {
  return (
    <div className="Sections Secound-Section Two">
      <h1>الخدمات</h1>
      <div className="Services">
        {Servicess.map((N) => (
          <Service_Card
            key={N.id}
            Name={N.Name}
          />
        ))}
      </div>
    </div>
  )
}

export default Services