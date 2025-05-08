import React from "react";
import { useNavigate } from "react-router-dom"; // Add this import

const AdminsTab = ({
  headerIcon,
  users,
  loading,
  error,
  searchTerm,
  setSearchTerm,
  expandedRows,
  toggleRowExpansion
}) => {
  const navigate = useNavigate(); // Add navigate hook

  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear the token
    navigate("/"); // Redirect to login page
  };

  return (
    <>
      <div className="tab-header-container">
        <h1 className="tab-header">
          <span className="header-icon">{headerIcon}</span>
          Admins List
        </h1>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="search-box">
        <input
          type="text"
          placeholder="Search admins..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
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
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? users.map((u, i) => (
              <React.Fragment key={u.id}>
                <tr>
                  <td>{i + 1}</td>
                  <td>{`${u.first_name} ${u.last_name}`}</td>
                  <td>{u.username}</td>
                  <td>{u.gender || "N/A"}</td>
                  <td>
                    <button onClick={() => toggleRowExpansion(u.id)}>
                      {expandedRows[u.id] ? "▾" : "▸"}
                    </button>
                  </td>
                </tr>
                {expandedRows[u.id] && (
                  <tr className="expanded-row">
                    <td colSpan="5">
                      {/* extra admin details */}
                      <strong>User ID:</strong> {u.id}<br />
                      <strong>Registered:</strong> {new Date(u.created_at).toLocaleString()}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )) : (
              <tr><td colSpan="5">No admins found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
};

export default AdminsTab;