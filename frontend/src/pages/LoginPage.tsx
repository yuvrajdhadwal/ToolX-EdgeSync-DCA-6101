import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
        navigate('/home');
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
    <div style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
      <h1>This is LoginPage</h1>
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
              password:
            </label>
            <input 
            type='password'
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type='submit' disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {error && <p style={{color: 'red'}}>{error}</p>}
        </form>
    </div>
  )
}

export default LoginPage