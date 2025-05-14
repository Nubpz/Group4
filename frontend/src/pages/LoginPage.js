import React, { useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import './design/authPage.css';

const AuthPage = () => {
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const validateEmail = (email) => {
    const regex = /^[\w-]+@([\w-]+\.)+[\w-]{2,4}$/;
    return regex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
  
    const trimmedUsername = values.username.trim();
    
    // Handle forgot password request
    if (isForgotPassword) {
      if (!validateEmail(trimmedUsername)) {
        setError('Invalid email format.');
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
          setError(data.message || 'An error occurred.');
          return;
        }
        
        setMessage('Password reset instructions have been sent to your email.');
        
        // Reset form after a moment and return to login
        setTimeout(() => {
          setValues({
            ...values,
            username: '',
          });
          setIsForgotPassword(false);
        }, 3000);
        
        return;
      } catch (err) {
        setError('An error occurred. Please try again.');
        console.error(err);
        return;
      }
    }
    
    // In login mode
    if (isLogin) {
      // Validate email format for login
      if (trimmedUsername.toLowerCase() !== "admin" && !validateEmail(trimmedUsername)) {
        setError('Invalid email format.');
        return;
      }
      
      // For admin case
      if (trimmedUsername.toLowerCase() === "admin") {
        setValues({ ...values, role: 'admin' });
      }
    } 
    // Registration validations (unchanged)
    else {
      if (!validateEmail(trimmedUsername)) {
        setError('Invalid email format.');
        return;
      }
      
      if (!values.role) {
        setError('Please select a user type.');
        return;
      }
      
      // Additional role specific validations remain here...
      // [Include your registration validations for student, parent, and therapist as needed]
    }
  
    const endpoint = isLogin
      ? 'http://localhost:3000/auth/login'
      : 'http://localhost:3000/auth/register';
  
    try {
      let payload;
      if (!isLogin) {
        // Minimal registration payload
        payload = {
          username: trimmedUsername,
          password: values.password,
          role: values.role
        };
        
        // Add role-specific fields
        if (values.role === 'therapist') {
          payload.certNumber = values.certNumber;
        } else if (values.role === 'student' || values.role === 'parent') {
          payload.dateOfBirth = values.dateOfBirth;
        }
      } else {
        // Login payload only needs username and password
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
      
      console.log('Login response status:', response.status);  // Debug log
      const data = await response.json();
      console.log('Login response data:', data);  // Debug log
  
      // Handle errors from login
      if (!response.ok) {
        // Specifically check for the unverified therapist scenario
        if (data.message && data.message.includes("awaiting admin verification")) {
          setError("Your account is awaiting admin verification. Please wait for an admin to verify your account.");
          return;
        }
        setError(data.message || 'An error occurred.');
        return;
      }
      
      // Successful login handling
      if (isLogin) {
        localStorage.setItem('token', data.token);
        const decoded = jwtDecode(data.token);
        const userInfo = JSON.parse(decoded.sub);
        
        // Redirect based on role
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
      } else {
        setMessage(data.message || 'Registration successful.');
        setIsLogin(true);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    }
    
    setValues({
      role: '',
      username: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
      certNumber: '',
    });
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
        {/* Login Form */}
        {isLogin && (
          <>
            <form onSubmit={handleSubmit}>
              {error && <p className="error">{error}</p>}
              {message && <p className="message">{message}</p>}
              
              {/* Email Field */}
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
              
              {/* Password Field */}
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
              
              <button type="submit" className="login-button">Log In</button>
            </form>
            
            {/* Forgot Password Link */}
            <div className="forgot-password">
              <span onClick={() => switchForm('forgot')}>Forgot password?</span>
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
              <p className="reset-instructions">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
              <button type="submit" className="login-button">Send Reset Link</button>
            </form>
            
            <div className="forgot-password">
              <span onClick={() => switchForm('login')}>Back to login</span>
            </div>
          </>
        )}
        
        {/* Registration Form */}
        {!isLogin && !isForgotPassword && (
          <>
            <h2>Create Account</h2>
            {error && <p className="error">{error}</p>}
            {message && <p className="message">{message}</p>}
            
            <form onSubmit={handleSubmit}>
              {/* Role Selection */}
              <div className="input-group">
                <label>User Type</label>
                <select name="role" value={values.role} onChange={handleChange} required>
                  <option value="">Select User Type</option>
                  <option value="parent">Parent</option>
                  <option value="therapist">Therapist</option>
                  <option value="student">Student</option>
                </select>
              </div>
              
              {/* Email Field */}
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
              
              {/* Role-specific fields */}
              {/* Date of Birth only for students and parents */}
              {(values.role === 'student' || values.role === 'parent') && (
                <div className="input-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={values.dateOfBirth}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}
              
              {/* Certification Number only for therapists */}
              {values.role === 'therapist' && (
                <div className="input-group">
                  <label>Certification Number</label>
                  <input
                    type="text"
                    name="certNumber"
                    placeholder="Enter certification number"
                    value={values.certNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}
              
              {/* Password fields for registration */}
              <div className="input-group password-group">
                <label>Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter password"
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
              
              <div className="input-group password-group">
                <label>Confirm Password</label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm your password"
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
              
              <button type="submit" className="login-button">Create Account</button>
            </form>
            
            <div className="forgot-password">
              <span onClick={() => switchForm('login')}>Already have an account? Log in</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;