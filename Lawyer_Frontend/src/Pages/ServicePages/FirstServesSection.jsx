import Servicess from '../Services.json'
function FirstServesSection() {
  return (
    <div className="Sections First-Section Secound">
      <img src="/Four_Photo.jpg" alt="Secound Photo" className="Background" />
      <div className="Center-Section">
        <h3>الخدمات</h3>
        <h2>اللي المكتب بيقدمها</h2>
        <p className="Description">
          {Servicess.map((N)=>(
            <span key={N.id} style={{margin:"0 10px",display:"inline-block"}} >{N.Name}</span>
          ))}
        </p>
      </div>
    </div>
  )
}

export default FirstServesSection