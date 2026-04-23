// import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import BizMngPage from './pages/BizMngPage';
import FirmwareDetailPage from './pages/FirmwareDetailPage';
import BizMngDevicesPage from './pages/BizMngDevicesPage';
import { AUTH_ROUTES, ROUTES } from './constants/routes';
import ProtectedRoute from "./components/ProtectedRoute";
import AddDevicePage from './pages/AddDevicePage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import WorldMapPage from './pages/WorldMapPage';
import FieldShopDevicesPage from './pages/FieldShopDevicesPage';
import AddShopPage from './pages/AddShopPage';

function AppLayout() {
  const location = useLocation();
  const showAuthNav = AUTH_ROUTES.includes(location.pathname as (typeof AUTH_ROUTES)[number]);

  return (
    <>
      {showAuthNav ? (
        <div className="app-auth-shell">
          <Routes>
            <Route path={ROUTES.WELCOME} element={<WelcomePage></WelcomePage>}></Route>
            <Route path={ROUTES.LOGIN} element={<LoginPage></LoginPage>}></Route>
            <Route path={ROUTES.REGISTER} element={<RegisterPage></RegisterPage>}></Route>
          </Routes>
        </div>
      ) : (
        <Routes>
          <Route path={ROUTES.HOME} element={<ProtectedRoute><HomePage></HomePage></ProtectedRoute>}></Route>
          <Route path={ROUTES.FIRMWARE_DETAIL} element={<ProtectedRoute><FirmwareDetailPage /></ProtectedRoute>}></Route>
          <Route path={ROUTES.UPLOAD} element={<ProtectedRoute><UploadPage /></ProtectedRoute>}></Route>
          <Route path={ROUTES.BIZMNGPAGE} element={<ProtectedRoute><BizMngPage /></ProtectedRoute>}></Route>
          <Route path={ROUTES.WORLD_MAP} element={<ProtectedRoute><WorldMapPage /></ProtectedRoute>}></Route>
          <Route path={ROUTES.DEVICES_BIZMNG} element={<ProtectedRoute><BizMngDevicesPage /></ProtectedRoute>}></Route>
          <Route path={ROUTES.DEVICE_DETAIL} element={<ProtectedRoute><DeviceDetailPage /></ProtectedRoute>}></Route>
          <Route path={ROUTES.ADD_DEVICES} element={<ProtectedRoute><AddDevicePage /></ProtectedRoute>}></Route>
          <Route path={ROUTES.ADD_SHOP} element={<ProtectedRoute><AddShopPage /></ProtectedRoute>}></Route>
          <Route path={ROUTES.FIELD_SHOP_DEVICES} element={<ProtectedRoute><FieldShopDevicesPage /></ProtectedRoute>}></Route>

        </Routes>
      )}
      
    </>
  )
}

function App() {

  return (
    <div className="app-shell">
      <Router>
        <AppLayout />
      </Router>
    </div>

  )
}

export default App
