import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('parents'); // default role
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    // Minimal validation: check that fields aren't empty.
    if (!username || !password) {
      setError('Please enter a username and password.');
      return;
    }

    // Check if user is admin (special case).
    if (username.toLowerCase() === 'admin') {
      if (password === 'admin123') {  // Use your desired admin credentials
        navigate('/admin');
      } else {
        setError('Incorrect admin credentials.');
      }
      return;
    }

    // For non-admin users, route based on the selected role.
    if (role === 'parents') {
      navigate('/parents');
    } else if (role === 'students') {
      navigate('/students');
    } else if (role === 'doctors') {
      navigate('/doctors');
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="username">Email or Username</label>
          <input
            type="text"
            id="username"
            placeholder="Enter your email or username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {/* Only display role dropdown when the user is not trying to log in as admin */}
        {username.toLowerCase() !== 'admin' && (
          <div className="form-group">
            <label htmlFor="role">Select Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="parents">Parents</option>
              <option value="students">Students</option>
              <option value="doctors">Doctors</option>
            </select>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
