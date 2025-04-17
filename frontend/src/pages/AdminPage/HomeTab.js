// src/pages/AdminPage/HomeTab.jsx
import React from "react";
import PendingTherapistsTable from "./PendingTherapistsTable";
import RecentTable              from "./RecentTable";

const HomeTab = ({
  headerIcon,
  loading,
  error,
  totalUsers,
  totalParents,
  totalStudents,
  approvedTherapists,
  pendingTherapists,
  pendingList,
  recentList,
  onRefresh,
  refreshAnimating,
  onView       // ⬅️ this is the prop you passed from AdminPage.jsx
}) => (
  <div className="home-dashboard">
    <div className="dashboard-header">
      <h1>
        <span className="header-icon">{headerIcon}</span>
        <span>Admin Home</span>
      </h1>
      <span
        className={`refresh-icon ${refreshAnimating ? "rotate" : ""}`}
        onClick={onRefresh}
        title="Refresh Data"
      >
        {/* your refresh SVG here */}
      </span>
    </div>

    {loading && <p className="loader">Loading...</p>}
    {error   && <p className="error">{error}</p>}

    <div className="cards-container">
      <div className="card"><h2>Total Users</h2><p>{totalUsers}</p></div>
      <div className="card"><h2>Total Parents</h2><p>{totalParents}</p></div>
      <div className="card"><h2>Total Students</h2><p>{totalStudents}</p></div>
      <div className="card"><h2>Approved Therapists</h2><p>{approvedTherapists}</p></div>
      <div className="card pending"><h2>Pending Therapists</h2><p>{pendingTherapists}</p></div>
    </div>

    {pendingTherapists > 0 && (
      <>
        <h2 style={{ marginTop: 30 }}>Pending Therapists</h2>
        {/* Forward the same `onView` prop you received */}
        <PendingTherapistsTable users={pendingList} onView={onView} />
      </>
    )}

    <div className="recent-section">
      <h2>Recent Registrations</h2>
      <RecentTable users={recentList} />
    </div>
  </div>
);

export default HomeTab;
