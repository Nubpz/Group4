import React, { useState, useEffect } from "react";

export default function AccountsTab({
  childrenData,
  childAppointments,
  selectedChildId,
  setSelectedChildId,
  setShowModal,
  openEditChildModal,
  openDeleteChildModal,
  childOptionsChildId,
  setChildOptionsChildId,
  handleCancelAppointment,
  setAppointmentToReschedule,
  setShowRescheduleModal,
  setBookingDate,
  setSelectedTherapist,
  availableSlots,
}) {
  const [showConfirm, setShowConfirm] = useState(null); // Tracks action to confirm (cancel, reschedule, add, edit, delete)
  const [confirmData, setConfirmData] = useState(null); // Stores data for the action (e.g., appointment, child)
  const [toast, setToast] = useState({ message: "", type: "", visible: false });
  const [submitting, setSubmitting] = useState(false);

  const getSelectedChildName = () => {
    const c = childrenData.find((c) => c.id === selectedChildId);
    return c ? `${c.first_name} ${c.last_name}` : "";
  };

  // Helper function to format status with fallback
  const formatStatus = (status) => {
    if (!status) return "N/A";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Show toast notification
  const showToast = (message, type) => {
    setToast({ message, type, visible: true });
  };

  // Hide toast after 3 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ message: "", type: "", visible: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Handle action confirmation
  const handleConfirmAction = async () => {
    if (!showConfirm || !confirmData) return;
    setSubmitting(true);
    try {
      switch (showConfirm) {
        case "cancel":
          await handleCancelAppointment(confirmData.id);
          showToast("Appointment cancelled successfully!", "success");
          break;
        case "reschedule":
          setAppointmentToReschedule(confirmData);
          setShowRescheduleModal(true);
          setBookingDate(new Date(confirmData.appointment_time));
          const grp = availableSlots.find((g) => g.therapist_id === confirmData.therapist_id);
          if (grp) setSelectedTherapist(grp);
          showToast("Proceeding to reschedule appointment.", "success");
          break;
        case "add":
          setShowModal(true);
          showToast("Proceeding to add a child.", "success");
          break;
        case "edit":
          openEditChildModal(confirmData);
          showToast("Proceeding to edit child details.", "success");
          break;
        case "delete":
          openDeleteChildModal(confirmData);
          showToast("Proceeding to delete child account.", "success");
          break;
        default:
          throw new Error("Invalid action.");
      }
      setShowConfirm(null);
      setConfirmData(null);
    } catch (err) {
      showToast(err.message || `Failed to ${showConfirm} action.`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle action initiation
  const initiateAction = (action, data) => {
    setShowConfirm(action);
    setConfirmData(data);
  };

  return (
    <div className="accounts-tab">
      <div className="accounts-header">
        <h2>Children Accounts</h2>
        <button
          className="add-child-btn"
          onClick={() => initiateAction("add", null)}
        >
          Add Child
        </button>
      </div>

      {toast.visible && (
        <div className={`toast-notification ${toast.type}-message`}>
          {toast.message}
        </div>
      )}

      {childrenData.length === 0 ? (
        <p>No children linked to your account.</p>
      ) : (
        <div className="children-cards">
          {childrenData.map((child) => {
            const initials = `${child.first_name[0]}${child.last_name[0]}`.toUpperCase();
            return (
              <div
                key={child.id}
                className={`child-card selectable ${selectedChildId === child.id ? "selected" : ""}`}
                onClick={() => setSelectedChildId(child.id)}
                style={{ position: "relative" }}
              >
                <div className="child-avatar">{initials}</div>
                <div className="child-info">
                  <p className="child-name">
                    {child.first_name} {child.last_name}
                  </p>
                  <p className="child-dob">{child.date_of_birth}</p>
                </div>
                <div style={{ position: "absolute", top: 5, right: 5 }}>
                  <button
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: 18,
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChildOptionsChildId(
                        childOptionsChildId === child.id ? null : child.id
                      );
                    }}
                  >
                    ⋮
                  </button>
                  {childOptionsChildId === child.id && (
                    <div
                      style={{
                        position: "absolute",
                        top: 25,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        zIndex: 10,
                      }}
                    >
                      <div
                        style={{ padding: "5px 10px", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateAction("edit", child);
                        }}
                      >
                        Edit
                      </div>
                      <div
                        style={{ padding: "5px 10px", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateAction("delete", child);
                        }}
                      >
                        Delete
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedChildId && (
        <div className="child-appointments">
          <h3 style={{ margin: "25px 0 15px" }}>
            Appointments for {getSelectedChildName()}
          </h3>

          <div className="appointments-group">
            {childAppointments.upcoming.length === 0 ? (
              <p>No upcoming appointments for this child.</p>
            ) : (
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>S.N.</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Therapist</th>
                    <th>Status</th>
                    <th>Meeting Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {childAppointments.upcoming.map((app, i) => (
                    <tr key={app.id}>
                      <td>{i + 1}</td>
                      <td>{new Date(app.appointment_time).toLocaleDateString()}</td>
                      <td>{new Date(app.appointment_time).toLocaleTimeString()}</td>
                      <td>{app.therapist_name}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            app.status === "confirmed"
                              ? "available"
                              : app.status === "cancelled"
                              ? "pending"
                              : "pending"
                          }`}
                        >
                          {formatStatus(app.status)}
                        </span>
                      </td>
                      <td>
                        {app.meeting_link ? (
                          <a href={app.meeting_link} target="_blank" rel="noopener noreferrer">
                            Join Meeting
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => initiateAction("cancel", app)}
                          style={{
                            marginRight: 25,
                            background: "#e74c3c",
                            color: "#fff",
                            padding: "10px 16px",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 14,
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => initiateAction("reschedule", app)}
                          style={{
                            background: "#f39c12",
                            color: "#fff",
                            padding: "10px 16px",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 14,
                          }}
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

          <div className="appointments-group">
            <h4 style={{ margin: "25px 0 15px" }}>Past Appointments</h4>
            {childAppointments.past.length === 0 ? (
              <p>No past appointments for this child.</p>
            ) : (
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>S.N.</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Therapist</th>
                    <th>Status</th>
                    <th>Meeting Link</th>
                  </tr>
                </thead>
                <tbody>
                  {childAppointments.past.map((app, i) => (
                    <tr key={app.id}>
                      <td>{i + 1}</td>
                      <td>{new Date(app.appointment_time).toLocaleDateString()}</td>
                      <td>{new Date(app.appointment_time).toLocaleTimeString()}</td>
                      <td>{app.therapist_name}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            app.status === "confirmed"
                              ? "available"
                              : app.status === "cancelled"
                              ? "pending"
                              : "pending"
                          }`}
                        >
                          {formatStatus(app.status)}
                        </span>
                      </td>
                      <td>
                        {app.meeting_link ? (
                          <a href={app.meeting_link} target="_blank" rel="noopener noreferrer">
                            Join Meeting
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm {showConfirm.charAt(0).toUpperCase() + showConfirm.slice(1)}</h2>
            <div className="confirm-delete">
              <p>
                {showConfirm === "cancel" && "Are you sure you want to cancel this appointment?"}
                {showConfirm === "reschedule" && "Are you sure you want to reschedule this appointment?"}
                {showConfirm === "add" && "Are you sure you want to add a new child?"}
                {showConfirm === "edit" && `Are you sure you want to edit ${confirmData.first_name} ${confirmData.last_name}'s details?`}
                {showConfirm === "delete" && `Are you sure you want to delete ${confirmData.first_name} ${confirmData.last_name}'s account?`}
              </p>
              <div className="modal-actions">
                <button
                  className="modal-btn delete-btn"
                  onClick={handleConfirmAction}
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : "Confirm"}
                </button>
                <button
                  className="modal-btn cancel-btn"
                  onClick={() => {
                    setShowConfirm(null);
                    setConfirmData(null);
                  }}
                  disabled={submitting}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}