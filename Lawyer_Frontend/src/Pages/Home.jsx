import FirstSection from "./HomePages/FirstSection"
import HomeFooter from "./HomePages/HomeFooter"
import Map from "./HomePages/Map"
import MoreS from "./HomePages/MoreS"
import OfficeServicesSection from "./HomePages/OfficeServicesSection"
import ProfileCard from "./HomePages/ProfileCard"

function Home() {
  return (
    <>
      <FirstSection />
      <OfficeServicesSection />
      <ProfileCard />
      <Map />
      <MoreS />
      <HomeFooter />
    </>
  )
}

export default Home