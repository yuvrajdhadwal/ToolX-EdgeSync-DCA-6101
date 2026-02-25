import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const validateForm = () => {
    if (!username || !password || !confirmPassword) {
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
          navigate('/login');
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
      {success && <p style={{color: 'green'}}>Registration successful! Redirecting to login...</p>}
      <form onSubmit={handleSubmit}>
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
        {error && <p style={{color: 'red'}}>{error}</p>}
      </form>
        <p>
          Already have an account? <button onClick={() => navigate('/login')}>Login here</button>
        </p>
    </div>
  )
}

export default RegisterPage