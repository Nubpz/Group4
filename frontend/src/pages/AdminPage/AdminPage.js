import React, { useEffect, useState } from "react";
import "../design/adminPage.css";
import HomeTab from "./HomeTab";
import ParentsTab from "./ParentsTab";
import StudentsTab from "./StudentsTab";
import TherapistsTab from "./TherapistsTab";
import AdminsTab from "./AdminsTab";
import MapComponent from '../../components/MapComponent';
import LocationsTab from "./LocationsTab";

// Sidebar menu definitions
const menuItems = [
    { id: "home",      label: "Home",       icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
    { id: "parent",    label: "Parents",    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
    { id: "student",   label: "Students",   icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> },
    { id: "therapist", label: "Therapists", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-6-4z"></path><path d="M14 2v4h4"></path><path d="M10 9h1v7"></path><path d="M14 9h-3"></path></svg> },
    { id: "admin",     label: "Admins",     icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> },
    { id: "locations", label: "Locations", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93l1.41 1.41"></path><path d="M17.66 17.66l1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M6.34 17.66l-1.41 1.41"></path><path d="M19.07 4.93l-1.41 1.41"></path></svg> },
];
  
  // Icons for page headers
const headerIcons = {
    home:      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
    parent:    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    student:   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>,
    therapist: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-6-4z"></path><path d="M14 2v4h4"></path><path d="M10 9h1v7"></path><path d="M14 9h-3"></path></svg>,
    admin:     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
};
  


const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("home");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshAnimating, setRefreshAnimating] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in as an admin.");
      const res = await fetch("http://localhost:3000/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (userId) =>
    setExpandedRows(prev => ({ ...prev, [userId]: !prev[userId] }));

  const verifyUser = async (userId, role) => {
    if (role !== "therapist") return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3000/admin/verify/${userId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Verify failed: ${res.statusText}`);
      setUsers(u => u.map(x => x.id === userId ? { ...x, verified: true } : x));
      setMessage(`Therapist ${userId} verified.`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };
  const handleViewTherapists = (therapistId) => {
    setSelectedTab("therapist");
    // expand exactly that one row
    setExpandedRows({ [therapistId]: true });
  };

  const unverifyUser = async (userId, role) => {
    if (role !== "therapist") return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3000/admin/unverify/${userId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Unverify failed: ${res.statusText}`);
      setUsers(u => u.map(x => x.id === userId ? { ...x, verified: false } : x));
      setMessage(`Therapist ${userId} unverified.`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRefreshClick = () => {
    setRefreshAnimating(true);
    fetchUsers();
    setTimeout(() => setRefreshAnimating(false), 500);
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning, Admin";
    if (hr < 18) return "Good Afternoon, Admin";
    return "Good Evening, Admin";
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "N/A";

  // summary stats for HomeTab:
  const totalUsers = users.length;
  const totalParents = users.filter(u => u.role==="parent").length;
  const totalStudents = users.filter(u => u.role==="student").length;
  const approvedTherapists = users.filter(u => u.role==="therapist" && u.verified).length;
  const pendingTherapists = users.filter(u => u.role==="therapist" && !u.verified).length;
  const pendingList = users.filter(u => u.role==="therapist" && !u.verified);
  const recentList = [...users]
    .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
    .slice(0,5);

  // filteredUsers for non‑home tabs:
  const filteredUsers = users
    .filter(u => selectedTab==="home" || u.role===selectedTab)
    .filter(u => {
      if (!searchTerm) return true;
      const t = searchTerm.toLowerCase();
      return (
        (u.first_name||"").toLowerCase().includes(t) ||
        (u.last_name||"").toLowerCase().includes(t) ||
        (u.username||"").toLowerCase().includes(t)
      );
    });

  return (
    <div className="admin-page">
      <div className="side-menu">
        <p className="greeting">{getGreeting()}</p>
        <ul>
          {menuItems.map(i => (
            <li
              key={i.id}
              className={selectedTab===i.id?"active":""}
              onClick={()=>setSelectedTab(i.id)}
            >
              <span className="menu-icon">{i.icon}</span>
              <span className="menu-label">{i.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="main-content">
        {selectedTab==="home" && (
          <HomeTab
            headerIcon={headerIcons.home}
            loading={loading}
            error={error}
            totalUsers={totalUsers}
            totalParents={totalParents}
            totalStudents={totalStudents}
            approvedTherapists={approvedTherapists}
            pendingTherapists={pendingTherapists}
            pendingList={pendingList}
            recentList={recentList}
            message={message}
            onRefresh={handleRefreshClick}
            refreshAnimating={refreshAnimating}
            onView={handleViewTherapists}
          />
        )}
        {selectedTab==="parent" && (
          <ParentsTab
            headerIcon={headerIcons.parent}
            users={filteredUsers}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            expandedRows={expandedRows}
            toggleRowExpansion={toggleRowExpansion}
            formatDate={formatDate}
          />
        )}
        {selectedTab==="student" && (
          <StudentsTab
            headerIcon={headerIcons.student}
            users={filteredUsers}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            expandedRows={expandedRows}
            toggleRowExpansion={toggleRowExpansion}
            formatDate={formatDate}
          />
        )}
        {selectedTab==="therapist" && (
          <TherapistsTab
            headerIcon={headerIcons.therapist}
            users={filteredUsers}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            expandedRows={expandedRows}
            toggleRowExpansion={toggleRowExpansion}
            verifyUser={verifyUser}
            unverifyUser={unverifyUser}
          />
        )}
        {selectedTab==="admin" && (
          <AdminsTab
            headerIcon={headerIcons.admin}
            users={filteredUsers}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            expandedRows={expandedRows}
            toggleRowExpansion={toggleRowExpansion}
          />
        )}
        {selectedTab === "locations" && (
          <LocationsTab />
        )}
      </div>
    </div>
  );
};

export default AdminPage;
