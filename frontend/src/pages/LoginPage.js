// src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import './design/authPage.css';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [values, setValues] = useState({
    role: '',
    username: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    certNumber: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  const navigate = useNavigate();

  // Check for existing session on page load
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        const decoded = jwtDecode(token);
        const userInfo = JSON.parse(decoded.sub);

        // Check if token is still valid (assuming the token has an 'exp' field in seconds)
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
          // Token has expired, clear localStorage and stay on login page
          localStorage.removeItem('token');
          return;
        }

        // Navigate to the appropriate page based on role
        if (userInfo.role === 'parent') {
          navigate('/parents');
        } else if (userInfo.role === 'therapist') {
          navigate('/doctors');
        } else if (userInfo.role === 'student') {
          navigate('/students');
        } else if (userInfo.role === 'admin') {
          navigate('/admin');
        }
      } catch (err) {
        console.error('Invalid token:', err);
        // If token is invalid, clear localStorage and stay on login page
        localStorage.removeItem('token');
      }
    }
  }, [navigate]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setValues({ ...values, [name]: newValue });

    // Password strength calculation
    if (name === 'password') {
      let strength = 0;
      if (value.length > 5) strength += 1;
      if (value.match(/[A-Z]/)) strength += 1;
      if (value.match(/[0-9]/)) strength += 1;
      if (value.match(/[^A-Za-z0-9]/)) strength += 1;
      setPasswordStrength(strength);

      // Check if passwords match in real-time
      if (values.confirmPassword) {
        setPasswordsMatch(value === values.confirmPassword);
      }
    }

    // Check if passwords match when confirmPassword changes
    if (name === 'confirmPassword') {
      setPasswordsMatch(values.password === value);
    }
  };

  // Validate email format
  const validateEmail = (email) => {
    const regex = /^[\w-]+@([\w-]+\.)+[\w-]{2,4}$/;
    return regex.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    const trimmedUsername = values.username.trim();

    // Handle forgot password request
    if (isForgotPassword) {
      if (!validateEmail(trimmedUsername)) {
        setError('Please enter a valid email address.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: trimmedUsername }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Something went wrong. Please try again.');
          setIsLoading(false);
          return;
        }

        setMessage('We’ve sent password reset instructions to your email!');
        setIsLoading(false);
        setValues({ ...values, username: '' });

        setTimeout(() => {
          setMessage('');
          navigate('/reset-password', { state: { email: trimmedUsername } });
        }, 3000);
      } catch (err) {
        setError('Oops, something broke. Can you try again?');
        console.error(err);
        setIsLoading(false);
      }
      return;
    }

    // In login mode
    if (isLogin) {
      // Validate email format for login
      if (trimmedUsername.toLowerCase() !== "admin" && !validateEmail(trimmedUsername)) {
        setError('Please enter a valid email address.');
        setIsLoading(false);
        return;
      }
    } else {
      // Registration validations
      if (!validateEmail(trimmedUsername)) {
        setError('Please enter a valid email address.');
        setIsLoading(false);
        return;
      }

      if (!values.role) {
        setError('Please select a user type.');
        setIsLoading(false);
        return;
      }

      if (values.password !== values.confirmPassword) {
        setError('Passwords don’t match. Please try again.');
        setIsLoading(false);
        return;
      }

      if (passwordStrength < 3) {
        setError('Password is too weak. It should be at least 6 characters long and include an uppercase letter, a number, and a special character.');
        setIsLoading(false);
        return;
      }

      if ((values.role === 'student' || values.role === 'parent') && !values.dateOfBirth) {
        setError('Date of Birth is required.');
        setIsLoading(false);
        return;
      }

      if (values.role === 'therapist' && !values.certNumber) {
        setError('Certification Number is required for therapists.');
        setIsLoading(false);
        return;
      }
    }

    const endpoint = isLogin
      ? 'http://localhost:3000/auth/login'
      : 'http://localhost:3000/auth/register';

    try {
      let payload;
      if (!isLogin) {
        payload = {
          username: trimmedUsername,
          password: values.password,
          role: values.role,
        };

        if (values.role === 'therapist') {
          payload.certNumber = values.certNumber;
        } else if (values.role === 'student' || values.role === 'parent') {
          payload.dateOfBirth = values.dateOfBirth;
        }
      } else {
        payload = {
          username: trimmedUsername,
          password: values.password,
        };

        if (trimmedUsername.toLowerCase() === "admin") {
          payload.role = "admin";
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message && data.message.includes("awaiting admin verification")) {
          setError("Your account is awaiting admin verification. Please wait for an admin to verify your account.");
          setIsLoading(false);
          return;
        }
        setError(data.message || 'Something went wrong. Please try again.');
        setIsLoading(false);
        return;
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        const decoded = jwtDecode(data.token);
        const userInfo = JSON.parse(decoded.sub);

        if (userInfo.role === 'parent') {
          navigate('/parents');
        } else if (userInfo.role === 'therapist') {
          navigate('/doctors');
        } else if (userInfo.role === 'student') {
          navigate('/students');
        } else if (userInfo.role === 'admin') {
          navigate('/admin');
        }

        setMessage(data.message || 'Logged in successfully.');
        setIsLoading(false);
      } else {
        setMessage(data.message || 'Account created successfully!');
        setIsLoading(false);
        setIsLogin(true);
      }
    } catch (err) {
      setError('Oops, something broke. Can you try again?');
      console.error(err);
      setIsLoading(false);
    }

    if (!isLogin) {
      setValues({
        role: '',
        username: '',
        dateOfBirth: '',
        password: '',
        confirmPassword: '',
        certNumber: '',
      });
    }
  };

  // Function to toggle between forms
  const switchForm = (formType) => {
    setError('');
    setMessage('');
    setValues({
      role: '',
      username: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
      certNumber: '',
    });
    setPasswordsMatch(true);

    if (formType === 'login') {
      setIsLogin(true);
      setIsForgotPassword(false);
    } else if (formType === 'register') {
      setIsLogin(false);
      setIsForgotPassword(false);
    } else if (formType === 'forgot') {
      setIsLogin(false);
      setIsForgotPassword(true);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`auth-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Dark Mode Toggle */}
      <button className="dark-mode-toggle" onClick={toggleDarkMode}>
        {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
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
        {/* Login Form */}
        {isLogin && (
          <>
            <form onSubmit={handleSubmit} aria-label="Login form">
              {error && <p className="error" role="alert">{error}</p>}
              {message && <p className="message" role="status">{message}</p>}

              {/* Email Field */}
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

              {/* Password Field */}
              <div className="input-group password-group">
                <label htmlFor="password">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={values.password}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  aria-describedby="password-error"
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </div>

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  "Log In"
                )}
              </button>
            </form>

            {/* Forgot Password Link */}
            <div className="forgot-password">
              <span onClick={() => switchForm('forgot')} role="button" tabIndex="0" onKeyPress={(e) => e.key === 'Enter' && switchForm('forgot')}>
                Forgot password?
              </span>
            </div>

            {/* Divider */}
            <div className="divider"></div>

            {/* Create New Account Button */}
            <button className="register-button" onClick={() => switchForm('register')}>
              Create new account
            </button>
          </>
        )}

        {/* Forgot Password Form */}
        {isForgotPassword && (
          <>
            <h2>Reset Password</h2>
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
              <p className="reset-instructions">
                Enter your email address, and we’ll send you instructions to reset your password.
              </p>
              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <div className="forgot-password">
              <span onClick={() => switchForm('login')} role="button" tabIndex="0" onKeyPress={(e) => e.key === 'Enter' && switchForm('login')}>
                Back to login
              </span>
            </div>
          </>
        )}

        {/* Registration Form */}
        {!isLogin && !isForgotPassword && (
          <>
            <h2>Create Account</h2>
            {error && <p className="error" role="alert">{error}</p>}
            {message && <p className="message" role="status">{message}</p>}

            <form onSubmit={handleSubmit} aria-label="Registration form">
              {/* Role Selection */}
              <div className="input-group">
                <label htmlFor="role">User Type</label>
                <select
                  id="role"
                  name="role"
                  value={values.role}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  aria-describedby="role-error"
                >
                  <option value="">Select User Type</option>
                  <option value="parent">Parent</option>
                  <option value="therapist">Therapist</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {/* Email Field */}
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

              {/* Date of Birth only for students and parents */}
              {(values.role === 'student' || values.role === 'parent') && (
                <div className="input-group">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={values.dateOfBirth}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-describedby="dateOfBirth-error"
                  />
                </div>
              )}

              {/* Certification Number only for therapists */}
              {values.role === 'therapist' && (
                <div className="input-group">
                  <label htmlFor="certNumber">Certification Number</label>
                  <input
                    type="text"
                    id="certNumber"
                    name="certNumber"
                    placeholder="Enter certification number"
                    value={values.certNumber}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-describedby="certNumber-error"
                  />
                </div>
              )}

              {/* Password fields for registration */}
              <div className="input-group password-group">
                <label htmlFor="password">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter password"
                  value={values.password}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  aria-describedby="password-error"
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </div>

              {/* Password Strength Meter */}
              {values.password && !isLogin && (
                <div className="password-strength">
                  <div className={`strength-bar strength-${passwordStrength}`} />
                  <p>
                    Password Strength: {passwordStrength === 0 ? "Very Weak" :
                    passwordStrength === 1 ? "Weak" :
                    passwordStrength === 2 ? "Moderate" :
                    passwordStrength === 3 ? "Strong" : "Very Strong"}
                  </p>
                </div>
              )}

              <div className="input-group password-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  aria-describedby="confirmPassword-error"
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </span>
              </div>

              {/* Password Match Indicator */}
              {values.confirmPassword && !isLogin && (
                <div className="password-match">
                  <p className={passwordsMatch ? "match-success" : "match-error"}>
                    {passwordsMatch ? "Passwords match!" : "Passwords do not match."}
                  </p>
                </div>
              )}

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <div className="forgot-password">
              <span onClick={() => switchForm('login')} role="button" tabIndex="0" onKeyPress={(e) => e.key === 'Enter' && switchForm('login')}>
                Already have an account? Log in
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;