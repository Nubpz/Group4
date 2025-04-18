import React from "react";
import Calendar from "react-calendar";

export default function BookAppointmentsTab({
  availableSlots,
  selectedTherapist,
  setSelectedTherapist,
  bookingDate,
  setBookingDate,
  selectedSlot,
  setSelectedSlot,
  appointmentType,
  setAppointmentType,
  reasonForVisit,
  setReasonForVisit,
  handleFinalBooking,
  resetBooking,
  bookingError,
  bookingMsg,
  categorizeSlots,
  formatTime
}) {
  // Build date list & filtered slots
  let availableDates = [];
  if (selectedTherapist) {
    availableDates = [...new Set(
      selectedTherapist.appointments.map((s) => s.date)
    )].filter((date) => {
      const slotDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return slotDate >= today;
    });
  }
  console.log("Selected therapist:", selectedTherapist);
  console.log("Available dates:", availableDates);

  let filteredSlots = [];
  if (selectedTherapist && bookingDate) {
    const d = bookingDate.toISOString().split("T")[0];
    filteredSlots = selectedTherapist.appointments.filter(
      (s) => s.date === d
    );
  }
  console.log("Filtered slots:", filteredSlots);
  
  const categorized = filteredSlots.length
    ? categorizeSlots(filteredSlots)
    : null;

  return (
    <div className="appointments-container">
      <div className="appointment-booking">
        <h2>Book a New Appointment</h2>

        <div className="booking-3columns">
          {/* therapist list */}
          <div className="booking-therapist">
            <label>Therapist</label>
            {availableSlots.length === 0 ? (
              <p className="error-message">No therapists available. Please try again later.</p>
            ) : (
              <div className="therapist-row">
                {availableSlots
                  .filter((g) => g.appointments.length > 0) // Only show therapists with slots
                  .map((g, i) => {
                    const initials = g.therapist_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("");
                    return (
                      <div
                        key={i}
                        className={`therapist-row-item selectable ${
                          selectedTherapist &&
                          selectedTherapist.therapist_name === g.therapist_name
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedTherapist(g);
                          setBookingDate(null);
                          setSelectedSlot(null);
                        }}
                      >
                        <div className="therapist-initials">
                          {initials}
                        </div>
                        <div className="therapist-details">
                          <span className="therapist-name">
                            {g.therapist_name}
                          </span>
                          <span className="therapist-description">
                            Certified Therapist
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* calendar */}
          <div className="booking-calendar">
            <label>Select Date:</label>
            {selectedTherapist ? (
              <Calendar
                onChange={(date) => {
                  setBookingDate(date);
                  setSelectedSlot(null);
                }}
                value={bookingDate}
                tileDisabled={({ date, view }) => {
                  if (view !== "month") return false;
                  const dateStr = date.toISOString().split("T")[0];
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isAvailable = availableDates.includes(dateStr);
                  console.log(`Date ${dateStr} available: ${isAvailable}`);
                  return date < today || !isAvailable;
                }}
              />
            ) : (
              <Calendar disabled />
            )}
            {!selectedTherapist && (
              <p className="info-message">
                Please select a therapist to view dates.
              </p>
            )}
          </div>

          {/* timeslots */}
          <div className="booking-timeslots">
            <label>Available Times:</label>
            {selectedTherapist && bookingDate ? (
              categorized ? (
                Object.entries(categorized).map(
                  ([cat, arr]) =>
                    arr.length > 0 && (
                      <div key={cat} className="timeslot-category">
                        <h4>{cat}</h4>
                        <div className="timeslot-list">
                          {arr.map((slot) => {
                            const [h, m, s] = slot.start_time
                              .split(":")
                              .map(Number);
                            const dt = new Date(
                              bookingDate.getFullYear(),
                              bookingDate.getMonth(),
                              bookingDate.getDate(),
                              h,
                              m,
                              s || 0
                            );
                            const isPast = dt < new Date();
                            return (
                              <button
                                key={slot.id}
                                className={`time-slot-btn ${
                                  selectedSlot &&
                                  selectedSlot.id === slot.id
                                    ? "selected"
                                    : ""
                                }`}
                                onClick={() =>
                                  !isPast && setSelectedSlot(slot)
                                }
                                disabled={isPast}
                                style={
                                  isPast
                                    ? {
                                        backgroundColor: "#ccc",
                                        cursor: "not-allowed",
                                      }
                                    : {}
                                }
                              >
                                {formatTime(slot.start_time)} -{" "}
                                {formatTime(slot.end_time)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )
                )
              ) : (
                <p>No available slots on this date.</p>
              )
            ) : (
              <p>Please select a therapist and a date.</p>
            )}
          </div>
        </div>

        {/* type & reason */}
        <div className="booking-section appointment-options">
          <label>Appointment Type:</label>
          <div className="appointment-type">
            <label>
              <input
                type="radio"
                name="appointmentType"
                value="virtual"
                checked={appointmentType === "virtual"}
                onChange={(e) => setAppointmentType(e.target.value)}
              />
              Online
            </label>
            <label>
              <input
                type="radio"
                name="appointmentType"
                value="in_person"
                checked={appointmentType === "in_person"}
                onChange={(e) => setAppointmentType(e.target.value)}
              />
              In-Person
            </label>
          </div>
          <label>Reason for Visit:</label>
          <textarea
            className="reason-textarea"
            value={reasonForVisit}
            onChange={(e) => setReasonForVisit(e.target.value)}
            placeholder="Enter the purpose of your visit…"
          />
        </div>

        {/* final book */}
        {selectedSlot && (
          <div className="booking-section">
            <button
              className="final-book-btn"
              onClick={handleFinalBooking}
            >
              Book Appointment
            </button>
          </div>
        )}

        <div className="booking-section">
          {bookingError && (
            <p className="error-message">{bookingError}</p>
          )}
          {bookingMsg && (
            <p className="confirmation-msg">{bookingMsg}</p>
          )}
          <button className="cancel-btn" onClick={resetBooking}>
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  );
}