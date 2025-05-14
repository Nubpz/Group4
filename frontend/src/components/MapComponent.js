import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapComponent = ({ users: propUsers, focusedUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef();

  useEffect(() => {
    if (propUsers) {
      setUsers(propUsers);
      setLoading(false);
      return;
    }
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError('Please log in to view locations');
          setLoading(false);
          return;
        }
        const response = await axios.get('http://localhost:3000/api/users/locations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.length === 0) {
          setError('No user locations available');
        } else {
          setUsers(response.data);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch user locations');
        setLoading(false);
      }
    };
    fetchUsers();
  }, [propUsers]);

  // Pan/zoom to focusedUser if provided
  useEffect(() => {
    if (focusedUser && mapRef.current) {
      const { latitude, longitude } = focusedUser;
      mapRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  }, [focusedUser]);

  if (loading) return <div>Loading map...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (users.length === 0) return <div>No user locations available</div>;

  const getIcon = () => new L.Icon.Default();

  return (
    <div style={{ height: '500px', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        whenCreated={mapInstance => { mapRef.current = mapInstance; }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {users.map((user) => (
          <Marker
            key={user.id}
            position={[user.latitude, user.longitude]}
            icon={getIcon()}
          >
            <Popup>
              <div>
                <h3>{user.name}</h3>
                <p>Role: {user.role}</p>
                {user.contact && <p>Contact: {user.contact}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent; 