import React from "react";

export default function HomeTab({
  appointments,
  childrenData,
  availableSlots,
  getGreeting,
}) {
  // same logic as your original renderHome()
  const now = new Date();
  const upcoming = appointments.filter(
    (app) => new Date(app.appointment_time) >= now
  );
  const past = appointments.filter(
    (app) => new Date(app.appointment_time) < now
  );

  const today = new Date().setHours(0, 0, 0, 0);
  const appointmentsToday = upcoming.filter(
    (app) =>
      new Date(app.appointment_time).setHours(0, 0, 0, 0) === today
  ).length;
  const appointmentsThisWeek = upcoming.filter(
    (app) =>
      new Date(app.appointment_time) <=
      new Date(today + 7 * 24 * 60 * 60 * 1000)
  ).length;

  const availableTherapists = availableSlots
    .map((group) => ({
      name: group.therapist_name,
      id: group.therapist_id,
      nextSlot: group.appointments
        .filter(
          (slot) =>
            new Date(`${slot.date}T${slot.start_time}`) >= now
        )
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.start_time}`) -
            new Date(`${b.date}T${b.start_time}`)
        )[0],
    }))
    .filter((t) => t.nextSlot)
    .slice(0, 4);

  return (
    <div className="home-tab">
      {/* Greeting */}
      <section className="welcome-section">
        <div className="welcome-header">
          <h2>{getGreeting()}</h2>
          <p>Your family’s care starts here!</p>
          <div className="shine-effect" />
        </div>
      </section>

      {/* Quick Stats */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-card">
            <h4>Today</h4>
            <p>
              {appointmentsToday}{" "}
              {appointmentsToday === 1 ? "Appointment" : "Appointments"}
            </p>
          </div>
          <div className="stat-card">
            <h4>This Week</h4>
            <p>
              {appointmentsThisWeek}{" "}
              {appointmentsThisWeek === 1 ? "Appointment" : "Appointments"}
            </p>
          </div>
          <div className="stat-card">
            <h4>Children</h4>
            <p>
              {childrenData.length}{" "}
              {childrenData.length === 1 ? "Child" : "Children"}
            </p>
          </div>
        </div>
      </section>

      {/* Available Therapists */}
      <section className="therapists-section">
        <h3>Available Therapists</h3>
        {availableTherapists.length === 0 ? (
          <p className="no-data">
            No therapists available at the moment.
          </p>
        ) : (
          <div className="therapists-grid">
            {availableTherapists.map((t) => (
              <div key={t.id} className="therapist-card">
                <h4>{t.name}</h4>
                <p>
                  <strong>Next Available:</strong>{" "}
                  {new Date(
                    `${t.nextSlot.date}T${t.nextSlot.start_time}`
                  ).toLocaleString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="timeline-section">
        <h3>Upcoming at a Glance</h3>
        <div className="upcoming-timeline">
          {upcoming.slice(0, 5).map((app) => (
            <div key={app.id} className="timeline-card">
              <p>
                {new Date(app.appointment_time).toLocaleDateString(
                  "en-US",
                  { weekday: "short", day: "numeric" }
                )}
              </p>
              <p>
                {new Date(app.appointment_time).toLocaleTimeString(
                  [],
                  { hour: "2-digit", minute: "2-digit" }
                )}
              </p>
              <p>{app.child_name}</p>
              <p>{app.therapist_name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Appointments */}
      <section className="upcoming-section appointments-group">
        <h3>
          Upcoming Appointments
          <span className="count-badge">{upcoming.length}</span>
        </h3>
        {upcoming.length === 0 ? (
          <p className="no-data">
            No upcoming appointments scheduled.
          </p>
        ) : (
          <div className="appointments-grid">
            {upcoming.map((app) => (
              <div key={app.id} className="appointment-card">
                <div className="appointment-header">
                  <h4>{app.child_name}</h4>
                  <span>{app.status}</span>
                </div>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(app.appointment_time).toLocaleDateString()}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {new Date(app.appointment_time).toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </p>
                <p>
                  <strong>Therapist:</strong> {app.therapist_name}
                </p>
                <p>
                  <strong>Type:</strong>{" "}
                  {app.appointment_type === "virtual"
                    ? "Online"
                    : "In-Person"}
                </p>
                {app.reasonForMeeting && (
                  <p className="reason">
                    <strong>Reason:</strong>{" "}
                    {app.reasonForMeeting.slice(0, 50)}
                    {app.reasonForMeeting.length > 50 ? "…" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Children Summary */}
      <section className="children-section">
        <h3>Your Children</h3>
        {childrenData.length === 0 ? (
          <p className="no-data">No children added yet.</p>
        ) : (
          <div className="children-grid">
            {childrenData.map((child) => {
              const nextAppointment = upcoming.find(
                (app) =>
                  app.child_name ===
                  `${child.first_name} ${child.last_name}`
              );
              return (
                <div key={child.id} className="child-card-summary">
                  <h4>
                    {child.first_name} {child.last_name}
                  </h4>
                  <p>
                    <strong>DOB:</strong> {child.date_of_birth}
                  </p>
                  <p>
                    <strong>Next:</strong>{" "}
                    {nextAppointment
                      ? new Date(
                          nextAppointment.appointment_time
                        ).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "No upcoming appointments"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past Appointments */}
      <section className="past-section appointments-group">
        <h3>Past Appointments</h3>
        {past.length === 0 ? (
          <p className="no-data">
            No past appointments to display.
          </p>
        ) : (
          <div className="appointments-grid">
            {past.map((app) => (
              <div key={app.id} className="past-appointment-card">
                <h4>{app.child_name}</h4>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(app.appointment_time).toLocaleDateString()}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {new Date(app.appointment_time).toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </p>
                <p>
                  <strong>Therapist:</strong> {app.therapist_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Tips */}
      <section className="tips-section">
        <h3>Quick Tips</h3>
        <ul className="tips-list">
          <li>
            <strong>Prepare:</strong> Test your video setup for online
            sessions.
          </li>
          <li>
            <strong>Plan Ahead:</strong> Book early to secure your
            preferred therapist.
          </li>
          <li>
            <strong>Stay Updated:</strong> Check this dashboard for your
            latest schedule.
          </li>
        </ul>
      </section>
    </div>
  );
}
