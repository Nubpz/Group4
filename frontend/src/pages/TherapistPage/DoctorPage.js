// src/pages/DoctorPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../design/therapistPageCss/TherapistPage.css";
import Availability from "./Availability";
import Appointments from "./Appointments";
import TDashboard from "./Tdashboard";

const DoctorPage = () => {
  const [therapistInfo, setTherapistInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "",
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationSuccess, setLocationSuccess] = useState("");
  const navigate = useNavigate();

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="9"></rect>
          <rect x="14" y="3" width="7" height="5"></rect>
          <rect x="14" y="12" width="7" height="9"></rect>
          <rect x="3" y="16" width="7" height="5"></rect>
        </svg>
      ),
    },
    {
      id: "availability",
      label: "My Availability",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
    },
    {
      id: "appointments",
      label: "Client Appointments",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      ),
    },
    {
      id: "profile",
      label: "My Profile",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
    },
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please log in as a therapist.");
      setLoading(false);
      return;
    }
    fetchTherapistDetails(token);
  }, []);

  const fetchTherapistDetails = async (token) => {
    try {
      const response = await fetch("http://localhost:3000/therapist/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch therapist details");
      const data = await response.json();

      setTherapistInfo(data);
      setProfileFormData({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        gender: data.gender || "",
      });

      const isIncomplete = !data.first_name || !data.last_name || !data.gender;
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

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData({ ...profileFormData, [name]: value });
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          gender,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update profile");
      }
      const updatedData = await response.json();
      setTherapistInfo(updatedData);
      setProfileSuccess("Profile updated successfully!");

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

  const handleSetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setLocationError("No token found. Please log in again.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Geolocation coordinates:", { latitude, longitude });
        try {
          const res = await fetch("http://localhost:3000/user/location", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Failed to update location");
          }
          setLocationSuccess("Location updated successfully!");
          setLocationError("");
          setTherapistInfo((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));
          setTimeout(() => setLocationSuccess(""), 3000);
        } catch (err) {
          console.error("Error updating location:", err);
          setLocationError(err.message);
          setLocationSuccess("");
        }
      },
      (err) => {
        setLocationError(`Geolocation error: ${err.message}`);
        setLocationSuccess("");
      }
    );
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

  const renderMainContent = () => {
    switch (selectedTab) {
      case "dashboard":
        return <TDashboard therapistInfo={therapistInfo} />;
      case "availability":
        return <Availability />;
      case "appointments":
        return <Appointments />;
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
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
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
                <div className="profile-detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">
                    {therapistInfo?.latitude && therapistInfo?.longitude
                      ? `${therapistInfo.latitude}, ${therapistInfo.longitude}`
                      : "Not set"}
                  </span>
                </div>
              </div>
              {locationError && <p className="error">{locationError}</p>}
              {locationSuccess && <p className="message">{locationSuccess}</p>}
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  className="edit-profile-button"
                  onClick={() => setShowProfileModal(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    transition: "background-color 0.3s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0056b3")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#007bff")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Profile
                </button>
                <button
                  className="set-location-button"
                  onClick={handleSetLocation}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    backgroundColor: "#52b788",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    transition: "background-color 0.3s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#40916c")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#52b788")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Set my Location
                </button>
                <button
                  className="logout-button"
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    backgroundColor: "#ff4d4d",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    transition: "background-color 0.3s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#cc0000")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ff4d4d")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <div>Unknown tab selected.</div>;
    }
  };

  const ProfileSetupModal = () => {
    return (
      <div className={`modal ${showProfileModal ? "show" : ""}`}>
        <div className="modal-content profile-modal">
          <span
            className="close-button"
            onClick={() => setShowProfileModal(false)}
            style={{
              position: "absolute",
              top: "10px",
              right: "15px",
              fontSize: "24px",
              cursor: "pointer",
              color: "#333",
              fontWeight: "bold",
            }}
          >
            ×
          </span>
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

  const LogoutConfirmModal = () => {
    return (
      <div className={`modal ${showLogoutConfirm ? "show" : ""}`}>
        <div className="modal-content" style={{ maxWidth: "400px", padding: "20px" }}>
          <span
            className="close-button"
            onClick={cancelLogout}
            style={{
              position: "absolute",
              top: "10px",
              right: "15px",
              fontSize: "24px",
              cursor: "pointer",
              color: "#333",
              fontWeight: "bold",
            }}
          >
            ×
          </span>
          <h2 style={{ marginBottom: "1rem" }}>Confirm Logout</h2>
          <p style={{ marginBottom: "1.5rem", color: "#333" }}>
            Are you sure you want to log out?
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              onClick={cancelLogout}
              style={{
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                transition: "background-color 0.3s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#5a6268")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#6c757d")}
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              style={{
                backgroundColor: "#ff4d4d",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                transition: "background-color 0.3s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#cc0000")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ff4d4d")}
            >
              Yes, Log Out
            </button>
          </div>
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
          <LogoutConfirmModal />
        </>
      )}
    </div>
  );
};

export default DoctorPage;