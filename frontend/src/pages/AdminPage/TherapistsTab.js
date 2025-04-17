// src/pages/AdminPage/TherapistsTab.jsx
import React from "react";

const TherapistsTab = ({
  headerIcon,
  users,
  loading,
  error,
  searchTerm,
  setSearchTerm,
  expandedRows,
  toggleRowExpansion,
  verifyUser,
  unverifyUser,
}) => (
  <div className="therapists-tab">
    {/* Header */}
    <div className="dashboard-header">
      <h1>
        <span className="header-icon">{headerIcon}</span>
        Therapists
      </h1>
    </div>

    {/* Search Box */}
    <div className="search-box">
      <span className="search-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </span>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
    </div>

    {/* Loading / Error */}
    {loading && <p className="loader">Loading...</p>}
    {error   && <p className="error">{error}</p>}

    {/* Therapists Table */}
    <table className="user-table">
      <thead>
        <tr>
          <th>S.N.</th>
          <th>Full Name</th>
          <th>Email</th>
          <th>Certification</th>
          <th>Status</th>
          <th>Action</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {users.length > 0 ? users.map((user, idx) => (
          <React.Fragment key={user.id}>
            <tr>
              <td>{idx + 1}</td>
              <td>{`${user.first_name} ${user.last_name}`}</td>
              <td>{user.username}</td>
              <td>{user.certNumber || "N/A"}</td>
              <td>{user.verified ? "Verified" : "Pending"}</td>
              <td>
                {user.verified
                  ? <button onClick={() => unverifyUser(user.id, user.role)}>Unverify</button>
                  : <button onClick={() => verifyUser(user.id, user.role)}>Verify</button>
                }
              </td>
              <td>
                <span
                  className={`expand-arrow ${expandedRows[user.id] ? "expanded" : ""}`}
                  onClick={() => toggleRowExpansion(user.id)}
                >
                  {/* single chevron-up icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                       viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </td>
            </tr>

            {expandedRows[user.id] && (
              <tr className="expanded-row">
                <td colSpan="7">
                  <div className="expanded-content">
                    <h4>Detailed Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>User ID:</strong> {user.id}
                      </div>
                      <div className="detail-item">
                        <strong>Email:</strong> {user.username}
                      </div>
                      <div className="detail-item">
                        <strong>Registered:</strong>{" "}
                        {new Date(user.created_at).toLocaleString()}
                      </div>
                      <div className="detail-item">
                        <strong>Role:</strong> {user.role}
                      </div>
                      {user.phone_number && (
                        <div className="detail-item">
                          <strong>Phone:</strong> {user.phone_number}
                        </div>
                      )}
                      <div className="detail-item">
                        <strong>Verified:</strong> {user.verified ? "Yes" : "No"}
                      </div>
                      {/* add more fields as needed */}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        )) : (
          <tr><td colSpan="7">No therapists found</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

export default TherapistsTab;
