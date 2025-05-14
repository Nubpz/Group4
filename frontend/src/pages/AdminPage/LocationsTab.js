import React, { useEffect, useState } from "react";
import MapComponent from "../../components/MapComponent";
import axios from "axios";

const LocationsTab = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please log in to view locations");
          setLoading(false);
          return;
        }
        const response = await axios.get("http://localhost:3000/api/users/locations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data);
      } catch (err) {
        setError("Failed to fetch user locations");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Show all users with a location, no filtering
  const filtered = users.filter(u => {
    const matchesRole = !role || (u.role && u.role.toLowerCase() === role.toLowerCase());
    const matchesName = !search || (u.name && u.name.toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesName;
  });
  const focusedUser = search && filtered.length === 1 ? filtered[0] : null;

  return (
    <div className="locations-tab">
      <h1>User Locations</h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 180 }}
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="">All Roles</option>
          <option value="parent">Parent</option>
          <option value="student">Student</option>
          <option value="therapist">Therapist</option>
        </select>
      </div>
      {loading ? (
        <div>Loading map...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : filtered.length === 0 ? (
        <div>No locations available</div>
      ) : (
        <MapComponent users={filtered} focusedUser={focusedUser} />
      )}
    </div>
  );
};

export default LocationsTab; 