import Answers from './RulesAndQuestions.json'

function Questions() {
  function FirstSection(){
    function Qu(N){
      return(
        <div className="Questions_Card">
          <label className="TheHead" htmlFor={N.id}>
            <input type="checkbox" className="HeadName" id={N.id} />
              <div className="QIcon">▶</div><span>{N.Question}</span>
          </label>
          <div className="TheBody">
            {N.Answer}
          </div>
        </div>
      )
    }
    return(
      <div className="Sections First-Section Questions" style={{textAlign:"center",height:"auto"}}>
        {Answers.slice(184).map((N) => (
          <Qu 
            id={N.id}
            Question={N.Question}
            Answer={N.Answer}
          />
        ))}
      </div>
    )
  }
  return (
    <>
      <FirstSection />
    </>
  )
}

export default Questions