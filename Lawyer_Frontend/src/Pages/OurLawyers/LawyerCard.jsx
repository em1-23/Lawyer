function LawyerCard(N) {
  return (
    <div className='Lawyer-Card'>
      <img src={N.Image_Link} alt={N.Name} className="ProfilePhoto" />
      <div className="About">
        <h3>{N.Name}</h3>
        <h4>{N.Pro}</h4>
        <div className="Social">
          <a href={N.Facebook} target="_blank" className="Icon">
            <img src="/Icons/Facebook.svg" className="IconLike" alt="Facebook" />  
          </a>
          <a href={N.Instagram} target="_blank" className="Icon">
            <img src="/Icons/Instagram.svg" className="IconLike" alt="Instagram" />  
          </a>
          <a href={`https://wa.me/${N.Whatsapp}`} target="_blank" className="Icon">
            <img src="/Icons/Whatsapp.svg" className="IconLike" alt="Whatsapp" />  
          </a>
        </div>
      </div>
    </div>
  )
}

export default LawyerCard