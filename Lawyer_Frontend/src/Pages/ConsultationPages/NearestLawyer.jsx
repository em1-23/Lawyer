import { Link } from 'react-router-dom'
import Profile from './Profile'

function NearestLawyer({ lawyer, caseType }) {
  if (!lawyer) return null
  return (
    <article className="Nearest-Lawyer">
      {caseType && <p className="Case-Type">المحامي المناسب للقضية</p>}
      <Link to="/our-lawyers">
        <Profile image={lawyer.image} name={lawyer.name} />
      </Link>
    </article>
  )
}

export default NearestLawyer