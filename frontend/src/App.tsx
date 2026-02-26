// import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import DeveloperPage from './pages/DeveloperPage';
import { AUTH_ROUTES, ROUTES } from './constants/routes';

function AppLayout() {
  const location = useLocation();
  const showAuthNav = AUTH_ROUTES.includes(location.pathname as (typeof AUTH_ROUTES)[number]);

  return (
    <>
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
          <Route path={ROUTES.HOME} element={<HomePage></HomePage>}></Route>
          <Route path={ROUTES.DEVELOPERPAGE} element={<DeveloperPage></DeveloperPage>}></Route>
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