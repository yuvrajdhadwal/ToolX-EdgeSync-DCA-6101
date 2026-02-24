// import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage'; 

function AppLayout() {
  const location = useLocation();
  const showAuthNav = ['/', '/login', '/register'].includes(location.pathname);

  return (
    <>
      {showAuthNav && (
        <nav className="navbar-container">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </nav>
      )}
      <Routes>
        <Route path="/" element={<WelcomePage></WelcomePage>}></Route>
        <Route path="/login" element={<LoginPage></LoginPage>}></Route>
        <Route path='/register' element={<RegisterPage></RegisterPage>}></Route>
        <Route path="/home" element={<HomePage></HomePage>}></Route>
      </Routes>
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