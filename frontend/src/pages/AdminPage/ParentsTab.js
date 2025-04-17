// src/pages/AdminPage/ParentsTab.jsx
import React from "react";

const ParentsTab = ({
  headerIcon,
  users,
  loading,
  error,
  searchTerm,
  setSearchTerm,
  expandedRows,
  toggleRowExpansion,
  formatDate
}) => {
  return (
    <div className="parents-tab">
      {/* Header */}
      <div className="dashboard-header">
        <h1>
          <span className="header-icon">{headerIcon}</span>
          Parents
        </h1>
      </div>

      {/* Search Box */}
      <div className="search-box">
        <span className="search-icon">
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
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search parents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Loading / Error */}
      {loading && <p className="loader">Loading...</p>}
      {error && <p className="error">{error}</p>}

      {/* Parents Table */}
      {!loading && !error && (
        <table className="user-table">
          <thead>
            <tr>
              <th>S.N.</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Gender</th>
              <th>Date of Birth</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((u, i) => (
                <React.Fragment key={u.id}>
                  <tr>
                    <td>{i + 1}</td>
                    <td>{`${u.first_name} ${u.last_name}`}</td>
                    <td>{u.username}</td>
                    <td>{u.gender || "N/A"}</td>
                    <td>{formatDate(u.dob)}</td>
                    <td>
                      <span
                        className={`expand-arrow ${
                          expandedRows[u.id] ? "expanded" : ""
                        }`}
                        onClick={() => toggleRowExpansion(u.id)}
                      >
                        {expandedRows[u.id] ? (
                          // up‑chevron when expanded
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 15 12 9 18 15" />
                          </svg>
                        ) : (
                          // down‑chevron when collapsed
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        )}
                      </span>
                    </td>
                  </tr>

                  {expandedRows[u.id] && (
                    <tr className="expanded-row">
                      <td colSpan="6">
                        <div className="expanded-content">
                          <h4>Detailed Information</h4>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <strong>User ID:</strong> {u.id}
                            </div>
                            <div className="detail-item">
                              <strong>Email:</strong> {u.username}
                            </div>
                            <div className="detail-item">
                              <strong>Registered:</strong>{" "}
                              {new Date(u.created_at).toLocaleString()}
                            </div>
                            <div className="detail-item">
                              <strong>Date of Birth:</strong>{" "}
                              {formatDate(u.dob)}
                            </div>
                            <div className="detail-item">
                              <strong>Children:</strong>{" "}
                              {u.children_names
                                ? u.children_names
                                : "No children linked"}
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
                <td colSpan="6">No parents found</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ParentsTab;
