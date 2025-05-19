import React from "react";
import Calendar from "react-calendar";

export default function BookingTab({
  selectedChildId,
  setSelectedChildId,
  childrenData,
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
  formatTime,
  appointments,
}) {
  // Build date list & filtered slots with time consideration
  let availableDates = [];
  if (selectedTherapist) {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // "2025-05-19"

    availableDates = Array.from(
      new Set(
        selectedTherapist.appointments
          .filter((slot) => {
            const slotDateStr = slot.date; // e.g., "2025-05-19"
            const [year, month, day] = slotDateStr.split("-").map(Number);
            const [h, m, s] = slot.start_time.split(":").map(Number);
            const slotDateTime = new Date(year, month - 1, day, h, m, s || 0);

            // For today, only include if the slot starts after now
            if (slotDateStr === todayStr) {
              return slotDateTime > now;
            }
            // For future dates, include if the date is >= today
            return slotDateStr >= todayStr;
          })
          .map((s) => s.date)
      )
    );
  }

  // Apply booking restriction: exclude dates with existing appointments for the selected child and therapist
  if (selectedTherapist && selectedChildId) {
    const therapistAppointments = appointments.filter(
      (appt) => appt.therapist_id === selectedTherapist.therapist_id && appt.child_id === selectedChildId
    );
    const bookedDates = therapistAppointments.map((appt) =>
      new Date(appt.appointment_time).toISOString().split("T")[0]
    );
    availableDates = availableDates.filter((date) => !bookedDates.includes(date));
  }

  let filteredSlots = [];
  if (selectedTherapist && bookingDate) {
    const d = bookingDate.toISOString().split("T")[0];
    filteredSlots = selectedTherapist.appointments.filter((s) => s.date === d);
  }
  const categorized = filteredSlots.length ? categorizeSlots(filteredSlots) : null;

  return (
    <div className="appointment-booking">
      <style>{`
        .confirmation-section {
          background-color: #e8f5e9;
          border: 1px solid #4CAF50;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
          text-align: center;
          font-size: 1.1em;
          color: #4CAF50;
          font-weight: bold;
        }
      `}</style>

      <h2>Book an Appointment</h2>

      {/* Confirmation Message */}
      {bookingMsg && (
        <div className="confirmation-section">
          Appointment info has been sent to the therapist, waiting for confirmation.
        </div>
      )}

      {/* Select Child */}
      <div className="booking-section">
        <label>Select Child:</label>
        <div className="children-cards">
          {childrenData.length === 0 ? (
            <p>No children available.</p>
          ) : (
            childrenData.map((c) => {
              const initials = `${c.first_name[0]}${c.last_name[0]}`.toUpperCase();
              return (
                <div
                  key={c.id}
                  className={`child-card selectable ${
                    selectedChildId === c.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedChildId(c.id)}
                >
                  <div className="child-avatar">{initials}</div>
                  <div className="child-info">
                    <p className="child-name">
                      {c.first_name} {c.last_name}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="booking-3columns">
        {/* Therapist List */}
        <div className="booking-therapist">
          <label>Therapist</label>
          {availableSlots.length === 0 ? (
            <p>No therapists available.</p>
          ) : (
            <div className="therapist-row">
              {availableSlots.map((g, i) => {
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
                    <div className="therapist-initials">{initials}</div>
                    <div className="therapist-details">
                      <span className="therapist-name">{g.therapist_name}</span>
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

        {/* Calendar */}
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
                const d = date.toISOString().split("T")[0];
                return !availableDates.includes(d);
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

        {/* Timeslots */}
        <div className="booking-timeslots">
          <label>Available Times:</label>
          {selectedTherapist && bookingDate ? (
            categorized ? (
              Object.entries(categorized).map(([cat, arr]) =>
                arr.length > 0 && (
                  <div key={cat} className="timeslot-category">
                    <h4>{cat}</h4>
                    <div className="timeslot-list">
                      {arr.map((slot) => {
                        const [h, m, s] = slot.start_time.split(":").map(Number);
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
                              selectedSlot && selectedSlot.id === slot.id ? "selected" : ""
                            }`}
                            onClick={() => !isPast && setSelectedSlot(slot)}
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
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
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

      {/* Type & Reason */}
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

      {/* Final Book */}
      {selectedSlot && (
        <div className="booking-section">
          <button
            className="final-book-btn"
            onClick={async () => {
              const response = await handleFinalBooking();
              console.log("Booking response:", response);
            }}
          >
            Book Appointment
          </button>
        </div>
      )}

      <div className="booking-section">
        {bookingError && <p className="error-message">{bookingError}</p>}
        <button className="cancel-btn" onClick={resetBooking}>
          Cancel Booking
        </button>
      </div>
    </div>
  );
}