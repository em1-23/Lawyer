import { Link, useOutletContext } from "react-router-dom"

function MainAdminPage() {
  const { admin } = useOutletContext()

  function AdminLink(N) {
    return(
      <Link className="Input-Box Submit Rev" to={N.id} key={N.id}>
        {N.Name}
      </Link>
    )
  }
  const AdminArray = [
    {
      id:"admin-chats",
      Name:"المحادثات"
    },
    { id:"admin-consultation", Name:"الأستشارات" },
  ]
  return (
    <div className="Section">
      <div className="Sections First-Section" style={{textAlign:"center"}}>
        <h1>أهلا {admin.name || admin.email} في صفحة الإعدادات</h1>
        <div className="Links">
          {AdminArray.map((N) => (
            <AdminLink id={N.id} Name={N.Name} key={N.id} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default MainAdminPage
