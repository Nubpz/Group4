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
  //const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Fetch parent's profile on mount for greeting and profile tab
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    fetch("http://localhost:3000/parents/profile", {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
        } else {
          setError(data.message || "Failed to fetch profile data");
        }
      })
      .catch(() => setError("Failed to fetch profile data"));
  }, [navigate]);

  // Dynamic greeting using parent's first name if available
  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = "";
    if (hour < 12) greeting = "Good Morning";
    else if (hour < 18) greeting = "Good Afternoon";
    else greeting = "Good Evening";
    if (profile && profile.first_name) {
      greeting += `, ${profile.first_name}`;
    } else {
      greeting += ", Parent";
    }
    return greeting;
  };

  // Fetch data for the selected tab
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
    }
  }, [selectedTab, navigate]);

  // Render appointments grouped by upcoming and past
  const renderAppointments = () => {
    const now = new Date();
    const upcoming = appointments.filter(
      (app) => new Date(app.appointment_time) >= now
    );
    const past = appointments.filter(
      (app) => new Date(app.appointment_time) < now
    );
    return (
      <>
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
      </>
    );
  };

  // Render content based on selected tab
  const renderContent = () => {
    if (loading) return <p className="loader">Loading...</p>;
    if (error) return <p className="error">{error}</p>;

    switch (selectedTab) {
      case "accounts":
        return (
          <div className="accounts-tab">
            <h2>Children Accounts</h2>
            {childrenData.length === 0 ? (
              <p>No children linked to your account.</p>
            ) : (
              <table className="children-table">
                <thead>
                  <tr>
                    <th>S.N.</th>
                    <th>Name</th>
                    <th>Date of Birth</th>
                  </tr>
                </thead>
                <tbody>
                  {childrenData.map((child, index) => (
                    <tr key={child.id}>
                      <td>{index + 1}</td>
                      <td>{child.first_name} {child.last_name}</td>
                      <td>{child.date_of_birth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      case "appointments":
        return (
          <div className="appointments-tab">
            <h2>Appointments</h2>
            {appointments.length === 0 ? (
              <p>No appointments scheduled.</p>
            ) : (
              renderAppointments()
            )}
          </div>
        );
      case "profile":
        return (
          <div className="profile-tab">
            <h2>Your Profile</h2>
            {profile ? (
              <div className="profile-details">
                <p><strong>Email:</strong> {profile.username}</p>
                <p><strong>Name:</strong> {profile.first_name} {profile.last_name}</p>
                <p><strong>Date of Birth:</strong> {profile.date_of_birth}</p>
                {/* Additional profile options can be added here */}
                <button>Edit Profile</button>
              </div>
            ) : (
              <p>No profile data found.</p>
            )}
          </div>
        );
      default:
        return <p>Please select a tab.</p>;
    }
  };

  return (
    <div className="parents-page">
      <div className="side-menu">
        <p className="greeting">{getGreeting()}</p>
        <ul>
          <li
            className={selectedTab === "accounts" ? "active" : ""}
            onClick={() => setSelectedTab("accounts")}
          >
            Accounts
          </li>
          <li
            className={selectedTab === "appointments" ? "active" : ""}
            onClick={() => setSelectedTab("appointments")}
          >
            Appointments
          </li>
          <li
            className={selectedTab === "profile" ? "active" : ""}
            onClick={() => setSelectedTab("profile")}
          >
            Profile
          </li>
        </ul>
      </div>
      <div className="main-content">{renderContent()}</div>
    </div>
  );
};

export default ParentsPage;
