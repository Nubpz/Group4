import React, { useEffect, useState } from "react";
import "./design/adminPage.css";

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("home");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshAnimating, setRefreshAnimating] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  // Menu items with SVG icons
  const menuItems = [
    { 
      id: "home", 
      label: "Home", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
    },
    { 
      id: "parent", 
      label: "Parents", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    },
    { 
      id: "student", 
      label: "Students", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
    },
    { 
      id: "therapist", 
      label: "Therapists", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-6-4z"></path><path d="M14 2v4h4"></path><path d="M10 9h1v7"></path><path d="M14 9h-3"></path></svg>
    },
    { 
      id: "admin", 
      label: "Admins", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    }
  ];

  // Header icons for each section
  const headerIcons = {
    home: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
    parent: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    student: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>,
    therapist: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-6-4z"></path><path d="M14 2v4h4"></path><path d="M10 9h1v7"></path><path d="M14 9h-3"></path></svg>,
    admin: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning, Admin";
    else if (hour < 18) return "Good Afternoon, Admin";
    else return "Good Evening, Admin";
  };

  const fetchUsers = async () => {
    console.log("Fetching users...");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in as an admin.");
      
      const response = await fetch("http://localhost:3000/admin/users", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(
          `Failed to fetch user data: ${response.status} - ${response.statusText}`
        );
      }
      
      const data = await response.json();
      console.log("Fetched users:", data.users);
      setUsers(data.users);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rest of your component methods...
  // (verifyUser, unverifyUser, toggleRowExpansion, etc.)

  // Toggle row expansion
  const toggleRowExpansion = (userId) => {
    setExpandedRows(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Format date to a readable format
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString || "N/A";
    }
  };

  const filteredUsers = users
    .filter(user => {
      // For "home", show all users; for others, filter by role.
      if (selectedTab === "home") return true;
      return user.role.toLowerCase() === selectedTab;
    })
    .filter(user => {
      if (!searchTerm) return true;
      const lowerTerm = searchTerm.toLowerCase();
      return (
        (user.first_name || "").toLowerCase().includes(lowerTerm) ||
        (user.last_name || "").toLowerCase().includes(lowerTerm) ||
        (user.username || "").toLowerCase().includes(lowerTerm)
      );
    });

  const totalUsers = users.length;
  const totalParents = users.filter(user => user.role.toLowerCase() === "parent").length;
  const totalStudents = users.filter(user => user.role.toLowerCase() === "student").length;
  const approvedTherapists = users.filter(user => user.role.toLowerCase() === "therapist" && user.verified).length;
  const pendingTherapists = users.filter(user => user.role.toLowerCase() === "therapist" && !user.verified).length;
  const pendingTherapistsList = users.filter(user =>
    user.role.toLowerCase() === "therapist" && !user.verified
  );
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const handleViewTherapists = () => {
    setSelectedTab("therapist");
  };

  const handleRefreshClick = () => {
    setRefreshAnimating(true);
    fetchUsers();
    setTimeout(() => setRefreshAnimating(false), 500);
  };

  // Get the full name of a user
  const getFullName = (user) => {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A';
  };

  const verifyUser = async (userId, role) => {
    try {
      const token = localStorage.getItem("token");
      // Only therapists need verification actions.
      if (role.toLowerCase() !== "therapist") return;
      
      const response = await fetch(`http://localhost:3000/admin/verify/${userId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      if (!response.ok)
        throw new Error(
          `Failed to verify user: ${response.status} - ${response.statusText}`
        );
      await response.json();
      setMessage(`User ${userId} verified.`);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId && user.role.toLowerCase() === "therapist"
            ? { ...user, verified: true }
            : user
        )
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Verify error:", err);
      setError(err.message);
    }
  };

  const unverifyUser = async (userId, role) => {
    try {
      const token = localStorage.getItem("token");
      if (role.toLowerCase() !== "therapist") return;
      const response = await fetch(`http://localhost:3000/admin/unverify/${userId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      if (!response.ok)
        throw new Error(
          `Failed to unverify user: ${response.status} - ${response.statusText}`
        );
      await response.json();
      setMessage(`User ${userId} unverified.`);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId && user.role.toLowerCase() === "therapist"
            ? { ...user, verified: false }
            : user
        )
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Unverify error:", err);
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="side-menu">
        <p className="greeting">{getGreeting()}</p>
        <ul>
          {menuItems.map(item => (
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
      <div className="main-content">
        {selectedTab === "home" ? (
          <div className="home-dashboard">
            <div className="dashboard-header">
              <h1>
                <span className="header-icon">{headerIcons.home}</span> 
                <span>Admin Home</span>
              </h1>
              <span
                className={`refresh-icon ${refreshAnimating ? "rotate" : ""}`}
                onClick={handleRefreshClick}
                title="Refresh Data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              </span>
            </div>
            <div className="cards-container">
              <div className="card">
                <h2>Total Users</h2>
                <p>{totalUsers}</p>
              </div>
              <div className="card">
                <h2>Total Parents</h2>
                <p>{totalParents}</p>
              </div>
              <div className="card">
                <h2>Total Students</h2>
                <p>{totalStudents}</p>
              </div>
              <div className="card">
                <h2>Approved Therapists</h2>
                <p>{approvedTherapists}</p>
              </div>
              <div className="card pending">
                <h2>Pending Therapists</h2>
                <p>{pendingTherapists}</p>
              </div>
            </div>
            {pendingTherapists > 0 && (
              <>
                <h2 style={{ marginTop: "30px" }}>Pending Therapists</h2>
                <PendingTherapistsTable users={pendingTherapistsList} onView={handleViewTherapists} />
              </>
            )}
            <div className="recent-section">
              <h2>Recent Registrations</h2>
              <RecentTable users={recentUsers} />
            </div>
          </div>
        ) : (
          <>
            <h1>
              <span className="header-icon">{headerIcons[selectedTab]}</span> 
              <span>{selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)} List</span>
            </h1>
            {selectedTab === "therapist" && message && (
              <p className="message">{message}</p>
            )}
            <div className="search-box">
              <span className="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {loading ? (
              <p className="loader">Loading...</p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : (
              <table className="user-table">
                <thead>
                  <tr>
                    <th>S.N.</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Gender</th>
                    {/* Show DOB for parents and students */}
                    {(selectedTab === "parent" || selectedTab === "student") && <th>Date of Birth</th>}
                    {/* Show Certification for therapists */}
                    {selectedTab === "therapist" && <th>Certification</th>}
                    {/* Show verification status for therapists */}
                    {selectedTab === "therapist" && <th>Status</th>}
                    {/* Only show Action for therapists */}
                    {selectedTab === "therapist" && <th>Action</th>}
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => (
                      <React.Fragment key={user.id}>
                        <tr>
                          <td>{index + 1}</td>
                          <td>{getFullName(user)}</td>
                          <td>{user.username}</td>
                          <td>{user.gender || "Not specified"}</td>
                          {/* Show DOB for parents and students */}
                          {(selectedTab === "parent" || selectedTab === "student") && 
                            <td>{formatDate(user.dob)}</td>
                          }
                          {/* Show Certification for therapists */}
                          {selectedTab === "therapist" && 
                            <td>{user.certNumber || "N/A"}</td>
                          }
                          {/* Show verification status for therapists */}
                          {selectedTab === "therapist" && 
                            <td>{user.verified ? "Verified" : "Pending"}</td>
                          }
                          {/* Only show Action for therapists */}
                          {selectedTab === "therapist" && (
                            <td>
                              {user.verified ? (
                                <button onClick={() => unverifyUser(user.id, user.role)}>Unverify</button>
                              ) : (
                                <button onClick={() => verifyUser(user.id, user.role)}>Verify</button>
                              )}
                            </td>
                          )}
                          <td>
                            <span 
                              className={`expand-arrow ${expandedRows[user.id] ? 'expanded' : ''}`}
                              onClick={() => toggleRowExpansion(user.id)}
                            >
                              {expandedRows[user.id] ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                              )}
                            </span>
                          </td>
                        </tr>
                        {expandedRows[user.id] && (
                          <tr className="expanded-row">
                            <td colSpan={
                              selectedTab === "therapist" ? "9" : 
                              (selectedTab === "parent" || selectedTab === "student") ? "6" : "5"
                            }>
                              <div className="expanded-content">
                                <h4>Detailed Information</h4>
                                <div className="detail-grid">
                                  <div className="detail-item">
                                    <strong>User ID:</strong> {user.id}
                                  </div>
                                  
                                  {/* Role-specific details that aren't already in the main table */}
                                  {user.role === 'parent' && (
                                    <div className="detail-item">
                                      <strong>Children:</strong> {user.children_names || "No children linked"}
                                    </div>
                                  )}
                                  
                                  {user.role === 'student' && (
                                    <div className="detail-item">
                                      <strong>Guardians:</strong> {user.guardian_info || "No guardian linked"}
                                    </div>
                                  )}
                                  
                                  {/* Phone number if available */}
                                  {user.phone_number && (
                                    <div className="detail-item">
                                      <strong>Phone:</strong> {user.phone_number}
                                    </div>
                                  )}

                                  {/* Registration date with time */}
                                  <div className="detail-item">
                                    <strong>Registered:</strong> {new Date(user.created_at).toLocaleString()}
                                  </div>
                                  
                                  {/* Role */}
                                  <div className="detail-item">
                                    <strong>Role:</strong> {user.role}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={
                        selectedTab === "therapist" ? "9" : 
                        (selectedTab === "parent" || selectedTab === "student") ? "6" : "5"
                      }>No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const RecentTable = ({ users }) => {
  return (
    <table className="recent-table">
      <thead>
        <tr>
          <th>S.N.</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Email</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {users.length > 0 ? (
          users.map((user, index) => (
            <tr key={user.id}>
              <td>{index + 1}</td>
              <td>{user.first_name}</td>
              <td>{user.last_name}</td>
              <td>{user.username}</td>
              <td>{new Date(user.created_at).toLocaleString()}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="5">No recent registrations</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

const PendingTherapistsTable = ({ users, onView }) => {
  return (
    <table className="pending-table">
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Name</th>
          <th>Email</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {users.length > 0 ? (
          users.map((user, index) => (
            <tr key={user.id}>
              <td>{index + 1}</td>
              <td>{`${user.first_name} ${user.last_name}`}</td>
              <td>{user.username}</td>
              <td>
                <button className="view-button" onClick={onView}>View</button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="4">No pending therapists found</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default AdminPage;