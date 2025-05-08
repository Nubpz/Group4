import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './design/authPage.css';

const ResetPasswordPage = () => {
  const [values, setValues] = useState({
    username: '',
    code: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Prefill email from location.state
  useEffect(() => {
    if (location.state?.email) {
      setValues((prev) => ({ ...prev, username: location.state.email }));
    }
  }, [location.state]);

  const validateEmail = (email) => {
    const regex = /^[\w-]+@([\w-]+\.)+[\w-]{2,4}$/;
    return regex.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });

    if (name === 'password') {
      let strength = 0;
      if (value.length > 5) strength += 1;
      if (value.match(/[A-Z]/)) strength += 1;
      if (value.match(/[0-9]/)) strength += 1;
      if (value.match(/[^A-Za-z0-9]/)) strength += 1;
      setPasswordStrength(strength);

      if (values.confirmPassword) {
        setPasswordsMatch(value === values.confirmPassword);
      }
    }

    if (name === 'confirmPassword') {
      setPasswordsMatch(values.password === value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    if (!validateEmail(values.username)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (!values.code) {
      setError('Please enter the reset code.');
      setIsLoading(false);
      return;
    }

    if (values.password !== values.confirmPassword) {
      setError('Passwords don’t match. Please try again.');
      setIsLoading(false);
      return;
    }

    if (passwordStrength < 3) {
      setError(
        'Password is too weak. It should be at least 6 characters long and include an uppercase letter, a number, and a special character.'
      );
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          code: values.code,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Something went wrong. Please try again.');
        setIsLoading(false);
        return;
      }

      setMessage('Password reset successfully! You can now log in with your new password.');
      setIsLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError('Oops, something broke. Can you try again?');
      console.error(err);
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`auth-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <button className="dark-mode-toggle" onClick={toggleDarkMode}>
        {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>

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

      <div className={`auth-card ${isDarkMode ? 'dark-mode' : ''}`}>
        <h2>Reset Your Password</h2>
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="message" role="status">{message}</p>}

        <form onSubmit={handleSubmit} aria-label="Reset password form">
          <div className="input-group">
            <label htmlFor="username">Email</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your email"
              value={values.username}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="username-error"
            />
          </div>

          <div className="input-group">
            <label htmlFor="code">Reset Code</label>
            <input
              type="text"
              id="code"
              name="code"
              placeholder="Enter 6-digit code"
              value={values.code}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="code-error"
            />
          </div>

          <div className="input-group password-group">
            <label htmlFor="password">New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="Enter new password"
              value={values.password}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="password-error"
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>

          {values.password && (
            <div className="password-strength">
              <div className={`strength-bar strength-${passwordStrength}`} />
              <p>
                Password Strength:{' '}
                {passwordStrength === 0
                  ? 'Very Weak'
                  : passwordStrength === 1
                  ? 'Weak'
                  : passwordStrength === 2
                  ? 'Moderate'
                  : passwordStrength === 3
                  ? 'Strong'
                  : 'Very Strong'}
              </p>
            </div>
          )}

          <div className="input-group password-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm new password"
              value={values.confirmPassword}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="confirmPassword-error"
            />
            <span
              className="toggle-password"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? '🙈' : '👁️'}
            </span>
          </div>

          {values.confirmPassword && (
            <div className="password-match">
              <p className={passwordsMatch ? 'match-success' : 'match-error'}>
                {passwordsMatch ? 'Passwords match!' : 'Passwords do not match.'}
              </p>
            </div>
          )}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? <span className="spinner"></span> : 'Reset Password'}
          </button>
        </form>

        <div className="forgot-password">
          <span
            onClick={() => navigate('/login')}
            role="button"
            tabIndex="0"
            onKeyPress={(e) => e.key === 'Enter' && navigate('/login')}
          >
            Back to login
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;