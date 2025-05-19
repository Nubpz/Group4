// src/pages/AdminPage/LocationTab.js
import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const LocationTab = ({ currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [adminLocation, setAdminLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapCenter, setMapCenter] = useState(null); // Initialize as null
  const [mapZoom, setMapZoom] = useState(10);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const mapRef = useRef();
  const [isClient, setIsClient] = useState(false);

  // Fetch admin profile for default map center and users for pins
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please log in.");
      setLoading(false);
      return;
    }

    const fetchAdminProfile = async () => {
      try {
        const response = await fetch("http://localhost:3000/admin/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to fetch admin profile: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched admin profile:", data);
        setAdminLocation(data);
        // Set initial map center if admin has valid coordinates
        if (data.latitude && data.longitude && !isNaN(data.latitude) && !isNaN(data.longitude)) {
          setMapCenter([data.latitude, data.longitude]);
        }
      } catch (err) {
        console.error("Error fetching admin profile:", err);
        setError(err.message);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:3000/user/locations", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to fetch user locations: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched users:", data);
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminProfile();
    fetchUsers();
  }, []);

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter users with valid coordinates
  const validUsers = users.filter(
    (user) => user.latitude != null && user.longitude != null && !isNaN(user.latitude) && !isNaN(user.longitude)
  );

  // Center map on admin’s location or keep admin profile location
  useEffect(() => {
    console.log("Users data:", users);
    console.log("Current User ID:", currentUserId);
    console.log("Admin location:", adminLocation);
    const currentUser = users.find((user) => user.user_id === currentUserId);
    if (currentUser && currentUser.latitude && currentUser.longitude && !isNaN(currentUser.latitude) && !isNaN(currentUser.longitude)) {
      console.log("Centering map on admin:", [currentUser.latitude, currentUser.longitude]);
      setMapCenter([currentUser.latitude, currentUser.longitude]);
      setMapZoom(15);
    } else if (adminLocation && adminLocation.latitude && adminLocation.longitude && !isNaN(adminLocation.latitude) && !isNaN(adminLocation.longitude)) {
      console.log("Centering map on admin profile:", [adminLocation.latitude, adminLocation.longitude]);
      setMapCenter([adminLocation.latitude, adminLocation.longitude]);
      setMapZoom(15);
    } else {
      console.log("No valid admin location, map center not set");
    }
  }, [users, currentUserId, adminLocation]);

  // Center map on single search result
  useEffect(() => {
    const filteredUsers = validUsers
      .filter((user) => selectedRole === "all" || user.role === selectedRole)
      .filter((user) => `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filteredUsers.length === 1 && filteredUsers[0].latitude && filteredUsers[0].longitude) {
      console.log("Centering map on search result:", [filteredUsers[0].latitude, filteredUsers[0].longitude]);
      setMapCenter([filteredUsers[0].latitude, filteredUsers[0].longitude]);
      setMapZoom(15);
    }
  }, [searchQuery, selectedRole, validUsers]);

  const handleSetLocation = () => {
    if (!navigator.geolocation) {
      setFormError("Geolocation is not supported by your browser.");
      return;
    }

    const token = localStorage.getItem("token");
    console.log("Token:", token);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Geolocation coordinates:", { latitude, longitude });
        try {
          const res = await fetch("http://localhost:3000/user/location", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Failed to update location");
          }
          setFormMessage("Location updated successfully!");
          setFormError("");
          setMapCenter([latitude, longitude]);
          setMapZoom(15);
          // Refresh users
          const response = await fetch("http://localhost:3000/user/locations", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          });
          if (response.ok) {
            const data = await response.json();
            setUsers(data);
          }
          setTimeout(() => setFormMessage(""), 3000);
        } catch (err) {
          console.error("Error updating location:", err);
          setFormError(err.message);
        }
      },
      (err) => {
        setFormError(`Geolocation error: ${err.message}`);
      }
    );
  };

  // Get unique roles for dropdown
  const roles = ["all", ...new Set(users.map((user) => user.role))];

  // Filter users for display
  const filteredUsers = validUsers
    .filter((user) => selectedRole === "all" || user.role === selectedRole)
    .filter((user) => `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()));

  // Function to get pin icon based on role
  const getPinIcon = (role, isCurrentUser) => {
    if (isCurrentUser) {
      return new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: "hue-rotate-0deg", // Red for current user (admin)
      });
    }

    const roleStyles = {
      admin: "hue-rotate-0deg", // Red
      therapist: "hue-rotate-200deg", // Blue
      student: "hue-rotate-120deg", // Green
      parent: "hue-rotate-300deg", // Purple
    };

    return new L.Icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
      className: roleStyles[role] || "hue-rotate-0deg", // Default to red
    });
  };

  // Wait for mapCenter to be set before rendering MapContainer
  if (!mapCenter) {
    return <p>Loading map...</p>;
  }

  return (
    <div className="location-tab">
      <div className="dashboard-header">
        <h1>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          User Locations
        </h1>
        <button className="set-location-button" onClick={handleSetLocation}>
          Set my Location
        </button>
      </div>

      <div className="search-filter-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="role-dropdown"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role === "all" ? "All Roles" : role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="loader">Loading...</p>}
      {error && <p className="error">{error}</p>}
      {formError && <p className="error">{formError}</p>}
      {formMessage && <p className="message">{formMessage}</p>}

      {!loading && !error && isClient && (
        <div className="map-container">
          {filteredUsers.length > 0 ? (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="leaflet-container"
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {filteredUsers.map((user) => (
                <Marker
                  key={user.user_id}
                  position={[user.latitude, user.longitude]}
                  icon={getPinIcon(user.role, user.user_id === currentUserId)}
                >
                  <Popup>
                    <strong>{`${user.first_name} ${user.last_name}`}</strong>
                    <br />
                    Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    <br />
                    utvecklaEmail: {user.username}
                    {user.user_id === currentUserId && <br />}
                    {user.user_id === currentUserId && <strong>You are here</strong>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <p>No matching users with locations found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationTab;