import React, { useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import './design/authPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [values, setValues] = useState({
    role: '',
    username: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',      // For Student registration
    password: '',
    confirmPassword: '',
    licenseNumber: '',    // For Therapist/Tutor registration
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

  // Calculate age from a DOB string in "YYYY-MM-DD" format
  const calculateAge = (dobString) => {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const trimmedUsername = values.username.trim();
    // In login mode, if username is not admin, ensure a role is selected.
    if (isLogin && trimmedUsername.toLowerCase() !== "admin" && !values.role) {
      setError('Please select a user type.');
      return;
    }

    // In login mode, if username is not admin, validate email format.
    if (isLogin && trimmedUsername.toLowerCase() !== "admin" && !validateEmail(trimmedUsername)) {
      setError('Invalid email format.');
      return;
    }
    // In registration mode, always validate email.
    if (!isLogin && !validateEmail(trimmedUsername)) {
      setError('Invalid email format.');
      return;
    }

    // Registration validations
    if (!isLogin) {
      if (!values.firstName.trim() || !values.lastName.trim()) {
        setError('Please enter your first and last name.');
        return;
      }
      if (values.role === 'Student') {
        if (!values.dateOfBirth) {
          setError('Please enter your Date of Birth.');
          return;
        }
        const age = calculateAge(values.dateOfBirth);
        if (age < 18) {
          setError('Students must be 18 or older to register.');
          return;
        }
      }
      if (values.password !== values.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (values.role === 'Therapist/Tutor' && !values.licenseNumber.trim()) {
        setError('Please enter your License/Certification Number.');
        return;
      }
      // Block admin registration from the client side.
      if (values.role === "Admin") {
        setError('Admin registration is not allowed.');
        return;
      }
    }

    // For login, if username is "admin", override role to "Admin"
    let roleForPayload = isLogin && trimmedUsername.toLowerCase() === "admin" ? "Admin" : values.role;

    const endpoint = isLogin
      ? 'http://localhost:3000/auth/login'
      : 'http://localhost:3000/auth/register';

    try {
      let payload;
      if (!isLogin) {
        // Registration payload (includes extra fields)
        payload = {
          role: values.role,
          username: trimmedUsername,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          dateOfBirth: values.role === 'Student' ? values.dateOfBirth : undefined,
          licenseNumber: values.role === 'Therapist/Tutor' ? values.licenseNumber : '',
        };
      } else {
        // Login payload only needs role, username, and password.
        payload = {
          role: roleForPayload,
          username: trimmedUsername,
          password: values.password,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'An error occurred.');
        return;
      }
      if (isLogin) {
        localStorage.setItem('token', data.token);
        const decoded = jwtDecode(data.token);
        const userInfo = JSON.parse(decoded.sub);
        if (userInfo.role === 'Parent') {
          navigate('/parents');
        } else if (userInfo.role === 'Therapist/Tutor') {
          navigate('/doctors');
        } else if (userInfo.role === 'Student') {
          navigate('/students');
        } else if (userInfo.role === 'Admin') {
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

    // Clear form fields
    setValues({
      role: '',
      username: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
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
          {/* Role Selection: In login mode, hide dropdown if username is admin */}
          {isLogin && values.username.trim().toLowerCase() !== "admin" && (
            <div className="input-group">
              <label>User Type</label>
              <select name="role" value={values.role} onChange={handleChange} required>
                <option value="">Select User Type</option>
                <option value="Parent">Parent</option>
                <option value="Therapist/Tutor">Therapist/Tutor</option>
                <option value="Student">Student</option>
              </select>
            </div>
          )}
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
          {/* Registration Mode: Additional Fields */}
          {!isLogin && (
            <>
              <div className="input-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Enter your first name"
                  value={values.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Enter your last name"
                  value={values.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              {values.role === 'Student' && (
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
              {values.role === 'Therapist/Tutor' && (
                <div className="input-group">
                  <label>License/Certification Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    placeholder="Enter license/cert. number"
                    value={values.licenseNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}
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
            </>
          )}
          {/* Password Field (common to both login and registration) */}
          <div className="input-group password-group">
            <label>Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
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
