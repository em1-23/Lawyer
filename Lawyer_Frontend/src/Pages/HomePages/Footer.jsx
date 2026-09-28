function Footer() {
  function Icon(N){
    let IconLink = `/Icons/${N.Name}.svg`
    let Link
    if(N.Name === "Email" || N.Name === "email"){
      Link =`mailto:${N.Content}`
    }else if(N.Name === "Phone" || N.Name === "phone"){
      Link =`tel:${N.Content}`
    }else if(N.Name === "Whatsapp" || N.Name === "whatsapp"){
      Link =`https://wa.me/${N.Content}`
    }else if(N.Name === "FaceBook" || N.Name === "facebook"){
      Link =`https://www.facebook.com/mohamed.saad.228125`
    }
    return(
      <span className="Icon">
        <a target="_blank" href={Link}>{N.Content}</a>
        <img src={IconLink} alt={N.Name} />
      </span>
    )
  }
  return (
    <div className="Footer">
      <Icon Content="+201069399134" Name="Whatsapp" />
      <Icon Content="+201069399134" Name="Phone" />
      <Icon Content="msaid3749@gmail.com" Name="Email" />
    </div>
  )
}

export default Footer