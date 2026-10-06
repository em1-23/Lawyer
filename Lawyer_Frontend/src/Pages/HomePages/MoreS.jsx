function MoreS() {
  function SCard(N){
    let Class
    if(Number(N.Id) === 1){
      Class = "Card Special"
    }else{
      Class = "Card"
    }
    return(
      <div className={Class} style={{"--index":N.index}}>
        <span className="Name">{N.Name}</span>
        <span className="Value">{N.Value}</span>
      </div>
    )
  }
  return (
    <div className="Sections First-Section More Transition" style={{height:"auto",margin:"5% auto",marginTop:"-1%",padding:"5% 0"}}>
      <div className="Cards">
        <SCard 
          Id="1"
          index="1"
          Value="+ 500" 
          Name="القضايـــا الناجــــحة" 
        />
        <SCard
          index="2"
          Value="+ 120"
          Name="العمــــــــلاء" 
        />
        <SCard 
          Id="1"
          index="3"
          Value="98%" 
          Name="نســـبة النــــجاح"
        />
        <SCard
          index="4"
          Name="" 
          Value=""
        />
      </div>
    </div>
  )
}

export default MoreS