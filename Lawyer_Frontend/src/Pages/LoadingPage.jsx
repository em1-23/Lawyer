function LoadingPage() {
  function Ciricle(N){
    let index = N.index
    let BackgroundColor = N.BackgroundColor
    return(
      <div 
        className="Ciricle_Rotate" 
        style={{"--index": index ,"--BackgroundColorMain" : BackgroundColor}}
      ></div>
    )
  }
  return (
    <div className="Section First-Section Loading-Page">
      <div className="Flex">
        <Ciricle index="1" BackgroundColor="#3f85ed" />
        <Ciricle index="2" BackgroundColor="#3668b3" />
        <Ciricle index="3" BackgroundColor="#18478d" />
        <Ciricle index="4" BackgroundColor="#172e4f" />
        <Ciricle index="5" BackgroundColor="#00285f" />
      </div>
    </div>
  )
}

export default LoadingPage