import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentProfileTab({ profile, onProfileUpdate }) {
  const [isEditing, setIsEditing] = useState(!profile?.isProfileComplete);
  const [updatedProfile, setUpdatedProfile] = useState({
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    dateOfBirth: profile?.DOB || "",
    phoneNumber: profile?.phone_number || "",
    email: profile?.username || "",
    gender: profile?.gender || ""
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setUpdatedProfile({
      ...updatedProfile,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/students/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          dateOfBirth: updatedProfile.dateOfBirth,
          phoneNumber: updatedProfile.phoneNumber,
          gender: updatedProfile.gender
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ text: "Profile updated successfully!", type: "success" });
        setIsEditing(false);
        onProfileUpdate({
          ...profile,
          first_name: updatedProfile.firstName,
          last_name: updatedProfile.lastName,
          DOB: updatedProfile.dateOfBirth,
          phone_number: updatedProfile.phoneNumber,
          gender: updatedProfile.gender,
          isProfileComplete: true
        });
      } else {
        setMessage({ text: data.message || "Failed to update profile", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "An error occurred while updating your profile", type: "error" });
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ text: "New passwords do not match", type: "error" });
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/students/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ text: "Password updated successfully!", type: "success" });
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setShowPasswordModal(false);
      } else {
        setMessage({ text: data.message || "Failed to update password", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "An error occurred while updating your password", type: "error" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleSetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const token = localStorage.getItem("token");
      try {
        await fetch("http://localhost:3000/users/update-location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ latitude, longitude }),
        });
        alert("Location updated!");
      } catch (err) {
        alert("Failed to update location.");
      }
    }, () => {
      alert("Unable to retrieve your location.");
    });
  };

  if (!profile) {
    return <p className="no-data">Loading profile information...</p>;
  }

  const getInitials = () => {
    return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
  };

  return (
    <div className="profile-tab">
      <h2>My Profile</h2>
      
      {!profile.isProfileComplete && (
        <div className="mandatory-message">
          Please complete your profile information to access other features.
        </div>
      )}
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {getInitials()}
          </div>
          <div className="profile-title">
            <h3>{profile.first_name} {profile.last_name}</h3>
            <p className="profile-email">{profile.username}</p>
          </div>
        </div>

        <div className="profile-details">
          <div className="profile-section">
            <h4>Personal Information</h4>
            {isEditing ? (
              <form className="profile-edit-form" onSubmit={handleProfileUpdate}>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={updatedProfile.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={updatedProfile.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={updatedProfile.dateOfBirth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={updatedProfile.phoneNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Gender</label>
                    <select
                      name="gender"
                      value={updatedProfile.gender}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Email (Cannot be changed)</label>
                    <input
                      type="email"
                      value={updatedProfile.email}
                      disabled
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="save-btn">Save Changes</button>
                  {profile.isProfileComplete && (
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <span className="info-label">Full Name</span>
                  <span className="info-value">{profile.first_name} {profile.last_name}</span>
                </div>
                <div className="profile-info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{profile.username}</span>
                </div>
                <div className="profile-info-item">
                  <span className="info-label">Date of Birth</span>
                  <span className="info-value">{profile.DOB}</span>
                </div>
                <div className="profile-info-item">
                  <span className="info-label">Phone Number</span>
                  <span className="info-value">{profile.phone_number || "Not provided"}</span>
                </div>
                <div className="profile-info-item">
                  <span className="info-label">Gender</span>
                  <span className="info-value">
                    {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "Not specified"}
                  </span>
                </div>
                <button 
                  className="edit-profile-btn"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
                <button onClick={handleSetLocation} style={{marginTop: 12}}>Set My Location</button>
              </div>
            )}
          </div>
        </div>

        {profile.isProfileComplete && (
          <div className="profile-section account-actions">
            <h4>Account Actions</h4>
            <div className="account-buttons">
              <button
                className="change-password-btn"
                onClick={() => setShowPasswordModal(true)}
              >
                Change Password
              </button>
              <button
                className="logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {profile.isProfileComplete && (
          <div className="profile-section">
            <h4>Parent/Guardian Information</h4>
            <p className="info-text">
              Your parents/guardians can view and manage your appointments. 
              To update this information, please contact the clinic administrator.
            </p>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Change Password</h2>
            {message.text && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}
            <form className="password-form" onSubmit={handlePasswordUpdate}>
              <div className="form-group">
                <label>Current Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
              </div>
              <div className="show-password-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  Show passwords
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn">Change Password</button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}