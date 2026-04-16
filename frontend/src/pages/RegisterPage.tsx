import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../constants/routes';
import './styles/AuthPages.css'
import './styles/RegisterPage.css';

type roleOption = {
  role: string;
  label: string;
}

type devmngOption = {
  username: string;
  id: number;
}

const options: roleOption[] = [
  {role: 'developer', label: 'Developer'},
  {role: 'developer_manager', label: 'Developer Manager'},
  {role: 'business_manager', label: 'Business Manager'},
  {role: 'field_shop_professional', label: 'Field/Shop Professional'}
]

const RegisterPage: React.FC = () => {
  const [role, setrole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [developerManagerID, setDeveloperManagerID] = useState('');
  const [developerManagers, setDeveloperManagers] = useState<devmngOption[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'developer') {
      fetch('/devmng')
        .then((res) => res.json())
        .then((data: devmngOption[]) => setDeveloperManagers(data))
        .catch(() => setError('Failed to load developer managers'));
    } else {
      setDeveloperManagers([]);
      setDeveloperManagerID('');
    }
  }, [role]);

  const validateForm = () => {
    if (!role || !username || !password || !confirmPassword) {
      setError('All fields are required');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (role === 'developer' && !developerManagerID) {
      setError('Developer must have a developer manager assigned');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: role,
          username: username,
          password: password,
          ...(role === 'developer' && { developer_manager_id: developerManagerID})
        }),
      });

      setLoading(false);

      if (response.ok) {
        setSuccess(true);
        setError('');
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate(ROUTES.LOGIN);
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed');
      }
    } catch (error) {
      setLoading(false);
      setError('An error occurred. Try again later');
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-brand auth-brand--ribbon">
          <img
            className="auth-brand__logo"
            src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
            alt="SLB Logo"
          />
        </div>

        <h1 className="register-title">Register</h1>
        <p className="register-subtitle">Create an account to get started</p>
        {success && <p className="register-success">Registration successful! Redirecting to login...</p>}

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-field">
            <label className="register-label">Role:</label>
            <select
              className="register-input"
              value={role}
              onChange={(e) => setrole(e.target.value)}
            >
              <option value="" disabled>
                Select your role
              </option>
              {options.map((option) => (
                <option key={option.role} value={option.role}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {role === 'developer' && (
            <div className="register-field">
              <label className="register-label">Developer Manager Username:</label>
              <select
                className="register-input"
                value={developerManagerID}
                onChange={(e) => setDeveloperManagerID(e.target.value)}
              >
                <option value="" disabled>Select a Developer Manager</option>
                {developerManagers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.username}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="register-field">
            <label className="register-label">Username:</label>
            <input
              className="register-input"
              type='text'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="register-field">
            <label className="register-label">Password:</label>
            <input
              className="register-input"
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="register-field">
            <label className="register-label">Confirm Password:</label>
            <input
              className="register-input"
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button className="register-button" type='submit' disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>

          {error && <p className="register-error">{error}</p>}

          <Link className="register-login" to={ROUTES.LOGIN}>
            Already have an account? Login here
          </Link>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage