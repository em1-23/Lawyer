import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

function Header() {
  localStorage.Name = "مكتب محمد سعد أبو الفرج"
  localStorage.setItem('Check', true);
   const [checked, setChecked] = useState(() => {
    const savedValue = localStorage.getItem('rememberMe');
    return savedValue === 'true';
  });
  useEffect(() => {
    localStorage.setItem('rememberMe', checked);
  }, [checked]);
  return (
    <div className="Header">
      <Link to="/">{localStorage.Name}</Link>
      <ul className="Buttons">
        <li><Link to="/service" className="Button Outline">الخدمات القانونية</Link></li>
        <li><Link to="/consultation" className="Button Outline">أطلب أستشاره</Link></li>
        <li><Link to="/questions" className="Button Outline">اسئله شائعة</Link></li>
        <li><Link to="/eg-rules" className="Button Outline">القوانين المصرية</Link></li>
        <li><Link to="/call-us" className="Button Outline">اتصل بنا</Link></li>
      </ul>
      <div className="Background-Change-Toggle">
        <input 
          type="checkbox"
          id="Background-Change-Toggle-Check_Box"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <label
          htmlFor="Background-Change-Toggle-Check_Box" 
          className="Background-Change-Toggle-Label"
        ></label>
      </div>
    </div>
  )
}

export default Header