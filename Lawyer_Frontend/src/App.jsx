import React from 'react'
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

const ADMIN_DASHBOARD_PATH = '/control-center/secure-lawyer-conversations-admin-7f3a9c2e8b1d4a6f'

function AppRoutes() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith(ADMIN_DASHBOARD_PATH)
  const isConsultationChatPage = location.pathname === "/consultation"

  return (
    <>
      {!isAdminRoute && <>
        <Header />
        <Footer />
        {!isConsultationChatPage && <LiveChat />}
      </>}
      <Routes>
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
      </Routes>
    </>
  )
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}

export default App