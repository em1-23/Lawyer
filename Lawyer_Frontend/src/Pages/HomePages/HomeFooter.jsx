function HomeFooter() {
  return (
    <div className='Sections First-Section HomeFooter Transition'>
      <div className="Sect Left-Section">
        <div className="FlexSliders">
          <li style={{fontSize:"20px"}}>محمد ســعد أبو فرج</li>
          <li className="Small">{localStorage.Experience} سنة من الخبرة</li>
          <li className="Small">ميت ميمـــــون , السنطـــــة , الغربيـــــة</li>
          <a href="/" className="Small L">الرئــــيسية</a>
          <a href="/consultation" className="Small L">الاستشـــارات</a>
          <a href="/questions" className="Small L">اسئلة شائعة</a>
          <a href="/eg-rules" className="Small L">القوانيـن المصريــة</a>
          <a href="/call-us" className="Small L">أتصل بــــنا</a>
        </div>
        <div className="FlexSliders">
          <p>
            <div className="Small">يقدم {localStorage.Name} مجموعة واسعة من الخدمات والقانونية للمؤسسات والشركات والافراد في مصر .</div>
            <div className="Small">نحن نقدم أفضل الخدمات القانونية والفعّالة والموثوقة من أجل مساعدة عملائنا على تحقيق أهدافهم وفق إجراءات قانونيَّة سليمة تتضمن حفظ حقوقهم الماديَّة والأدبيَّة .</div>
            <div className="Small Link">
              <div className="Icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg" 
                  height="24px" 
                  viewBox="0 -960 960 960" 
                  width="24px" 
                  className="Svg"
                >
                  <path 
                    d="M480-427ZM240-120q-50 0-85-35t-35-85v-240q0-24 9-46t26-39l240-240q17-18 39.5-26.5T480-840q23 0 45 8.5t40 26.5l240 240q17 17 26 39t9 46v240q0 50-35 85t-85 35H240Zm0-80h480q17 0 28.5-11.5T760-240v-240q0-8-3-15t-9-13L595-662l-59 58 144 144v180H280v-180l258-258-30-30q-8-8-15.5-10t-12.5-2q-5 0-12.5 2T452-748L212-508q-6 6-9 13t-3 15v240q0 17 11.5 28.5T240-200Zm120-160h240v-67L480-547 360-427v67Z"
                  />
                </svg>
              </div>
              <span>ميت ميمون , السنطة , الغربيـة</span>
            </div>
          </p>
        </div>
      </div>      
      <div className="Sect Right-Section">
        <div className="img">
          <span className="Special-Name English">Mohammed Saad</span>
          <span className="Special-Name">With</span>
          <span className="Special-Name English">Mahmoud Elnagar</span>
        </div>
      </div>      
    </div>
  )
}

export default HomeFooter