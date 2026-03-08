// import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import BizMngPage from './pages/BizMngPage';
import FirmwareDetailPage from './pages/FirmwareDetailPage';
import DeveloperPage from './pages/DeveloperPage';
import BizMngDevicesPage from './pages/BizMngDevicesPage';
import { AUTH_ROUTES, ROUTES } from './constants/routes';
import ProtectedRoute from "./components/ProtectedRoute";
import AddDevicePage from './pages/AddDevicePage';
import Logout from './components/Logout';

function AppLayout() {
  const location = useLocation();
  const showAuthNav = AUTH_ROUTES.includes(location.pathname as (typeof AUTH_ROUTES)[number]);

  return (
    <>
      {!showAuthNav && <Logout />}
      {showAuthNav ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: '2rem' }}>
          <nav className="navbar-container"
          style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to={ROUTES.LOGIN}>Login</Link>
            <Link to={ROUTES.REGISTER}>Register</Link>
          </nav>
          <Routes>
            <Route path={ROUTES.WELCOME} element={<WelcomePage></WelcomePage>}></Route>
            <Route path={ROUTES.LOGIN} element={<LoginPage></LoginPage>}></Route>
            <Route path={ROUTES.REGISTER} element={<RegisterPage></RegisterPage>}></Route>
          </Routes>
        </div>
      ) : (
        <Routes>
          <Route path={ROUTES.HOME} element={<ProtectedRoute><HomePage></HomePage></ProtectedRoute>}></Route>
          <Route path={ROUTES.FIRMWARE_DETAIL} element={<FirmwareDetailPage></FirmwareDetailPage>}></Route>

          <Route path={ROUTES.DEVELOPERPAGE} element={<ProtectedRoute><DeveloperPage /></ProtectedRoute>}></Route>
          <Route path={ROUTES.UPLOAD} element={<UploadPage></UploadPage>}></Route>
          <Route path={ROUTES.BIZMNGPAGE} element={<BizMngPage></BizMngPage>}></Route>
          <Route path={ROUTES.DEVICES_BIZMNG} element={<BizMngDevicesPage></BizMngDevicesPage>}></Route>
          <Route path={ROUTES.ADD_DEVICES} element={<AddDevicePage></AddDevicePage>}></Route>

        </Routes>
      )}
    </>
  )
}

function App() {

  return (
    <div>
      
      <Router>
        <AppLayout />
      </Router>




    </div>

  )
}

export default App
