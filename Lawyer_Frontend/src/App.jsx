import { useEffect, useState } from 'react'
import { BrowserRouter , Routes , Route, useLocation } from 'react-router-dom'
import Home from './Pages/Home'
import Header from './Pages/HomePages/Header'
import Footer from './Pages/HomePages/Footer'
import Service from './Pages/Service'
import Consultation from './Pages/Consultation'
import LiveChat from './Pages/ConsultationPages/LiveChat'
import OurLawyers from './Pages/OurLawyers'
import ServiceDetails from './Pages/ServicePages/ServiceDetails'
import AdminDashboard from './Pages/AdminDashboard'
import ChatsDashboard from './Pages/AdminDashboards/ChatsDashboard'
import MainAdminPage from './Pages/AdminDashboards/MainAdminPage'
import OrderAConsultation from './Pages/ConsultationPages/OrderAConsultation'
import ConsultationDashboard from './Pages/AdminDashboards/ConsultationDashboard'
import Call_Us from './Pages/Call_Us'
import Rules from './Pages/Rules'
import LoadingPage from './Pages/LoadingPage'

const ADMIN_DASHBOARD_PATH = '/control-center/secure-lawyer-conversations-admin-7f3a9c2e8b1d4a6f'

function AppRoutes() {
  const location = useLocation()
  const [renderedLocation, setRenderedLocation] = useState(location)
  const [transitionPhase, setTransitionPhase] = useState('enter')
  const isAdminRoute = location.pathname.startsWith(ADMIN_DASHBOARD_PATH)
  const isConsultationChatPage = location.pathname === "/consultation"

  useEffect(() => {
    if (location.key === renderedLocation.key) return

    setTransitionPhase('exit')
    const transitionTimer = window.setTimeout(() => {
      setRenderedLocation(location)
      setTransitionPhase('enter')
    }, 220)

    return () => window.clearTimeout(transitionTimer)
  }, [location, renderedLocation.key])

  return (
    <>
      {!isAdminRoute && <>
        <Header />
        <Footer />
        {!isConsultationChatPage && <LiveChat />}
      </>}
      <div className={`RouteTransition ${transitionPhase}`} key={renderedLocation.key}>
      <Routes location={renderedLocation}>
        <Route path="/" element={<Home />} />
        <Route path="/service" element={<Service />} />
        <Route path="/services/:serviceName" element={<ServiceDetails />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/consultation/order" element={<OrderAConsultation />} />
        <Route path="/our-lawyers" element={<OurLawyers />} />
        <Route path={ADMIN_DASHBOARD_PATH} element={<AdminDashboard />}>
          <Route index element={<MainAdminPage />} />
          <Route path='admin-chats' element={<ChatsDashboard />} />
          <Route path='admin-consultation' element={<ConsultationDashboard />} />
        </Route>
        <Route path="/eg-rules" element={<Rules />} />
        <Route path="/call-us" element={<Call_Us />} />
        <Route path="/loading" element={<LoadingPage />} />
      </Routes>
      </div>
    </>
  )
}

function App() {
  const [loading, setLoading] = useState(true)
  const [loadingIsExiting, setLoadingIsExiting] = useState(false)

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setLoadingIsExiting(true), 650)
    const removeTimer = window.setTimeout(() => setLoading(false), 900)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(removeTimer)
    }
  }, [])

  return (
    <BrowserRouter>
      <AppRoutes />
      {loading && (
        <div className={`AppLoading${loadingIsExiting ? ' exit' : ''}`} role="status" aria-label="جارٍ تحميل الموقع">
          <LoadingPage />
        </div>
      )}
    </BrowserRouter>
  )
}

export default App