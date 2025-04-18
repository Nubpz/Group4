import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../design/StudentPage.css";

import StudentHomeTab from "./StudentHomeTab";
import MyAppointmentsTab from "./MyAppointmentsTab";
import BookAppointmentsTab from "./BookAppointmentsTab";
import StudentProfileTab from "./StudentProfileTab";
import ProfileCompletionModal from "./ProfileCompletionModal";

const StudentPage = () => {
  // ─────────── sidebar / tab ───────────
  const [selectedTab, setSelectedTab] = useState("home");

  // ─────────── data state ───────────
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ─────────── appointment details ───────────
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);

  // ─────────── booking state ───────────
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookingError, setBookingError] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [bookingDate, setBookingDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentType, setAppointmentType] = useState("virtual");
  const [reasonForVisit, setReasonForVisit] = useState("");

  // ───────── reschedule modal ─────────
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newSlotId, setNewSlotId] = useState(null);

  const navigate = useNavigate();

  // ───────── fetch available slots ─────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:3000/students/available-appointments", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched available slots:", data);
        if (data.availableAppointments) {
          setAvailableSlots(data.availableAppointments);
        } else {
          setBookingError(data.message || "Failed to load available slots.");
        }
      })
      .catch(() => setBookingError("Failed to load available slots."));
  }, []);

  // ─── when reschedule opens, preset bookingDate ───
  useEffect(() => {
    if (showRescheduleModal && appointmentToReschedule && !bookingDate) {
      setBookingDate(new Date(appointmentToReschedule.appointment_time));
    }
  }, [showRescheduleModal, appointmentToReschedule, bookingDate]);

  // ───────── get student profile ───────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    setLoading(true);
    fetch("http://localhost:3000/students/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setShowProfileModal(!data.profile.isProfileComplete);
        } else {
          setError(data.message || "Failed to fetch profile data");
        }
      })
      .catch(() => setError("Failed to fetch profile data"))
      .finally(() => setLoading(false));
  }, [navigate]);

  // ───────── fetch appointments ─────────
  useEffect(() => {
    if (selectedTab === "home" || selectedTab === "my-appointments") {
      const token = localStorage.getItem("token");
      fetch("http://localhost:3000/students/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.appointments) {
            setAppointments(
              data.appointments.filter((app) => app.status !== "cancelled")
            );
          } else {
            setError(data.message || "Failed to fetch appointments");
          }
        })
        .catch(() => setError("Failed to fetch appointments"));
    }
  }, [selectedTab]);

  // ───────── booking reset & final ─────────
  const resetBooking = () => {
    setBookingError("");
    setBookingMsg("");
    setSelectedTherapist(null);
    setBookingDate(null);
    setSelectedSlot(null);
    setAppointmentType("virtual");
    setReasonForVisit("");
  };

  const handleFinalBooking = async () => {
    if (!selectedSlot) return;
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("You must be logged in to book an appointment.");
      return;
    }
    try {
      const res = await fetch("http://localhost:3000/students/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          appointment_type: appointmentType,
          reasonForMeeting: reasonForVisit,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBookingError(data.message || "Booking failed.");
        return;
      }
      setBookingMsg("Appointment booked successfully!");
      resetBooking();
      
      // Refresh appointments list
      fetch("http://localhost:3000/students/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.appointments) {
            setAppointments(
              data.appointments.filter((app) => app.status !== "cancelled")
            );
          }
        });
    } catch (err) {
      console.error("Booking error:", err.message);
      setBookingError("Booking failed due to an error.");
    }
  };

  // ───────── cancel & reschedule ─────────
  const handleCancelAppointment = async (appointmentId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        "http://localhost:3000/students/appointments/cancel",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ appointmentId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to cancel appointment.");
        return;
      }
      alert("Appointment cancelled successfully.");
      
      // Refresh appointments list
      fetch("http://localhost:3000/students/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.appointments) {
            setAppointments(
              data.appointments.filter((app) => app.status !== "cancelled")
            );
          }
        });
    } catch (err) {
      console.error("Cancel error:", err);
      alert("Failed to cancel appointment due to an error.");
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!appointmentToReschedule || !newSlotId) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        "http://localhost:3000/students/appointments/reschedule",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            appointmentId: appointmentToReschedule.id,
            newSlotId,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Reschedule failed.");
        return;
      }
      alert("Appointment rescheduled successfully.");
      setShowRescheduleModal(false);
      setNewSlotId(null);
      setAppointmentToReschedule(null);
      
      // Refresh appointments list
      fetch("http://localhost:3000/students/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.appointments) {
            setAppointments(
              data.appointments.filter((app) => app.status !== "cancelled")
            );
          }
        });
    } catch (err) {
      console.error("Reschedule error:", err);
      alert("Reschedule failed due to an error.");
    }
  };

  // ─────────── helpers ───────────
  const getGreeting = () => {
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good Morning"
        : hour < 18
        ? "Good Afternoon"
        : "Good Evening";
    return profile && profile.first_name
      ? `${greeting}, ${profile.first_name}`
      : `${greeting}, Student`;
  };

  const categorizeSlots = (slots) => {
    if (bookingDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sel = new Date(bookingDate);
      sel.setHours(0, 0, 0, 0);
      if (sel < today) {
        return { Morning: [], Afternoon: [], Evening: [] };
      }
    }
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const selStr = bookingDate
      ? bookingDate.toISOString().split("T")[0]
      : "";
    const morning = [],
      afternoon = [],
      evening = [];
    slots.forEach((slot) => {
      if (selStr === todayStr) {
        const dt = new Date(`${selStr}T${slot.start_time}`);
        if (dt < now) return;
      }
      const h = Number(slot.start_time.split(":")[0]);
      if (h < 12) morning.push(slot);
      else if (h < 18) afternoon.push(slot);
      else evening.push(slot);
    });
    return { Morning: morning, Afternoon: afternoon, Evening: evening };
  };

  const normalizeTime = (t) => {
    const p = t.split(":");
    if (p[0].length === 1) p[0] = "0" + p[0];
    return p.join(":");
  };
  const formatTime = (t) => {
    const dt = new Date(`1970-01-01T${normalizeTime(t)}`);
    return isNaN(dt)
      ? "Invalid time"
      : dt.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
  };

  // Handle profile save from ProfileCompletionModal
  const handleProfileSave = (updatedProfile) => {
    setProfile(updatedProfile);
    setShowProfileModal(false);
  };

  // ───────── renderContent ─────────
  const renderContent = () => {
    if (loading) return <p className="loader">Loading…</p>;
    if (error) return <p className="error">{error}</p>;

    switch (selectedTab) {
      case "home":
        return (
          <StudentHomeTab
            appointments={appointments}
            availableSlots={availableSlots}
            getGreeting={getGreeting}
            profile={profile}
            setShowAppointmentDetails={setShowAppointmentDetails}
            setSelectedAppointment={setSelectedAppointment}
          />
        );
      case "my-appointments":
        return (
          <MyAppointmentsTab
            appointments={appointments}
            handleCancelAppointment={handleCancelAppointment}
            setAppointmentToReschedule={setAppointmentToReschedule}
            setShowRescheduleModal={setShowRescheduleModal}
            setSelectedTherapist={setSelectedTherapist}
            setBookingDate={setBookingDate}
            availableSlots={availableSlots}
          />
        );
      case "book-appointment":
        return (
          <BookAppointmentsTab
            availableSlots={availableSlots}
            selectedTherapist={selectedTherapist}
            setSelectedTherapist={setSelectedTherapist}
            bookingDate={bookingDate}
            setBookingDate={setBookingDate}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
            appointmentType={appointmentType}
            setAppointmentType={setAppointmentType}
            reasonForVisit={reasonForVisit}
            setReasonForVisit={setReasonForVisit}
            handleFinalBooking={handleFinalBooking}
            resetBooking={resetBooking}
            bookingError={bookingError}
            bookingMsg={bookingMsg}
            categorizeSlots={categorizeSlots}
            formatTime={formatTime}
          />
        );
      case "profile":
        return (
          <StudentProfileTab 
            profile={profile}
          />
        );
      default:
        return <p>Please select a tab.</p>;
    }
  };

  return (
    <div className="student-page">
      {/* ───────── side menu ───────── */}
      <div className="side-menu">
        <p className="greeting">{getGreeting()}</p>
        <ul>
          <li
            className={selectedTab === "home" ? "active" : ""}
            onClick={() => setSelectedTab("home")}
          >
            Home
          </li>
          <li
            className={selectedTab === "my-appointments" ? "active" : ""}
            onClick={() => setSelectedTab("my-appointments")}
          >
            My Appointments
          </li>
          <li
            className={selectedTab === "book-appointment" ? "active" : ""}
            onClick={() => setSelectedTab("book-appointment")}
          >
            Book Appointment
          </li>
          <li
            className={selectedTab === "profile" ? "active" : ""}
            onClick={() => setSelectedTab("profile")}
          >
            Profile
          </li>
        </ul>
      </div>

      {/* ───────── main content ───────── */}
      <div className="main-content">{renderContent()}</div>

      {/* ───────── Profile Completion Modal ───────── */}
      {showProfileModal && profile && (
        <ProfileCompletionModal
          profile={profile}
          onSave={handleProfileSave}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* ───────── Appointment Details Modal ───────── */}
      {showAppointmentDetails && selectedAppointment && (
        <div className="modal-overlay" onClick={() => setShowAppointmentDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Appointment Details</h2>
            <div className="appointment-details">
              <p><strong>Date:</strong> {new Date(selectedAppointment.appointment_time).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(selectedAppointment.appointment_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}</p>
              <p><strong>Therapist:</strong> {selectedAppointment.therapist_name}</p>
              <p><strong>Type:</strong> {selectedAppointment.appointment_type === "virtual" ? "Online" : "In-Person"}</p>
              {selectedAppointment.appointment_type === "virtual" && selectedAppointment.meeting_link && (
                <p><strong>Meeting Link:</strong> <a href={selectedAppointment.meeting_link} target="_blank" rel="noopener noreferrer">{selectedAppointment.meeting_link}</a></p>
              )}
              {selectedAppointment.reasonForMeeting && (
                <p><strong>Reason for Visit:</strong> {selectedAppointment.reasonForMeeting}</p>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowAppointmentDetails(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────── Reschedule Modal ───────── */}
      {showRescheduleModal && appointmentToReschedule && (
        <div
          className="modal-overlay"
          onClick={() => setShowRescheduleModal(false)}
        >
          <div
            className="modal-content reschedule-modal-content"
            style={{ width: 900 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Reschedule Appointment</h2>
            <p style={{ color: "red", paddingBottom: 10 }}>
              Booked Appointment:{" "}
              {new Date(
                appointmentToReschedule.appointment_time
              ).toLocaleString()}
            </p>
            <p
              style={{
                fontWeight: "bold",
                fontSize: 22,
                marginBottom: 15,
                color: "#2d6a4f",
              }}
            >
              Rescheduling with:{" "}
              {
                availableSlots.find(
                  (g) =>
                    g.therapist_id ===
                    appointmentToReschedule.therapist_id
                )?.therapist_name
              }
            </p>
            <div className="reschedule-2columns">
              {/* calendar */}
              <div className="reschedule-calendar">
                <label>Select New Date:</label>
                <Calendar
                  onChange={(date) => {
                    setBookingDate(date);
                    setNewSlotId(null);
                  }}
                  value={bookingDate}
                  tileDisabled={({ date, view }) => {
                    if (view !== "month") return false;
                    const today = new Date().toISOString().split("T")[0];
                    const d = date.toISOString().split("T")[0];
                    return d < today
                      ? true
                      : !availableSlots
                          .find(
                            (g) =>
                              g.therapist_id ===
                              appointmentToReschedule.therapist_id
                          )
                          ?.appointments.map((s) => s.date)
                          .includes(d);
                  }}
                />
              </div>
              {/* timeslots */}
              <div className="reschedule-timeslots">
                <label>Select New Time:</label>
                {bookingDate ? (
                  (() => {
                    const grp = availableSlots.find(
                      (g) =>
                        g.therapist_id ===
                        appointmentToReschedule.therapist_id
                    );
                    const filtered = grp
                      ? grp.appointments.filter(
                          (s) =>
                            s.date ===
                            bookingDate
                              .toISOString()
                              .split("T")[0]
                        )
                      : [];
                    const categorized = filtered.length
                      ? categorizeSlots(filtered)
                      : {
                          Morning: [],
                          Afternoon: [],
                          Evening: [],
                        };
                    return Object.entries(categorized).map(
                      ([cat, arr]) =>
                        arr.length > 0 && (
                          <div
                            key={cat}
                            className="timeslot-category"
                          >
                            <h4>{cat}</h4>
                            <div className="timeslot-list">
                              {arr.map((slot) => (
                                <button
                                  key={slot.id}
                                  className={`time-slot-btn ${
                                    newSlotId === slot.id
                                      ? "selected"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    setNewSlotId(slot.id)
                                  }
                                >
                                  {formatTime(slot.start_time)} -{" "}
                                  {formatTime(slot.end_time)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                    );
                  })()
                ) : (
                  <p>Please select a date.</p>
                )}
              </div>
            </div>
            <div style={{ marginTop: 15 }}>
              <button
                className="final-book-btn"
                onClick={handleRescheduleAppointment}
                disabled={!newSlotId}
              >
                Confirm Reschedule
              </button>
              <button
                className="cancel-btn"
                style={{ marginLeft: 10 }}
                onClick={() => setShowRescheduleModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPage;