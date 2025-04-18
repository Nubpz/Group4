import React, { useState } from "react";

export default function ProfileCompletionModal({ profile, onSave, onClose }) {
  const [updatedProfile, setUpdatedProfile] = useState({
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    dateOfBirth: profile?.DOB || "",
    phoneNumber: profile?.phone_number || "",
    gender: profile?.gender || ""
  });
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleInputChange = (e) => {
    setUpdatedProfile({
      ...updatedProfile,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
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
        onSave({
          ...profile,
          first_name: updatedProfile.firstName,
          last_name: updatedProfile.lastName,
          DOB: updatedProfile.dateOfBirth,
          phone_number: updatedProfile.phoneNumber,
          gender: updatedProfile.gender,
          isProfileComplete: true
        });
        setTimeout(onClose, 1000); // Close modal after 1s to show success
      } else {
        setMessage({ text: data.message || "Failed to update profile", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "An error occurred while updating your profile", type: "error" });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Complete Your Profile</h2>
        <p className="mandatory-message">
          Please fill in all required fields to continue using the application.
        </p>
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        <form className="profile-edit-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={updatedProfile.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
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
              <label>Date of Birth *</label>
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
              <label>Gender *</label>
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
                value={profile?.username || ""}
                disabled
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="save-btn">Save Profile</button>
          </div>
        </form>
      </div>
    </div>
  );
}