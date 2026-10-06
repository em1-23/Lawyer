function Map() {
  return (
    <div 
      className="Sections First-Section Map Transition" 
      style={{
        textAlign:"center"
      }}
    >
      <h1>موقع المكــتب</h1>
      <span>ميت ميمون , السنــطة , الغــربية</span>
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d794.4178335244553!2d31.15163526958165!3d30.785788998409934!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMzDCsDQ3JzA4LjgiTiAzMcKwMDknMDguMiJF!5e1!3m2!1sen!2seg!4v1791092185816!5m2!1sen!2seg"
        width="1000"
        height="450"
        style={{ border: 0 }}
        allowFullScreen={true}
        loading="lazy"
        className="Maps"
        referrerPolicy="strict-origin-when-cross-origin"
        title="Google Maps Location"
      />      
    </div>
  )
}

export default Map