import FirstSection from "./HomePages/FirstSection"
import Map from "./HomePages/Map"
import OfficeServicesSection from "./HomePages/OfficeServicesSection"
import ProfileCard from "./HomePages/ProfileCard"

function Home() {
  return (
    <>
      <FirstSection />
      <OfficeServicesSection />
      <ProfileCard />
      <Map />
    </>
  )
}

export default Home