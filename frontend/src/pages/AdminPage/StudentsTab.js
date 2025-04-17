import React from "react";

const StudentsTab = ({
  headerIcon,
  users,
  loading,
  error,
  searchTerm,
  setSearchTerm,
  expandedRows,
  toggleRowExpansion,
  formatDate,
}) => {
  console.log("StudentsTab users:", users);

  return (
    <>
      <h1 className="tab-header">
        <span className="header-icon">{headerIcon}</span>
        Students List
      </h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search students…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="loader">Loading…</p>
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
                    <td>{`${u.first_name || "N/A"} ${u.last_name || "N/A"}`}</td>
                    <td>
                      {u.guardian_names && u.guardian_names.trim() !== ""
                        ? "N/A"
                        : u.email || "N/A"}
                    </td>
                    <td>{u.gender || "N/A"}</td>
                    <td>{formatDate(u.dob) || "N/A"}</td>
                    <td>
                      <span
                        className={`expand-arrow ${
                          expandedRows[u.id] ? "expanded" : ""
                        }`}
                        onClick={() => toggleRowExpansion(u.id)}
                      >
                        {expandedRows[u.id] ? (
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
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        ) : (
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
                              <strong>Email:</strong>{" "}
                              {u.guardian_names && u.guardian_names.trim() !== ""
                                ? "N/A"
                                : u.email || "N/A"}
                            </div>
                            <div className="detail-item">
                              <strong>Registered:</strong>{" "}
                              {u.created_at
                                ? new Date(u.created_at).toLocaleString()
                                : "N/A"}
                            </div>
                            <div className="detail-item">
                             <strong>Guardians:</strong> {u.guardian_info || "none linked"}
                        
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
                <td colSpan="6">No students found</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
};

export default StudentsTab;