function ProfileCard() {
  let Array = [
    {id:1,Name:"تأسيــس شركــات"},
    {id:2,Name:"هيئة الاستثمــارات"},
    {id:3,Name:"عقــود تجاريــة"},
    {id:4,Name:"تـــــــجاري"}
  ]
  return (
    <div className="Sections First-Section ProfileCard">
      <div className="Background-F">
        <img src="/Mohammed_Saad.png" alt="Image" />
        <img src="/Mohammed_Saad.png" alt="Image" className="Shadow" />
        <span className="Special-Name English S">Mohammed Saad</span>
      </div>
      <div className="Details">
        <h2>{localStorage.Experience} سنة كمحامي شركات منذ {localStorage.StartYear}</h2>
        <p className="Description">
          يقدم <span className="Special-Name">{localStorage.getItem("Name")}</span> العديد من الخدمات القانونية والتجارية التي تخدم المؤسسات<br />
          التجارية والشركات والافراد داخل مصر وخارجها & لاننا نقدم أفضل الخدمات القانونية <br />
          والفعالة من أجل خدمة عملائنا علي تحقيق أهدافهم وفق أجراءات قانونية سليمة <br />
          تحفظ للفرد حقوقه الادبية
        </p>
        <div className="Special-Section">
          {Array.map((N)=>(
            <li key={N.id} style={{
              display:"inline-flex",
              alignItems:"center",
              width:"200px",
              borderBottom:"1px solid var(--Color)",
              justifyContent:"space-between",gap:"2em",
              margin:"1% 2%"
            }}>{N.Name}</li>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProfileCard