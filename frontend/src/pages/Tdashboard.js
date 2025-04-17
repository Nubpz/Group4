import React, { useState, useEffect } from "react";
import "./design/TDashboard.css"; // Adjust path based on your structure

const TDashboard = ({ therapistInfo }) => {
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotDuration, setNewSlotDuration] = useState("60"); // Default to 1 hour
  const [slotMessage, setSlotMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please log in.");
      setLoading(false);
      return;
    }
    fetchAppointments(token);
    fetchAvailability(token);
  }, []);

  const fetchAppointments = async (token) => {
    try {
      const response = await fetch("http://localhost:3000/therapist/appointments", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch appointments");
      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (token) => {
    try {
      const response = await fetch("http://localhost:3000/therapist/availability", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch availability");
      const data = await response.json();
      setAvailability(data);
    } catch (err) {
      console.error("Availability fetch error:", err);
    }
  };

  const addAvailabilitySlot = async () => {
    if (!newSlotTime || !newSlotDuration) return;
    const token = localStorage.getItem("token");
    const today = new Date().toISOString().split("T")[0];
    const [startHour, startMinute] = newSlotTime.split(":");
    const startTime = `${startHour}:${startMinute}:00`;
    const durationMinutes = parseInt(newSlotDuration);
    const slotStart = new Date(`${today}T${startTime}`);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
    const endTime = slotEnd.toTimeString().slice(0, 8); // HH:MM:SS format

    // Check for duplicates
    const isDuplicate = availability.some(
      (slot) =>
        slot.Date === today &&
        slot.Start_Time === startTime &&
        slot.End_Time === endTime &&
        slot.Status === "available"
    );
    if (isDuplicate) {
      setSlotMessage("This slot is already available.");
      setTimeout(() => setSlotMessage(""), 3000);
      return;
    }

    // Check for overlaps with availability or appointments
    const hasOverlap = availability.some(
      (slot) =>
        slot.Date === today &&
        ((new Date(`${today}T${slot.Start_Time}`) < slotEnd && new Date(`${today}T${slot.End_Time}`) > slotStart))
    ) || appointments.some(
      (appt) =>
        new Date(appt.Appointment_time) >= slotStart &&
        new Date(appt.Appointment_time) < slotEnd
    );
    if (hasOverlap) {
      setSlotMessage("Overlap detected with existing slot or appointment.");
      setTimeout(() => setSlotMessage(""), 3000);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/therapist/availability", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          startTime: startTime,
          endTime: endTime,
        }),
      });
      if (!response.ok) throw new Error("Failed to add slot");
      setSlotMessage("Slot added successfully!");
      fetchAvailability(token); // Refresh availability
      setNewSlotTime("");
      setNewSlotDuration("60"); // Reset to default
      setTimeout(() => setSlotMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = therapistInfo?.first_name ? `Dr. ${therapistInfo.first_name}` : "Doctor";
    if (hour < 12) return `Good Morning, ${name}`;
    if (hour < 17) return `Good Afternoon, ${name}`;
    return `Good Evening, ${name}`;
  };

  const getMoodMessage = () => {
    const todayAppts = appointments.filter(
      (appt) => new Date(appt.Appointment_time).toDateString() === new Date().toDateString()
    ).length;
    if (todayAppts > 5) return "Busy day ahead! Take a deep breath and tackle it one step at a time.";
    if (todayAppts > 0) return "A balanced day awaits. You’ve got this!";
    return "A light day—perfect for planning or a well-deserved break.";
  };

  const todayAppointments = appointments
    .filter((appt) => new Date(appt.Appointment_time).toDateString() === new Date().toDateString())
    .sort((a, b) => new Date(a.Appointment_time) - new Date(b.Appointment_time));

  const upcomingPatient = appointments
    .filter((appt) => new Date(appt.Appointment_time) > new Date())
    .sort((a, b) => new Date(a.Appointment_time) - new Date(b.Appointment_time))[0];

  const todayStats = {
    total: todayAppointments.length,
    pending: todayAppointments.filter((appt) => appt.Status === "pending").length,
    available: availability.filter(
      (slot) => slot.Date === new Date().toISOString().split("T")[0] && slot.Status === "available"
    ).length,
  };

  return (
    <div className="tdashboard-section">
      {loading ? (
        <div className="loader">Loading...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <h1>{getGreeting()}</h1>
          <p className="intro">{getMoodMessage()}</p>

          {/* Animated Stats */}
          <div className="stats-container">
            <div className="stat-card">
              <h3 className="animated-count" data-count={todayStats.total}>
                {todayStats.total}
              </h3>
              <p>Today’s Appointments</p>
            </div>
            <div className="stat-card">
              <h3 className="animated-count" data-count={todayStats.pending}>
                {todayStats.pending}
              </h3>
              <p>Pending Today</p>
            </div>
            <div className="stat-card">
              <h3 className="animated-count" data-count={todayStats.available}>
                {todayStats.available}
              </h3>
              <p>Available Slots</p>
            </div>
          </div>

          {/* Interactive Timeline */}
          <div className="timeline-container">
            <h2>Today’s Timeline</h2>
            <div className="timeline">
              {todayAppointments.length === 0 ? (
                <p>No appointments today.</p>
              ) : (
                todayAppointments.map((appt) => (
                  <div
                    key={appt.Appointment_ID}
                    className={`timeline-block ${appt.Status}`}
                    style={{
                      left: `${(new Date(appt.Appointment_time).getHours() / 24) * 100}%`,
                      width: "10%",
                    }}
                  >
                    <span className="time">
                      {new Date(appt.Appointment_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span className="details">
                      {appt.student_first_name} {appt.student_last_name} ({appt.Appointment_type})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Availability Toggle */}
          <div className="quick-availability">
            <h2>Add a Slot Today</h2>
            <div className="slot-inputs">
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                placeholder="Select start time"
              />
              <input
                type="number"
                value={newSlotDuration}
                onChange={(e) => setNewSlotDuration(e.target.value)}
                min="15"
                step="15"
                placeholder="Duration (minutes)"
              />
              <button onClick={addAvailabilitySlot} disabled={!newSlotTime || !newSlotDuration}>
                Add Slot
              </button>
            </div>
            {slotMessage && <p className={`slot-message ${slotMessage.includes("successfully") ? "success" : ""}`}>{slotMessage}</p>}
          </div>

          {/* Patient Spotlight */}
          {upcomingPatient && (
            <div className="patient-spotlight">
              <h2>Patient Spotlight</h2>
              <div className="spotlight-card">
                <p>
                  <strong>{upcomingPatient.student_first_name} {upcomingPatient.student_last_name}</strong>
                </p>
                <p>Next: {new Date(upcomingPatient.Appointment_time).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</p>
                <p>Reason: {upcomingPatient.Reason_for_meeting || "Not specified"}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TDashboard;