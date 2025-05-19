// src/pages/MyAppointmentsTab.js
import React, { useState } from "react";

export default function MyAppointmentsTab({
  appointments,
  handleCancelAppointment,
  setAppointmentToReschedule,
  setShowRescheduleModal,
  setSelectedTherapist,
  setBookingDate,
  availableSlots,
}) {
  // Filter appointments by status
  const now = new Date();
  const upcoming = appointments.filter(
    (app) => new Date(app.appointment_time) >= now
  );
  const past = appointments.filter(
    (app) => new Date(app.appointment_time) < now
  );

  // State for cancellation confirmation modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  // Handle cancel button click
  const handleCancelClick = (appointment) => {
    setAppointmentToCancel(appointment);
    setShowCancelConfirm(true);
  };

  // Confirm cancellation
  const confirmCancel = async () => {
    if (appointmentToCancel) {
      await handleCancelAppointment(appointmentToCancel.id);
    }
    setShowCancelConfirm(false);
    setAppointmentToCancel(null);
  };

  // Cancel cancellation
  const cancelCancel = () => {
    setShowCancelConfirm(false);
    setAppointmentToCancel(null);
  };

  // Cancellation confirmation modal
  const CancelConfirmModal = () => {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: "400px", padding: "20px" }}>
          <span
            className="close-button"
            onClick={cancelCancel}
            style={{
              position: "absolute",
              top: "10px",
              right: "15px",
              fontSize: "24px",
              cursor: "pointer",
              color: "#333",
              fontWeight: "bold",
            }}
          >
            ×
          </span>
          <h2 style={{ marginBottom: "1rem" }}>Confirm Cancellation</h2>
          <p style={{ marginBottom: "1.5rem", color: "#333" }}>
            Are you sure you want to cancel this appointment?
          </p>
          {appointmentToCancel && (
            <p style={{ marginBottom: "1rem", color: "#666" }}>
              <strong>Date:</strong>{" "}
              {new Date(appointmentToCancel.appointment_time).toLocaleDateString()}{" "}
              at{" "}
              {new Date(appointmentToCancel.appointment_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
              <br />
              <strong>Therapist:</strong> {appointmentToCancel.therapist_name}
            </p>
          )}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              onClick={cancelCancel}
              className="cancel-btn"
              style={{
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                transition: "background-color 0.3s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#5a6268")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#6c757d")}
            >
              Cancel
            </button>
            <button
              onClick={confirmCancel}
              className="confirm-btn"
              style={{
                backgroundColor: "#ff4d4d",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                transition: "background-color 0.3s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#cc0000")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ff4d4d")}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="appointments-container">
      <div className="appointments-tabs">
        <div className="tab-headers">
          <h2>My Appointments</h2>
        </div>

        {/* Upcoming Appointments */}
        <div className="appointments-section">
          <h3>Upcoming Appointments</h3>
          {upcoming.length === 0 ? (
            <p className="no-data">No upcoming appointments scheduled.</p>
          ) : (
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Therapist</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((app, i) => (
                  <tr key={app.id}>
                    <td>{i + 1}</td>
                    <td>
                      {new Date(app.appointment_time).toLocaleDateString()}
                    </td>
                    <td>
                      {new Date(app.appointment_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td>{app.therapist_name}</td>
                    <td>{app.appointment_type === "virtual" ? "Online" : "In-Person"}</td>
                    <td>
                      <button
                        onClick={() => handleCancelClick(app)}
                        className="cancel-action-btn"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setAppointmentToReschedule(app);
                          setShowRescheduleModal(true);
                          setBookingDate(new Date(app.appointment_time));
                          const grp = availableSlots.find(
                            (g) => g.therapist_id === app.therapist_id
                          );
                          if (grp) setSelectedTherapist(grp);
                        }}
                        className="reschedule-action-btn"
                      >
                        Reschedule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Past Appointments */}
        <div className="appointments-section">
          <h3>Past Appointments</h3>
          {past.length === 0 ? (
            <p className="no-data">No past appointments to display.</p>
          ) : (
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Therapist</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {past.map((app, i) => (
                  <tr key={app.id}>
                    <td>{i + 1}</td>
                    <td>
                      {new Date(app.appointment_time).toLocaleDateString()}
                    </td>
                    <td>
                      {new Date(app.appointment_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td>{app.therapist_name}</td>
                    <td>{app.appointment_type === "virtual" ? "Online" : "In-Person"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Conditionally render Cancellation Confirmation Modal */}
      {showCancelConfirm && <CancelConfirmModal />}
    </div>
  );
}