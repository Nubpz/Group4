// src/pages/AdminPage/LocationTab.js
import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Default and custom icons
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const currentUserIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "current-user-marker",
});

const LocationTab = ({ headerIcon, users, loading, error, currentUserId, fetchUsers }) => {
  const defaultCenter = [40.7128, -74.0060]; // Fallback: New York City
  const defaultZoom = 10;
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // Name search
  const [selectedRole, setSelectedRole] = useState("all"); // Role filter
  const mapRef = useRef();
  const [isClient, setIsClient] = useState(false);

  // Filter users with valid coordinates
  const validUsers = users.filter(
    (user) => user.latitude != null && user.longitude != null && !isNaN(user.latitude) && !isNaN(user.longitude)
  );

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Center map on admin’s location on load
  useEffect(() => {
    console.log("Users data:", users);
    console.log("Current User ID:", currentUserId);
    const currentUser = users.find((user) => user.id === currentUserId);
    if (currentUser && currentUser.latitude && currentUser.longitude && !isNaN(currentUser.latitude) && !isNaN(currentUser.longitude)) {
      console.log("Centering map on admin:", [currentUser.latitude, currentUser.longitude]);
      setMapCenter([currentUser.latitude, currentUser.longitude]);
      setMapZoom(15);
    } else {
      console.log("No valid admin location, using default center");
    }
  }, [users, currentUserId]);

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
          fetchUsers();
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

  return (
    <div className="location-tab">
      <div className="dashboard-header">
        <h1>
          <span className="header-icon">{headerIcon}</span>
          Admin Locations
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
                  key={user.id}
                  position={[user.latitude, user.longitude]}
                  icon={user.id === currentUserId ? currentUserIcon : defaultIcon}
                >
                  <Popup>
                    <strong>{`${user.first_name} ${user.last_name}`}</strong>
                    <br />
                    Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    <br />
                    Email: {user.username}
                    {user.id === currentUserId && <br />}
                    {user.id === currentUserId && <strong>You are here</strong>}
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