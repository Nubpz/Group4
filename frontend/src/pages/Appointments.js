import React, { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import "./design/appointments.css";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [formData, setFormData] = useState({ status: "", meetingLink: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const calendarRef = useRef(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    const filtered = appointments.filter((appt) => {
      const statusMatch = statusFilter === "all" || appt.Status === statusFilter;
      const typeMatch = typeFilter === "all" || appt.Appointment_type === typeFilter;
      const nameMatch = `${appt.student_first_name} ${appt.student_last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return statusMatch && typeMatch && nameMatch;
    });
    setFilteredAppointments(filtered);
  }, [appointments, statusFilter, typeFilter, searchQuery]);

  const fetchAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in.");

      const response = await fetch("http://localhost:3000/therapist/appointments", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch appointments");
      }

      const data = await response.json();
      const formattedData = data.map((appt) => ({
        ...appt,
        Appointment_time: new Date(appt.Appointment_time).toISOString(),
      }));
      setAppointments(formattedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      status: appointment.Status,
      meetingLink: appointment.Meeting_link || "",
    });
    setShowModal(true);
    setShowDeleteConfirm(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in.");

      const response = await fetch(
        `http://localhost:3000/therapist/appointments/${selectedAppointment.Appointment_ID}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: formData.status,
            meetingLink: formData.status === "confirmed" ? formData.meetingLink : null, // Clear meetingLink if not confirmed
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update appointment");
      }

      setSuccessMessage("Appointment updated successfully!");
      await fetchAppointments();
      setTimeout(() => {
        setShowModal(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in.");

      const response = await fetch(
        `http://localhost:3000/therapist/appointments/${selectedAppointment.Appointment_ID}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to delete appointment");
      }

      setSuccessMessage("Appointment deleted successfully!");
      await fetchAppointments();
      setTimeout(() => {
        setShowModal(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      "Student,Date & Time,Type,Status,Reason",
      ...filteredAppointments.map(
        (appt) =>
          `"${appt.student_first_name} ${appt.student_last_name}",` +
          `"${formatDateTime(appt.Appointment_time)}",` +
          `"${appt.Appointment_type}",` +
          `"${appt.Status}",` +
          `"${appt.Reason_for_meeting || ""}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "appointments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "N/A";
    const date = new Date(dateTime);
    return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  };

  const renderTable = () => (
    <table className="avail-table">
      <thead>
        <tr>
          <th>Student</th>
          <th>Date & Time</th>
          <th>Type</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {filteredAppointments.map((appointment) => (
          <tr key={appointment.Appointment_ID}>
            <td>
              {appointment.student_first_name} {appointment.student_last_name}
            </td>
            <td>{formatDateTime(appointment.Appointment_time)}</td>
            <td>{appointment.Appointment_type}</td>
            <td>
              <span
                className={`status-badge ${
                  appointment.Status === "confirmed"
                    ? "available"
                    : appointment.Status === "cancelled"
                    ? "pending"
                    : "pending"
                }`}
              >
                {appointment.Status.charAt(0).toUpperCase() + appointment.Status.slice(1)}
              </span>
            </td>
            <td>
              <button
                className="action-btn edit-btn"
                onClick={() => handleEditClick(appointment)}
              >
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderCalendar = () => {
    const events = filteredAppointments.map((appt) => ({
      id: String(appt.Appointment_ID),
      title: `${appt.student_first_name} ${appt.student_last_name} (${appt.Appointment_type})`,
      start: appt.Appointment_time,
      end: new Date(new Date(appt.Appointment_time).getTime() + 60 * 60 * 1000),
      extendedProps: appt,
      backgroundColor: appt.Status === "confirmed" ? "#2ecc71" : appt.Status === "cancelled" ? "#e74c3c" : "#f39c12",
      borderColor: appt.Status === "confirmed" ? "#27ae60" : appt.Status === "cancelled" ? "#c0392b" : "#e67e22",
    }));

    return (
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
        initialView="timeGridWeek"
        events={events}
        eventClick={(info) => handleEditClick(info.event.extendedProps)}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        height="auto"
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
      />
    );
  };

  const renderModal = () => {
    if (!selectedAppointment) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Manage Appointment</h2>
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          {!showDeleteConfirm ? (
            <>
              <div className="booking-details">
                <div className="detail-item">
                  <span className="detail-label">Student:</span>
                  <span className="detail-value">
                    {selectedAppointment.student_first_name} {selectedAppointment.student_last_name}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date & Time:</span>
                  <span className="detail-value">
                    {formatDateTime(selectedAppointment.Appointment_time)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{selectedAppointment.Appointment_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Reason:</span>
                  <span className="detail-value">
                    {selectedAppointment.Reason_for_meeting || "Not specified"}
                  </span>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="edit-form">
                <label>
                  Status:
                  <select name="status" value={formData.status} onChange={handleInputChange} required>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                {selectedAppointment.Appointment_type === "virtual" && formData.status === "confirmed" && (
                  <label>
                    Meeting Link:
                    <input
                      type="url"
                      name="meetingLink"
                      value={formData.meetingLink}
                      onChange={handleInputChange}
                      placeholder="Enter meeting URL"
                    />
                  </label>
                )}
                <div className="modal-actions">
                  <button type="submit" className="modal-btn save-btn" disabled={submitting}>
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="modal-btn cancel-btn"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="modal-btn delete-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={submitting}
                  >
                    Delete
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="confirm-delete">
              <p>Are you sure you want to delete this appointment?</p>
              <div className="modal-actions">
                <button className="modal-btn delete-btn" onClick={handleDelete} disabled={submitting}>
                  {submitting ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  className="modal-btn cancel-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="appointments-section">
      <h1>Manage Appointments</h1>
      {loading ? (
        <div className="loader">Loading...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : appointments.length === 0 ? (
        <div className="no-data">No appointments found.</div>
      ) : (
        <>
          <div className="controls-row">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filters">
              <label>
                Status:
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label>
                Type:
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="virtual">Virtual</option>
                  <option value="in_person">In-Person</option>
                </select>
              </label>
            </div>
            <button className="action-btn export-btn" onClick={handleExportCSV}>
              Export to CSV
            </button>
          </div>
          <div className="view-toggle">
            <button
              className={`tab-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              Table View
            </button>
            <button
              className={`tab-btn ${viewMode === "calendar" ? "active" : ""}`}
              onClick={() => setViewMode("calendar")}
            >
              Calendar View
            </button>
          </div>
          {viewMode === "calendar" ? renderCalendar() : renderTable()}
        </>
      )}
      {showModal && renderModal()}
    </div>
  );
};

export default Appointments;