import React, { useState } from "react";

export default function StudentHomeTab({
  appointments,
  availableSlots,
  getGreeting,
  profile,
  setShowAppointmentDetails,
  setSelectedAppointment
}) {
  // Get current date and filter appointments
  const now = new Date();
  const upcoming = appointments.filter(
    (app) => new Date(app.appointment_time) >= now
  );
  // eslint-disable-next-line no-unused-vars
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

  // Next appointment
  const nextAppointment = upcoming.sort(
    (a, b) => new Date(a.appointment_time) - new Date(b.appointment_time)
  )[0];
  const nextAppointmentDate = nextAppointment
    ? new Date(nextAppointment.appointment_time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "None";

  // Available therapists with all their slots
  const availableTherapists = availableSlots
    .map((group) => ({
      name: group.therapist_name,
      id: group.therapist_id,
      slots: group.appointments
        .filter(
          (slot) =>
            new Date(`${slot.date}T${slot.start_time}`) >= now
        )
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.start_time}`) -
            new Date(`${b.date}T${b.start_time}`)
        ),
    }))
    .filter((t) => t.slots.length > 0);

  // State to track which therapist's slots are being viewed
  const [selectedTherapistId, setSelectedTherapistId] = useState(null);

  // Create a 7-day calendar starting from today
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    return date;
  });

  // Map slots to days for the calendar, filtering by selected therapist
  const therapistColors = ["#52b788", "#2d6a4f", "#95d5b2", "#40916c"];
  const calendarSlots = days.map((day) => {
    const slotsOnDay = availableTherapists
      .filter((therapist) => !selectedTherapistId || therapist.id === selectedTherapistId)
      .map((therapist, index) => {
        const slots = therapist.slots.filter((slot) => {
          const slotDate = new Date(slot.date);
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

  // Handler for viewing appointment details
  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

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
          <p>Your therapy dashboard at a glance</p>
        </div>
      </section>

      {/* Two-Column Grid */}
      <section className="dashboard-grid">
        {/* Left Section */}
        <div className="dashboard-left">
          {/* Stats Boxes */}
          <div className="stats-section">
            <div className="stats-grid">
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
                  <div 
                    key={app.id} 
                    className="appointment-card"
                    onClick={() => handleViewDetails(app)}
                  >
                    <div className="appointment-header">
                      <h4>{app.therapist_name}</h4>
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

      {/* Full-Screen Therapist Availability Spotlight */}
      <section className="therapist-spotlight-section">
        <div className="dashboard-card therapist-spotlight">
          <h3>Therapist Availability Spotlight</h3>
          {availableTherapists.length === 0 ? (
            <p className="no-data">
              No therapists available at the moment.
            </p>
          ) : (
            <div className="calendar-grid">
              {/* Legend */}
              <div className="calendar-legend">
                {availableTherapists.map((t, index) => (
                  <div
                    key={t.id}
                    className={`legend-item ${selectedTherapistId === t.id ? 'selected' : ''}`}
                    onClick={() => handleTherapistClick(t.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <span
                      className="legend-color"
                      style={{ backgroundColor: therapistColors[index % therapistColors.length] }}
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

      {/* Quick Tips */}
      <section className="tips-section">
        <h3>Therapy Tips</h3>
        <ul className="tips-list">
          <li>
            <strong>Be Prepared:</strong> Take a few minutes before your session to jot down topics you want to discuss.
          </li>
          <li>
            <strong>Find a Quiet Space:</strong> For online sessions, choose a private area free from distractions.
          </li>
          <li>
            <strong>Follow-Through:</strong> Try to practice techniques learned in therapy between your sessions.
          </li>
        </ul>
      </section>
    </div>
  );
}