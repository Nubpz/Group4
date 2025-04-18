import React from "react";

export default function MyAppointmentsTab({
  appointments,
  handleCancelAppointment,
  setAppointmentToReschedule,
  setShowRescheduleModal,
  setSelectedTherapist,
  setBookingDate,
  availableSlots
}) {
  // Filter appointments by status
  const now = new Date();
  const upcoming = appointments.filter(
    (app) => new Date(app.appointment_time) >= now
  );
  const past = appointments.filter(
    (app) => new Date(app.appointment_time) < now
  );

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
                        onClick={() => handleCancelAppointment(app.id)}
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
    </div>
  );
}