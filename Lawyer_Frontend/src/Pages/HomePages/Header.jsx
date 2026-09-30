import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

function Header() {
  let Name = "مكتب محمد سعد أبو الفرج"
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
      <Link to="/">
        {Name}
      </Link>
      <input
        className="HeaderMenuToggle"
        type="checkbox"
        id="Header-Menu-Toggle"
        aria-label="فتح القائمة"
      />
      <label className="HeaderMenuButton" htmlFor="Header-Menu-Toggle" aria-label="فتح القائمة">
        <span></span>
        <span></span>
        <span></span>
      </label>
      <div className="ListSlider">
        <label className="HeaderMenuClose" htmlFor="Header-Menu-Toggle">إغلاق القائمة</label>
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
    </div>
  )
}

export default Header