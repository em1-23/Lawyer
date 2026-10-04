import { Link } from 'react-router-dom'

function Call_Us() {
  function Icon(N){
    let IconLink = `/Icons/${N.Name}.svg`
    let Link
    if(N.Name === "Whatsapp"){
      Link = `https://wa.me/${N.Number}`
    }else if(N.Name === "Facebook"){
      Link = `https://www.facebook.com/${N.UserName}`
    }else if(N.Name === "Instagram"){
      Link = `https://www.instagram.com/${N.UserName}`
    }else if(N.Name === "Email"){
      Link = `mailto:${N.EmailName}`
    }else if(N.Name === "Email"){
      Link = `mailto:${N.EmailName}`
    }else if(N.Name === "Linkedin"){
      Link = `https://www.linkedin.com/in/${N.UserName}`
    }else if(N.Name === "Github"){
      Link = `https://www.github.com/${N.UserName}`
    }
    return(
      <a href={Link} target="_blank" className="Icon">
        <img src={IconLink} alt={N.Name} className="IconS" />
      </a>
    )
  }
  function AccountOne(){
    return(
      <div className="Continer">
        <div className="Character">
          <Link to="/control-center/secure-lawyer-conversations-admin-7f3a9c2e8b1d4a6f">
            <img src="/PhotoMe.jpg" alt="Mahmoud Ahmed" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"left",borderRadius:"0 0 2rem 0"}}/>
          </Link>
        </div>
        <div className="SocialMedia Account MahmoudElnagar">
          <h5 className='Special-Name English'>Mahmoud Ahmed Elnagar</h5>
          <h5 className="Jop">مبرمج مواقع ويب</h5>
          <div className="Socials">
            <Icon Name="Whatsapp" Number="+201027680112" />
            <Icon Name="Facebook" UserName="mahmoud.ahmed.elnagar.331391" />
            <Icon Name="Instagram" UserName="mahmoud1245906" />
            <Icon Name="Email" EmailName="melngar650@gmail.com" />
            <Icon Name="Linkedin" UserName="mahmoudahmedelngar01027680112" />
            <Icon Name="Github" UserName="em1-23" />
          </div>
        </div>
      </div>
    )
  }
  function AccountTwo(){
    return(
      <div className="Continer">
        <div className="Character">
          <Link to="/control-center/secure-lawyer-conversations-admin-7f3a9c2e8b1d4a6f">
            <img src="/Lawyers_Images/Mohammed_Saad.jpg" alt="Mahmoud Ahmed" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"left",borderRadius:"0 0 2rem 0"}}/>
          </Link>
        </div>
        <div className="SocialMedia Account MohammedSaad">
          <h5 className='Special-Name English'>Mohammed Saad AboFarg</h5>
          <h5 className="Jop">محامي شركات</h5>
          <div className="Socials">
            <Icon Name="Whatsapp" Number="+201069399134" />
            <Icon Name="Facebook" UserName="mohamed.saad.228125" />
            <Icon Name="Instagram" UserName="l_mosaad1991" />
            <Icon Name="Email" EmailName="msaid3749@gmail.com" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="Sections First-Section CallUs" style={{textAlign:"center"}}>
      <h2>جميع وسائل التواصل مع الموقع</h2>
      <AccountTwo />
      <AccountOne />
      <Link to="/control-center/secure-lawyer-conversations-admin-7f3a9c2e8b1d4a6f" className='Input-Box Submit' style={{width:"auto",border:"1px solid var(--Color)"}}>الادارة - <span style={{fontSize:"10px",color:"#1198ff"}}>لو مش أدمن متطغتش</span></Link>
    </div>
  )
}

export default Call_Us