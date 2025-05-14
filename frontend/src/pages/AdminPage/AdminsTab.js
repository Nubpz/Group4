import React from "react";

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
  const handleSetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const token = localStorage.getItem("token");
      try {
        await fetch("http://localhost:3000/users/update-location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ latitude, longitude }),
        });
        alert("Location updated!");
      } catch (err) {
        alert("Failed to update location.");
      }
    }, () => {
      alert("Unable to retrieve your location.");
    });
  };

  return (
    <>
      <h1 className="tab-header">
        <span className="header-icon">{headerIcon}</span>
        Admins List
      </h1>
      <div className="search-box">
        <input
          type="text"
          placeholder="Search admins..."
          value={searchTerm}
          onChange={e=>setSearchTerm(e.target.value)}
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
            {users.length>0 ? users.map((u,i)=>(
              <React.Fragment key={u.id}>
                <tr>
                  <td>{i+1}</td>
                  <td>{`${u.first_name} ${u.last_name}`}</td>
                  <td>{u.username}</td>
                  <td>{u.gender||"N/A"}</td>
                  <td>
                    <button onClick={()=>toggleRowExpansion(u.id)}>
                      {expandedRows[u.id] ? "▾" : "▸"}
                    </button>
                  </td>
                </tr>
                {expandedRows[u.id] && (
                  <tr className="expanded-row">
                    <td colSpan="5">
                      {/* extra admin details */}
                      <strong>User ID:</strong> {u.id}<br/>
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
      <button onClick={handleSetLocation} style={{marginTop: 12}}>Set My Location</button>
    </>
  );
};

export default AdminsTab;
