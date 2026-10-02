import { Link } from 'react-router-dom'
import LineThrow from './LineThrow'
import RulesJsonFile from './RulesAndQuestions.json'
function Rules() {
  function FirstSectionRu(){
    return(
      <div className="Sections First-Section">
        <img src="/Six_Photo.png" alt="" className="Background" />
        <div className="Center-Section">
          <h6>مكتب محمــد ســـعد أبو الفرج</h6>
          <h3>القوانــــين المصــــرية للشركــــات</h3>
        </div>
      </div>
    )
  }
  function SecoundSection(){
    function Article(N){
      return(
        <>
          <div className="Article_Card" style={{"--Mi":N.id}}>
            <span className="Key">المادة رقم  ( {N.id} )</span> {N.ArticleLine}
          </div> <br />
        </>
      )
    }
    return(
      <div className="Sections Secound-Section" style={{marginBottom:"6%"}}>
        <h1>القانــون المـــصري للشــركــات رقـــم 159 لسنــة 1981</h1>
        <LineThrow />
        <br />
        {RulesJsonFile.slice(0 , 184).map((N) => (
          <Article
            ArticleLine={N.Line}
            key={N.id} 
            id={N.id}
          />
        ))}
      </div>
    )
  }
  return (
    <>
      <FirstSectionRu />
      <SecoundSection />
    </>
  )
}

export default Rules