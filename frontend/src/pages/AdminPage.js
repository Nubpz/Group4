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

  const verifyUser = async (userId) => {
    try {
      const token = localStorage.getItem("token");
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
      const updatedUser = users.find(user => user.id === userId);
      setMessage(`User ${updatedUser.first_name} verified.`);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, verified: true } : user
        )
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Verify error:", err);
      setError(err.message);
    }
  };

  const unverifyUser = async (userId) => {
    try {
      const token = localStorage.getItem("token");
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
      const updatedUser = users.find(user => user.id === userId);
      setMessage(`User ${updatedUser.first_name} unverified.`);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, verified: false } : user
        )
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Unverify error:", err);
      setError(err.message);
    }
  };

  const filteredUsers = users
    .filter(user => {
      const role = (user.role || "").toLowerCase();
      if (selectedTab === "students") return role === "student";
      if (selectedTab === "parents") return role === "parent";
      if (selectedTab === "therapists") return role === "therapist/tutor";
      return false;
    })
    .filter(user => {
      if (!searchTerm) return true;
      const lowerTerm = searchTerm.toLowerCase();
      const firstName = (user.first_name || "").toLowerCase();
      const lastName = (user.last_name || "").toLowerCase();
      const email = (user.username || "").toLowerCase();
      return (
        firstName.includes(lowerTerm) ||
        lastName.includes(lowerTerm) ||
        email.includes(lowerTerm)
      );
    });

  const totalUsers = users.length;
  const totalParents = users.filter(user => (user.role || "").toLowerCase() === "parent").length;
  const totalStudents = users.filter(user => (user.role || "").toLowerCase() === "student").length;
  const approvedTherapists = users.filter(user => (user.role || "").toLowerCase() === "therapist/tutor" && user.verified).length;
  const pendingTherapists = users.filter(user => (user.role || "").toLowerCase() === "therapist/tutor" && !user.verified).length;
  const pendingTherapistsList = users.filter(user =>
    (user.role || "").toLowerCase() === "therapist/tutor" && !user.verified
  );
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const handleViewTherapists = () => {
    setSelectedTab("therapists");
  };

  const handleRefreshClick = () => {
    setRefreshAnimating(true);
    fetchUsers();
    setTimeout(() => setRefreshAnimating(false), 500);
  };

  return (
    <div className="admin-page">
      <div className="side-menu">
        <p className="greeting">{getGreeting()}</p>
        <ul>
          <li className={selectedTab === "home" ? "active" : ""} onClick={() => setSelectedTab("home")}>Home</li>
          <li className={selectedTab === "students" ? "active" : ""} onClick={() => setSelectedTab("students")}>Students</li>
          <li className={selectedTab === "parents" ? "active" : ""} onClick={() => setSelectedTab("parents")}>Parents</li>
          <li className={selectedTab === "therapists" ? "active" : ""} onClick={() => setSelectedTab("therapists")}>Therapists/Tutors</li>
        </ul>
      </div>
      <div className="main-content">
        {selectedTab === "home" ? (
          <div className="home-dashboard">
            <div className="dashboard-header">
              <h1>Admin Home</h1>
              <span
                className={`refresh-icon ${refreshAnimating ? "rotate" : ""}`}
                onClick={handleRefreshClick}
                title="Refresh Data"
              >
                &#x21bb;
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
            <h1>{selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)} List</h1>
            {selectedTab === "therapists" && message && (
              <p className="message">{message}</p>
            )}
            <div className="search-box">
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
              <UserTable
                users={filteredUsers}
                verifyUser={verifyUser}
                unverifyUser={unverifyUser}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

const UserTable = ({ users, verifyUser, unverifyUser }) => {
  return (
    <table className="user-table">
      <thead>
        <tr>
          <th>S.N.</th>
          <th>ID</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Email</th>
          <th>Verified</th>
          <th>License Number</th>
          <th>Created At</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {users.length > 0 ? (
          users.map((user, index) => (
            <tr key={user.id}>
              <td>{index + 1}</td>
              <td>{user.id}</td>
              <td>{user.first_name}</td>
              <td>{user.last_name}</td>
              <td>{user.username}</td>
              <td>{user.verified ? "Yes" : "No"}</td>
              <td>{user.license_number ? user.license_number : "N/A"}</td>
              <td>{new Date(user.created_at).toLocaleString()}</td>
              <td>
                {user.role.toLowerCase() === "therapist/tutor" ? (
                  user.verified ? (
                    <button onClick={() => unverifyUser(user.id)}>Unverify</button>
                  ) : (
                    <button onClick={() => verifyUser(user.id)}>Verify</button>
                  )
                ) : (
                  "Verified"
                )}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="9">No users found</td>
          </tr>
        )}
      </tbody>
    </table>
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
