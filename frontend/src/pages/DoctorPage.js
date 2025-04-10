import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import "./design/TherapistPage.css";
import Availability from "./Availability";

const DoctorPage = () => {
  const [therapistInfo, setTherapistInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    firstName: "",
    lastName: "",
    gender: ""
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Menu items with icons
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg" width="20" height="20"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="9"></rect>
          <rect x="14" y="3" width="7" height="5"></rect>
          <rect x="14" y="12" width="7" height="9"></rect>
          <rect x="3" y="16" width="7" height="5"></rect>
        </svg>
      )
    },
    {
      id: "availability",
      label: "Availability",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg" width="20" height="20"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      )
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg" width="20" height="20"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      )
    },
    {
      id: "profile",
      label: "My Profile",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg" width="20" height="20"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8
                   a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    }
  ];

  // Fetch therapist info on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please log in as a therapist.");
      setLoading(false);
      return;
    }
    // Just decode to confirm we have a valid token (no need to rely on the sub data for showing the modal)
    try {
      const decoded = jwtDecode(token);
      // we won't do anything with 'decoded' besides confirming it's valid
    } catch (err) {
      console.error("Token decode error:", err);
      setError("Invalid token. Please log in again.");
      setLoading(false);
      return;
    }
    // Now fetch the actual profile from the server
    fetchTherapistDetails(token);
  }, []);

  const fetchTherapistDetails = async (token) => {
    try {
      const response = await fetch("http://localhost:3000/therapist/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) throw new Error("Failed to fetch therapist details");
      const data = await response.json();

      // Save it in state
      setTherapistInfo(data);
      setProfileFormData({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        gender: data.gender || ""
      });

      // Now that we have the server data, see if it's incomplete
      const isIncomplete =
        !data.first_name || !data.last_name || !data.gender;
      if (isIncomplete) {
        setShowProfileModal(true);
      }
    } catch (err) {
      console.error("Error fetching therapist details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Profile form input changes
  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData({ ...profileFormData, [name]: value });
  };

  // Save profile
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileError("");
    setProfileSuccess("");

    const { firstName, lastName, gender } = profileFormData;
    if (!firstName || !lastName || !gender) {
      setProfileError("All fields are required");
      setProfileSubmitting(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setProfileError("No token found. Please log in again.");
      setProfileSubmitting(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/therapist/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName,
          lastName,
          gender
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update profile");
      }
      const updatedData = await response.json();
      setTherapistInfo(updatedData);
      setProfileSuccess("Profile updated successfully!");

      // Dismiss modal once complete
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileSuccess("");
      }, 1500);
    } catch (err) {
      console.error("Error updating profile:", err);
      setProfileError(err.message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name =
      therapistInfo && therapistInfo.first_name
        ? `Dr. ${therapistInfo.first_name}`
        : "Doctor";

    if (hour < 12) return `Good Morning, ${name}`;
    if (hour < 17) return `Good Afternoon, ${name}`;
    return `Good Evening, ${name}`;
  };

  // Renders each tab’s content
  const renderMainContent = () => {
    switch (selectedTab) {
      case "dashboard":
        return (
          <div className="dashboard-section">
            <h1>Dashboard</h1>
            <p>Welcome to your therapist dashboard. Here you can see stats, reminders, or upcoming appointments.</p>
          </div>
        );
        case "availability":
          return <Availability />;
        
      case "appointments":
        return (
          <div className="appointments-section">
            <h1>Manage Appointments</h1>
            <p>View and manage your appointments with students/clients.</p>
            {/* Add your appointment logic */}
          </div>
        );
      case "profile":
        return (
          <div className="profile-section">
            <h1>My Profile</h1>
            <div className="profile-info-card">
              <div className="profile-header">
                <div className="profile-avatar">
                  {therapistInfo && therapistInfo.first_name && therapistInfo.last_name ? (
                    <div className="avatar-initials">
                      {therapistInfo.first_name.charAt(0)}
                      {therapistInfo.last_name.charAt(0)}
                    </div>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40" height="40"
                      viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1"
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8
                               a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  )}
                </div>
                <div>
                  <h2>
                    Dr. {therapistInfo?.first_name || ""}{" "}
                    {therapistInfo?.last_name || ""}
                  </h2>
                  <p className="profile-subtitle">Therapist</p>
                </div>
              </div>
              <div className="profile-details">
                <div className="profile-detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">
                    {therapistInfo?.username ?? "Not available"}
                  </span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">
                    {therapistInfo?.gender
                      ? therapistInfo.gender.charAt(0).toUpperCase() + therapistInfo.gender.slice(1)
                      : "Not specified"}
                  </span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Verification Status:</span>
                  <span className="detail-value">
                    <span
                      className={`status-badge ${
                        therapistInfo?.verified ? "available" : "pending"
                      }`}
                    >
                      {therapistInfo?.verified ? "Verified" : "Pending Verification"}
                    </span>
                  </span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Certification Number:</span>
                  <span className="detail-value">
                    {therapistInfo?.cert_number ?? "Not available"}
                  </span>
                </div>
              </div>
              <button className="edit-profile-button" onClick={() => setShowProfileModal(true)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14
                           a2 2 0 0 0 2 2h14
                           a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5
                           a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z">
                  </path>
                </svg>
                Edit Profile
              </button>
            </div>
          </div>
        );
      default:
        return <div>Unknown tab selected.</div>;
    }
  };

  // Modal for profile completion
  const ProfileSetupModal = () => {
    // If the server says we have all fields, we shouldn't show the modal
    // but let's confirm the user can close it if needed
    const isProfileComplete = !!(
      therapistInfo &&
      therapistInfo.first_name &&
      therapistInfo.last_name &&
      therapistInfo.gender
    );

    return (
      <div className={`modal ${showProfileModal ? "show" : ""}`}>
        <div className="modal-content profile-modal">
          {isProfileComplete && (
            <span className="close-button" onClick={() => setShowProfileModal(false)}>
              &times;
            </span>
          )}
          <h2>Complete Your Profile</h2>
          <p className="modal-intro">
            Please provide your information to complete your therapist profile. All fields are required.
          </p>
          {profileError && <div className="error-message">{profileError}</div>}
          {profileSuccess && <div className="success-message">{profileSuccess}</div>}

          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="firstName">First Name*</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profileFormData.firstName}
                  onChange={handleProfileInputChange}
                  required
                  placeholder="Enter your first name"
                />
              </div>
              <div className="input-group">
                <label htmlFor="lastName">Last Name*</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profileFormData.lastName}
                  onChange={handleProfileInputChange}
                  required
                  placeholder="Enter your last name"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="gender">Gender*</label>
                <select
                  id="gender"
                  name="gender"
                  value={profileFormData.gender}
                  onChange={handleProfileInputChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  {/* Add more if needed */}
                </select>
              </div>
            </div>
            <div className="form-submit">
              <button
                type="submit"
                className="submit-button"
                disabled={profileSubmitting}
              >
                {profileSubmitting ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="doctor-page">
      {loading ? (
        <div className="loader">Loading...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="side-menu">
            <p className="greeting">{getGreeting()}</p>
            <ul>
              {menuItems.map((item) => (
                <li
                  key={item.id}
                  className={selectedTab === item.id ? "active" : ""}
                  onClick={() => setSelectedTab(item.id)}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="main-content">{renderMainContent()}</div>
          <ProfileSetupModal />
        </>
      )}
    </div>
  );
};

export default DoctorPage;
