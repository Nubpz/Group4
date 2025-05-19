import React, { useState } from "react";

export default function HomeTab({
  appointments,
  childrenData,
  availableSlots,
  getGreeting,
}) {
  // Get current date and filter appointments
  const now = new Date();
  const upcoming = appointments.filter(
    (app) => new Date(app.appointment_time) >= now
  );
  const past = appointments.filter(
    (app) => new Date(app.appointment_time) < now
  );

  // Count appointments today and this week
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

  // Next appointment for stats
  const nextAppointment = upcoming.sort(
    (a, b) => new Date(a.appointment_time) - new Date(b.appointment_time)
  )[0];
  const nextAppointmentDate = nextAppointment
    ? new Date(nextAppointment.appointment_time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "None";

  const normalizeDate = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day); // month is 0-based
  };

  // Log availableSlots to debug
  console.log("Available Slots:", availableSlots);

  // Available therapists for the calendar grid (limited to 4 for display)
  const availableTherapists = availableSlots
    .map((group) => {
      const today = new Date(now).setHours(0, 0, 0, 0);
      return {
        name: group.therapist_name,
        id: group.therapist_id,
        slots: group.appointments
          .filter((slot) => {
            const slotDate = normalizeDate(slot.date).getTime();
            const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
            return slotDate >= today && slotDateTime >= now;
          })
          .sort(
            (a, b) =>
              new Date(`${a.date}T${a.start_time}`) -
              new Date(`${b.date}T${b.start_time}`)
          ),
      };
    })
    .filter((t) => t.slots.length > 0)
    .slice(0, 4);

  // Log availableTherapists to debug
  console.log("Available Therapists:", availableTherapists);

  // State to track which therapist's slots are being viewed
  const [selectedTherapistId, setSelectedTherapistId] = useState(null);

  // Create a 7-day calendar starting from today
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  });

  // Map slots to days for the calendar, filtering by selected therapist
  const therapistColors = ["#52b788", "#2d6a4f", "#95d5b2", "#40916c"];
  const calendarSlots = days.map((day) => {
    const slotsOnDay = availableTherapists
      .filter((therapist) => !selectedTherapistId || therapist.id === selectedTherapistId)
      .map((therapist, index) => {
        const slots = therapist.slots.filter((slot) => {
          const slotDate = normalizeDate(slot.date);
          return slotDate.toDateString() === day.toDateString();
        });
        return {
          therapistId: therapist.id,
          therapistName: therapist.name,
          color: therapistColors[availableTherapists.findIndex(t => t.id === therapist.id) % therapistColors.length],
          slots: slots.map((slot) => ({
            ...slot,
            startTime: new Date(`${slot.date}T${slot.start_time}`).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            endTime: new Date(`${slot.date}T${slot.end_time}`).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        };
      });
    return { day, slots: slotsOnDay };
  });

  // Log calendarSlots to debug
  console.log("Calendar Slots:", calendarSlots);

  // Handler to toggle selected therapist
  const handleTherapistClick = (therapistId) => {
    setSelectedTherapistId(selectedTherapistId === therapistId ? null : therapistId);
  };

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

      {/* Two-Column Grid */}
      <section className="dashboard-grid">
        {/* Left Section */}
        <div className="dashboard-left">
          {/* Quick Stats */}
          <div className="stats-section">
            <div className="stats-container">
              <div className="stat-card">
                <h4>Today</h4>
                <p className="stat-value">
                  {appointmentsToday}{" "}
                  {appointmentsToday === 1 ? "Appointment" : "Appointments"}
                </p>
              </div>
              <div className="stat-card">
                <h4>This Week</h4>
                <p className="stat-value">
                  {appointmentsThisWeek}{" "}
                  {appointmentsThisWeek === 1 ? "Appointment" : "Appointments"}
                </p>
              </div>
              <div className="stat-card">
                <h4>Total</h4>
                <p className="stat-value">
                  {appointments.length}{" "}
                  {appointments.length === 1 ? "Session" : "Sessions"}
                </p>
              </div>
              <div className="stat-card">
                <h4>Next Appointment</h4>
                <p className="stat-value">{nextAppointmentDate}</p>
              </div>
              <div className="stat-card">
                <h4>My Children</h4>
                <p className="stat-value">
                  {childrenData.length}{" "}
                  {childrenData.length === 1 ? "Child" : "Children"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="dashboard-right">
          {/* Upcoming Appointments */}
          <div className="dashboard-card upcoming-section">
            <h3>
              Upcoming Appointments
              <span className="count-badge">{upcoming.length}</span>
            </h3>
            {upcoming.length === 0 ? (
              <p className="no-data">
                No upcoming appointments scheduled.
              </p>
            ) : (
              <div className="appointments-list">
                {upcoming.slice(0, 5).map((app) => (
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
                      {new Date(app.appointment_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* My Children */}
      <section className="children-section">
        <h3>My Children</h3>
        {childrenData.length === 0 ? (
          <p className="no-data">No children added yet.</p>
        ) : (
          <div className="children-grid">
            {childrenData.map((child) => {
              const nextAppointment = upcoming.find(
                (app) => app.child_id === child.id
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

      {/* Therapist Availability Spotlight */}
      <section className="therapist-spotlight-section">
        <div className="dashboard-card therapist-spotlight">
          <h3>Therapist Availability Spotlight</h3>
          {availableTherapists.length === 0 ? (
            <p className="no-data">No therapists available at the moment.</p>
          ) : (
            <div className="calendar-grid">
              {/* Legend */}
              <div className="calendar-legend">
                {availableTherapists.map((t, index) => (
                  <div
                    key={t.id}
                    className={`legend-item ${
                      selectedTherapistId === t.id ? "selected" : ""
                    }`}
                    onClick={() => handleTherapistClick(t.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <span
                      className="legend-color"
                      style={{
                        backgroundColor:
                          therapistColors[index % therapistColors.length],
                      }}
                    ></span>
                    {t.name}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="calendar-days">
                {calendarSlots.map((daySlot, dayIndex) => (
                  <div key={dayIndex} className="calendar-day">
                    <div className="calendar-day-header">
                      {daySlot.day.toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="calendar-slots">
                      {daySlot.slots.map((therapistSlot) =>
                        therapistSlot.slots.map((slot, slotIndex) => (
                          <div
                            key={slotIndex}
                            className="calendar-slot fade-in"
                            style={{ backgroundColor: therapistSlot.color }}
                          >
                            <span className="slot-time">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Past Appointments */}
      <section className="past-section appointments-group">
        <h3>Past Appointments</h3>
        {past.length === 0 ? (
          <p className="no-data">No past appointments to display.</p>
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
                  {new Date(app.appointment_time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
            <strong>Prepare:</strong> Test your video setup for online sessions.
          </li>
          <li>
            <strong>Plan Ahead:</strong> Book early to secure your preferred therapist.
          </li>
          <li>
            <strong>Stay Updated:</strong> Check this dashboard for your latest schedule.
          </li>
        </ul>
      </section>
    </div>
  );
}