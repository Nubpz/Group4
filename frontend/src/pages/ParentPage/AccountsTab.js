import React from "react";

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
  const getSelectedChildName = () => {
    const c = childrenData.find((c) => c.id === selectedChildId);
    return c ? `${c.first_name} ${c.last_name}` : "";
  };

  return (
    <div className="accounts-tab">
      <div className="accounts-header">
        <h2>Children Accounts</h2>
        <button
          className="add-child-btn"
          onClick={() => setShowModal(true)}
        >
          Add Child
        </button>
      </div>

      {childrenData.length === 0 ? (
        <p>No children linked to your account.</p>
      ) : (
        <div className="children-cards">
          {childrenData.map((child) => {
            const initials = `${child.first_name[0]}${child.last_name[0]}`.toUpperCase();
            return (
              <div
                key={child.id}
                className={`child-card selectable ${
                  selectedChildId === child.id ? "selected" : ""
                }`}
                onClick={() => setSelectedChildId(child.id)}
                style={{ position: "relative" }}
              >
                <div className="child-avatar">{initials}</div>
                <div className="child-info">
                  <p className="child-name">
                    {child.first_name} {child.last_name}
                  </p>
                  <p className="child-dob">
                    {child.date_of_birth}
                  </p>
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
                          openEditChildModal(child);
                        }}
                      >
                        Edit
                      </div>
                      <div
                        style={{ padding: "5px 10px", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteChildModal(child);
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {childAppointments.upcoming.map((app, i) => (
                    <tr key={app.id}>
                      <td>{i + 1}</td>
                      <td>
                        {new Date(
                          app.appointment_time
                        ).toLocaleDateString()}
                      </td>
                      <td>
                        {new Date(
                          app.appointment_time
                        ).toLocaleTimeString()}
                      </td>
                      <td>{app.therapist_name}</td>
                      <td>
                        <button
                          onClick={() => handleCancelAppointment(app.id)}
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
                          onClick={() => {
                            setAppointmentToReschedule(app);
                            setShowRescheduleModal(true);
                            setBookingDate(
                              new Date(app.appointment_time)
                            );
                            const grp = availableSlots.find(
                              (g) =>
                                g.therapist_id === app.therapist_id
                            );
                            if (grp) setSelectedTherapist(grp);
                          }}
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
            <h4 style={{ margin: "25px 0 15px" }}>
              Past Appointments
            </h4>
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
                  </tr>
                </thead>
                <tbody>
                  {childAppointments.past.map((app, i) => (
                    <tr key={app.id}>
                      <td>{i + 1}</td>
                      <td>
                        {new Date(
                          app.appointment_time
                        ).toLocaleDateString()}
                      </td>
                      <td>
                        {new Date(
                          app.appointment_time
                        ).toLocaleTimeString()}
                      </td>
                      <td>{app.therapist_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
