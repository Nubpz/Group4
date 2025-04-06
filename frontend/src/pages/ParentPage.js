import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./design/parentsPage.css";

const ParentsPage = () => {
  const [selectedTab, setSelectedTab] = useState("accounts");
  const [childrenData, setChildrenData] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newChild, setNewChild] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: ""
  });
  const navigate = useNavigate();

  // Fetch parent's profile on mount (for greeting and Profile tab)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    setLoading(true);
    fetch("http://localhost:3000/parents/profile", {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched profile:", data);
        if (data.profile) {
          setProfile(data.profile);
        } else {
          setError(data.message || "Failed to fetch profile data");
        }
      })
      .catch((err) => {
        console.error("Error fetching profile:", err);
        setError("Failed to fetch profile data");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Dynamic greeting using parent's first name if available
  const getGreeting = () => {
    const hour = new Date().getHours();
    const greeting =
      hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    return profile && profile.first_name
      ? `${greeting}, ${profile.first_name}`
      : `${greeting}, Parent`;
  };

  // Fetch data for selected tab (Accounts or Appointments)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    setError("");
    setLoading(true);
    if (selectedTab === "accounts") {
      fetch("http://localhost:3000/parents/children", {
        headers: { "Authorization": `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.children) {
            setChildrenData(data.children);
          } else {
            setError(data.message || "Failed to fetch children data");
          }
        })
        .catch(() => setError("Failed to fetch children data"))
        .finally(() => setLoading(false));
    } else if (selectedTab === "appointments") {
      fetch("http://localhost:3000/parents/appointments", {
        headers: { "Authorization": `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.appointments) {
            setAppointments(data.appointments);
          } else {
            setError(data.message || "Failed to fetch appointments");
          }
        })
        .catch(() => setError("Failed to fetch appointments"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [selectedTab, navigate]);

  // Modal handlers for Add Child
  const handleAddChildClick = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setNewChild({ firstName: "", lastName: "", dateOfBirth: "" });
  };

  const handleChildInputChange = (e) => {
    setNewChild({ ...newChild, [e.target.name]: e.target.value });
  };

  const handleAddChildSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to add a child.");
      return;
    }
    if (!newChild.firstName || !newChild.lastName || !newChild.dateOfBirth) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const response = await fetch("http://localhost:3000/parents/children", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newChild)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to add child.");
        return;
      }
      setChildrenData([...childrenData, data.child]);
      closeModal();
    } catch (err) {
      setError("Failed to add child.");
    }
  };

  // Render Accounts tab as children cards
  const renderAccounts = () => (
    <div className="accounts-tab">
      <div className="accounts-header">
        <h2>Children Accounts</h2>
        <button className="add-child-btn" onClick={handleAddChildClick}>
          Add Child
        </button>
      </div>
      {childrenData.length === 0 ? (
        <p>No children linked to your account.</p>
      ) : (
        <div className="children-cards">
          {childrenData.map((child) => {
            const initials = `${child.first_name.charAt(0)}${child.last_name.charAt(0)}`.toUpperCase();
            return (
              <div key={child.id} className="child-card">
                <div className="child-avatar">{initials}</div>
                <div className="child-info">
                  <p className="child-name">{child.first_name} {child.last_name}</p>
                  <p className="child-dob">{child.date_of_birth}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render Appointments tab as tables grouped by upcoming and past
  const renderAppointments = () => {
    const now = new Date();
    const upcoming = appointments.filter(
      (app) => new Date(app.appointment_time) >= now
    );
    const past = appointments.filter(
      (app) => new Date(app.appointment_time) < now
    );
    return (
      <div className="appointments-tab">
        <h2>Appointments</h2>
        <div className="appointments-group">
          <h3>Upcoming Appointments</h3>
          {upcoming.length === 0 ? (
            <p>No upcoming appointments.</p>
          ) : (
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Therapist</th>
                  <th>Child</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((app, index) => (
                  <tr key={app.id}>
                    <td>{index + 1}</td>
                    <td>{new Date(app.appointment_time).toLocaleDateString()}</td>
                    <td>{new Date(app.appointment_time).toLocaleTimeString()}</td>
                    <td>{app.therapist_name}</td>
                    <td>{app.child_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="appointments-group">
          <h3>Past Appointments</h3>
          {past.length === 0 ? (
            <p>No past appointments.</p>
          ) : (
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Therapist</th>
                  <th>Child</th>
                </tr>
              </thead>
              <tbody>
                {past.map((app, index) => (
                  <tr key={app.id}>
                    <td>{index + 1}</td>
                    <td>{new Date(app.appointment_time).toLocaleDateString()}</td>
                    <td>{new Date(app.appointment_time).toLocaleTimeString()}</td>
                    <td>{app.therapist_name}</td>
                    <td>{app.child_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // Render Profile tab content
  const renderProfile = () => (
    <div className="profile-tab">
      <h2>Your Profile</h2>
      {profile ? (
        <div className="profile-details">
          <p><strong>Email:</strong> {profile.username}</p>
          <p><strong>Name:</strong> {profile.first_name} {profile.last_name}</p>
          {profile.date_of_birth && (
            <p><strong>Date of Birth:</strong> {profile.date_of_birth}</p>
          )}
          <button className="edit-profile-btn">Edit Profile</button>
        </div>
      ) : (
        <p>No profile data found.</p>
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) return <p className="loader">Loading...</p>;
    if (error) return <p className="error">{error}</p>;
    switch (selectedTab) {
      case "accounts":
        return renderAccounts();
      case "appointments":
        return renderAppointments();
      case "profile":
        return renderProfile();
      default:
        return <p>Please select a tab.</p>;
    }
  };

  return (
    <div className="parents-page">
      <div className="side-menu">
        <p className="greeting">{getGreeting()}</p>
        <ul>
          <li className={selectedTab === "accounts" ? "active" : ""} onClick={() => setSelectedTab("accounts")}>
            Accounts
          </li>
          <li className={selectedTab === "appointments" ? "active" : ""} onClick={() => setSelectedTab("appointments")}>
            Appointments
          </li>
          <li className={selectedTab === "profile" ? "active" : ""} onClick={() => setSelectedTab("profile")}>
            Profile
          </li>
        </ul>
      </div>
      <div className="main-content">
        {renderContent()}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Child</h2>
            <form onSubmit={handleAddChildSubmit}>
              <div className="input-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Child's first name"
                  value={newChild.firstName}
                  onChange={handleChildInputChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Child's last name"
                  value={newChild.lastName}
                  onChange={handleChildInputChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={newChild.dateOfBirth}
                  onChange={handleChildInputChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="modal-btn">Add Child</button>
                <button type="button" className="modal-btn cancel-btn" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentsPage;