import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors';
import { ROUTES } from '../constants/routes';

type roleOption = {
  role: string;
  label: string;
}

const options: roleOption[] = [
  {role: 'Developer', label: 'Developer'},
  {role: 'Developer Manager', label: 'Developer Manager'},
  {role: 'Business Manager', label: 'Business Manager'},
  {role: 'Field/Shop Professional', label: 'Field/Shop Professional'}
]

const RegisterPage: React.FC = () => {
  const [role, setrole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

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
    <div style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
      <h1>Register</h1>
      {success && <p style={{ color: COLORS.successText }}>Registration successful! Redirecting to login...</p>}
      <form onSubmit={handleSubmit}>
      
        <div>
          <label>
            Role:
          </label>
          <select 
            value = {role}
            onChange={(e) => setrole(e.target.value)}
          >
            {options.map((option) => (
              <option key={option.role} value={option.role}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>
            Username:
          </label>
          <input 
            type='text'
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label>
            Password:
          </label>
          <input 
            type='password'
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label>
            Confirm Password:
          </label>
          <input 
            type='password'
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button type='submit' disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        {error && <p style={{ color: COLORS.error }}>{error}</p>}
      </form>
        <p>
          Already have an account? <button onClick={() => navigate(ROUTES.LOGIN)}>Login here</button>
        </p>
    </div>
  )
}

export default RegisterPage