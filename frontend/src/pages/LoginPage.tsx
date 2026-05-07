import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHomeRouteForRole } from '../constants/routes';
import './styles/AuthPages.css'
import './styles/LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validateForm = () => {
    if (!username || !password) {
      setError('Username and password are required');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const formDetails = new URLSearchParams();
    formDetails.append('username', username);
    formDetails.append('password', password);

    try {
      const response = await fetch('/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDetails,
      });

      setLoading(false);

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);

        // Decode JWT to check for role before routing
        const payload = JSON.parse(atob(data.access_token.split('.')[1])) as { role?: string };

        navigate(getHomeRouteForRole(payload.role as Parameters<typeof getHomeRouteForRole>[0]));
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Authentication Failed');
      }
    } catch (error) {
      setLoading(false);
      setError('An error occured. Try agin later')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand auth-brand--ribbon">
          <img
            className="auth-brand__logo"
            src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
            alt="SLB Logo"
          />
        </div>

        <h1 className="login-title">Welcome</h1>
        <p className="login-subtitle">Enter username and password to log in</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="login-input"
              type='text'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="login-input"
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="login-button" type='submit' disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {error && <p className="login-error">{error}</p>}
      
        </form>
      </div>
    </div>
  )
}

export default LoginPage
