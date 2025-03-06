import React, { useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import './design/authPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [values, setValues] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: '',
    licenseNumber: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const validateEmail = (email) => {
    // Basic email regex. Adjust if needed.
    const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return regex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Email format validation
    if (values.username !== "Admin" && !validateEmail(values.username)) {
      setError('Invalid email format.');
      return;
    }

    // Registration-specific validations
    if (!isLogin) {
      if (values.password !== values.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!values.role) {
        setError('Please select a role.');
        return;
      }
      if (values.role === 'Therapist/Tutor' && !values.licenseNumber.trim()) {
        setError('Please enter your License/Certification Number.');
        return;
      }
    }

    const endpoint = isLogin
      ? 'http://localhost:3000/auth/login'
      : 'http://localhost:3000/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'An error occurred.');
        return;
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        setMessage(data.message || 'Logged in successfully.');
        const decoded = jwtDecode(data.token);
        // Adjust based on your token structure
        if (decoded.sub.role === 'Parent') {
          navigate('/parents');
        } else if (decoded.sub.role === 'Therapist/Tutor') {
          navigate('/doctors');
        } else if (decoded.sub.role === 'Student') {
          navigate('/students');
        } else if (decoded.sub.role === 'Admin') {
          navigate('/admin');
        }
      } else {
        setMessage(data.message || 'Registration successful.');
        setIsLogin(true);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    }

    setValues({
      username: '',
      password: '',
      confirmPassword: '',
      role: '',
      licenseNumber: '',
    });
  };

  return (
    <div className="auth-container">
      <div className="logo">
        <svg width="120" height="50" viewBox="0 0 120 50">
          <g>
            <circle cx="20" cy="20" r="10" fill="#52b788" />
            <circle cx="40" cy="20" r="10" fill="#52b788" />
            <circle cx="20" cy="40" r="10" fill="#52b788" />
            <circle cx="40" cy="40" r="10" fill="#52b788" />
          </g>
          <text x="60" y="35" fill="#52b788" fontSize="33" fontWeight="bold" dominantBaseline="middle">
            TAS
          </text>
        </svg>
      </div>
      <div className="auth-card">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        {error && <p className="error">{error}</p>}
        {message && <p className="message">{message}</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input
              type="text"
              name="username"
              placeholder="Enter your email"
              value={values.username}
              onChange={handleChange}
              required
            />
          </div>
          {!isLogin && (
            <>
              <div className="input-group">
                <label>Role</label>
                <select name="role" value={values.role} onChange={handleChange} required>
                  <option value="">Select Role</option>
                  <option value="Parent">Parent</option>
                  <option value="Therapist/Tutor">Therapist/Tutor</option>
                  <option value="Student">Student</option>
                </select>
              </div>
              {values.role === 'Therapist/Tutor' && (
                <div className="input-group">
                  <label>License/Certification Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    placeholder="Enter license/cert. number"
                    value={values.licenseNumber}
                    onChange={handleChange}
                  />
                </div>
              )}
            </>
          )}
          <div className="input-group password-group">
            <label>Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={values.password}
              onChange={handleChange}
              required
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>
          {!isLogin && (
            <div className="input-group password-group">
              <label>Confirm Password</label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={values.confirmPassword}
                onChange={handleChange}
                required
              />
              <span
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </span>
            </div>
          )}
          <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
        </form>
        <div className="toggle">
          {isLogin ? (
            <p>
              New user? <span onClick={() => setIsLogin(false)}>Create Account</span>
            </p>
          ) : (
            <p>
              Already have an account? <span onClick={() => setIsLogin(true)}>Login</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
