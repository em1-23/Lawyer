import Servicess from '../Services.json'

function ConsultationAutomaticMessages(){
  let Name = "مكتب محمد سعد أبو الفرج"
  let AssistantName = "Mark 1.0"
  let TimeTaken = 20
  function FirstOne() {
    return(
      <div className="AutoMaticMessage FirstOne">
        <div className="MessageHeader">
          <span className="Name">{AssistantName}</span>
        </div>
        <div className="MessageBody">
          أهلا وسهلا في <span className="Special">{Name}</span> نقدم جميع خدمات الشركات : <br />
          <ul className='MessageList'>
            {Servicess.slice(1 , 5).map((N)=>(
              <li key={N.id}>{N.id - 1}. {N.Name}</li>
            ))}
          </ul>
          أنزل أملا البيانات بتاعتك تحت في النموذج وهينزلك المعاد بتاع الاستشارة <br />
          معاد الاستشارة بيتفتح بعد الدفع في المعاد المحدد له لمده {TimeTaken} دقيقة <br />
          بعد القفل بتخش وتعمل تمديد بالقديمة علي معاد تاني أو اكمل بعد المعاد دا <br />
        </div>
      </div>
    )
  }
  function SecondOne() {
    return(
      <div className="AutoMaticMessage SecondOne">
        <div className="MessageHeader">
          <span className="Name">{AssistantName}</span>
        </div>
        <div className="MessageBody">
          أهلا بيك في أستشارة <span className="Special">{Name}</span> <br />
        </div>
      </div>
    )       
  }

  return(
    <>
      <FirstOne />
      <SecondOne />
    </>
  )
}
export default ConsultationAutomaticMessages