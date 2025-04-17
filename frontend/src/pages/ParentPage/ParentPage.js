import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../design/parentsPage.css";

import HomeTab from "./HomeTab";
import AccountsTab from "./AccountsTab";
import BookingTab from "./BookingTab";

// your emailer utils (if used)
//import { send_appt_email, notify_parent_for_appt } from "../utils/emailer";

const ParentPage = () => {
  // ─────────── sidebar / tab ───────────
  const [selectedTab, setSelectedTab] = useState("home");

  // ─────────── data state ───────────
  const [childrenData, setChildrenData] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ─────────── modals & form state ───────────
  const [showModal, setShowModal] = useState(false);
  const [newChild, setNewChild] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
  });

  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [editChildData, setEditChildData] = useState({
    id: null,
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
  });

  const [showDeleteChildModal, setShowDeleteChildModal] = useState(false);
  const [childToDelete, setChildToDelete] = useState(null);

  const [childOptionsChildId, setChildOptionsChildId] = useState(null);

  // ─────────── booking state ───────────
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookingError, setBookingError] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [bookingDate, setBookingDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentType, setAppointmentType] = useState("virtual");
  const [reasonForVisit, setReasonForVisit] = useState("");

  // ───────── child‐appointments state ─────────
  const [childAppointments, setChildAppointments] = useState({
    upcoming: [],
    past: [],
  });

  // ───────── reschedule modal ─────────
  const [appointmentToReschedule, setAppointmentToReschedule] =
    useState(null);
  const [showRescheduleModal, setShowRescheduleModal] =
    useState(false);
  const [newSlotId, setNewSlotId] = useState(null);

  const navigate = useNavigate();

  // ───────── fetch available slots ─────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:3000/parents/available-appointments", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
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
    if (
      showRescheduleModal &&
      appointmentToReschedule &&
      !bookingDate
    ) {
      setBookingDate(
        new Date(appointmentToReschedule.appointment_time)
      );
    }
  }, [showRescheduleModal, appointmentToReschedule, bookingDate]);

  // ───────── Add Child handlers ─────────
  const handleChildInputChange = (e) =>
    setNewChild({ ...newChild, [e.target.name]: e.target.value });

  const handleAddChildSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to add a child.");
      return;
    }
    if (
      !newChild.firstName ||
      !newChild.lastName ||
      !newChild.dateOfBirth ||
      !newChild.gender
    ) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const res = await fetch(
        "http://localhost:3000/parents/children",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newChild),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to add child.");
        return;
      }
      setChildrenData([...childrenData, data.child]);
      if (!selectedChildId) setSelectedChildId(data.child.id);
      setShowModal(false);
    } catch {
      setError("Failed to add child.");
    }
  };

  // ───────── Edit Child handlers ──────────
  const openEditChildModal = (child) => {
    setEditChildData({
      id: child.id,
      firstName: child.first_name,
      lastName: child.last_name,
      dateOfBirth: child.date_of_birth,
      gender: child.gender,
    });
    setShowEditChildModal(true);
    setChildOptionsChildId(null);
  };
  const handleEditChildInputChange = (e) =>
    setEditChildData({
      ...editChildData,
      [e.target.name]: e.target.value,
    });
  const handleEditChildSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to edit a child.");
      return;
    }
    if (
      !editChildData.firstName ||
      !editChildData.lastName ||
      !editChildData.dateOfBirth ||
      !editChildData.gender
    ) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:3000/parents/children/${editChildData.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName: editChildData.firstName,
            lastName: editChildData.lastName,
            dateOfBirth: editChildData.dateOfBirth,
            gender: editChildData.gender,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to edit child.");
        return;
      }
      setChildrenData((prev) =>
        prev.map((c) =>
          c.id === editChildData.id ? data.child : c
        )
      );
      setShowEditChildModal(false);
    } catch {
      setError("Failed to edit child account due to an error.");
    }
  };

  // ───────── Delete Child handlers ────────
  const openDeleteChildModal = (child) => {
    setChildToDelete(child);
    setShowDeleteChildModal(true);
    setChildOptionsChildId(null);
  };
  const handleDeleteChildConfirm = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `http://localhost:3000/parents/children/${childToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to delete child.");
        return;
      }
      setChildrenData((prev) =>
        prev.filter((c) => c.id !== childToDelete.id)
      );
      if (selectedChildId === childToDelete.id)
        setSelectedChildId("");
      setShowDeleteChildModal(false);
    } catch {
      setError("Failed to delete child account due to an error.");
    }
  };

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
    if (!selectedChildId) {
      console.error("Please select a child to book for.");
      return;
    }
    try {
      const res = await fetch(
        "http://localhost:3000/parents/appointments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            slotId: selectedSlot.id,
            childId: selectedChildId,
            appointment_type: appointmentType,
            reasonForMeeting: reasonForVisit,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setBookingError(data.message || "Booking failed.");
        return;
      }
      setBookingMsg("Appointment booked successfully!");
      resetBooking();
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
        "http://localhost:3000/parents/appointments/cancel",
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
      fetchChildAppointments();
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
        "http://localhost:3000/parents/appointments/reschedule",
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
      fetchChildAppointments();
    } catch (err) {
      console.error("Reschedule error:", err);
      alert("Reschedule failed due to an error.");
    }
  };

  // ───────── parent profile ───────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    setLoading(true);
    fetch("http://localhost:3000/parents/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
        else setError(data.message || "Failed to fetch profile data");
      })
      .catch(() => setError("Failed to fetch profile data"))
      .finally(() => setLoading(false));
  }, [navigate]);

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
      : `${greeting}, Parent`;
  };

  // ───────── fetch children ───────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    if (childrenData.length === 0) {
      fetch("http://localhost:3000/parents/children", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.children) {
            setChildrenData(data.children);
            if (data.children.length > 0 && !selectedChildId) {
              setSelectedChildId(data.children[0].id);
            }
          } else {
            setError(data.message || "Failed to fetch children data");
          }
        })
        .catch(() => setError("Failed to fetch children data"));
    }
  }, [childrenData, navigate, selectedChildId]);

  // ───────── home appointments ─────────
  useEffect(() => {
    if (selectedTab === "home") {
      const token = localStorage.getItem("token");
      fetch("http://localhost:3000/parents/appointments", {
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
  }, [selectedTab, navigate]);

  // ───────── fetch child appointments ─────────
  const fetchChildAppointments = useCallback(() => {
    if (selectedTab === "accounts" && selectedChildId) {
      const token = localStorage.getItem("token");
      fetch(
        `http://localhost:3000/parents/child-appointments/${selectedChildId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.upcoming !== undefined && data.past !== undefined) {
            setChildAppointments({
              upcoming: data.upcoming,
              past: data.past,
            });
          } else {
            setChildAppointments({ upcoming: [], past: [] });
          }
        })
        .catch(() =>
          setChildAppointments({ upcoming: [], past: [] })
        );
    }
  }, [selectedTab, selectedChildId]);

  useEffect(() => {
    fetchChildAppointments();
  }, [fetchChildAppointments]);

  // ─────────── helpers ───────────
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

  // ───────── renderContent ─────────
  const renderContent = () => {
    if (loading) return <p className="loader">Loading…</p>;
    if (error) return <p className="error">{error}</p>;

    switch (selectedTab) {
      case "home":
        return (
          <HomeTab
            appointments={appointments}
            childrenData={childrenData}
            availableSlots={availableSlots}
            getGreeting={getGreeting}
          />
        );
      case "accounts":
        return (
          <AccountsTab
            childrenData={childrenData}
            childAppointments={childAppointments}
            selectedChildId={selectedChildId}
            setSelectedChildId={setSelectedChildId}
            setShowModal={setShowModal}
            openEditChildModal={openEditChildModal}
            openDeleteChildModal={openDeleteChildModal}
            childOptionsChildId={childOptionsChildId}
            setChildOptionsChildId={setChildOptionsChildId}
            handleCancelAppointment={handleCancelAppointment}
            setAppointmentToReschedule={setAppointmentToReschedule}
            setShowRescheduleModal={setShowRescheduleModal}
            setBookingDate={setBookingDate}
            setSelectedTherapist={setSelectedTherapist}
            availableSlots={availableSlots}
          />
        );
      case "appointments":
        return (
          <BookingTab
            selectedChildId={selectedChildId}
            setSelectedChildId={setSelectedChildId}
            childrenData={childrenData}
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
          <div className="profile-tab">
            <h2>Your Profile</h2>
            {profile ? (
              <div className="profile-details">
                <p>
                  <strong>Email:</strong> {profile.username}
                </p>
                <p>
                  <strong>Name:</strong> {profile.first_name}{" "}
                  {profile.last_name}
                </p>
                {profile.date_of_birth && (
                  <p>
                    <strong>Date of Birth:</strong>{" "}
                    {profile.date_of_birth}
                  </p>
                )}
                <button className="edit-profile-btn">
                  Edit Profile
                </button>
              </div>
            ) : (
              <p>No profile data found.</p>
            )}
          </div>
        );
      default:
        return <p>Please select a tab.</p>;
    }
  };

  return (
    <div className="parents-page">
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
            className={selectedTab === "accounts" ? "active" : ""}
            onClick={() => setSelectedTab("accounts")}
          >
            Child Accounts
          </li>
          <li
            className={selectedTab === "appointments" ? "active" : ""}
            onClick={() => setSelectedTab("appointments")}
          >
            Book Appointments
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

      {/* ───────── Add Child Modal ───────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Child</h2>
            <form onSubmit={handleAddChildSubmit}>
              <div className="input-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Child's first name"
                  value={newChild.firstName}
                  onChange={handleChildInputChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Child's last name"
                  value={newChild.lastName}
                  onChange={handleChildInputChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={newChild.dateOfBirth}
                  onChange={handleChildInputChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Gender</label>
                <select
                  name="gender"
                  value={newChild.gender}
                  onChange={handleChildInputChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="modal-btn">
                  Add Child
                </button>
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────── Edit Child Modal ───────── */}
      {showEditChildModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowEditChildModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Child</h2>
            <form onSubmit={handleEditChildSubmit}>
              <div className="input-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Child's first name"
                  value={editChildData.firstName}
                  onChange={handleEditChildInputChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Child's last name"
                  value={editChildData.lastName}
                  onChange={handleEditChildInputChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={editChildData.dateOfBirth}
                  onChange={handleEditChildInputChange}
                  required
                />
              </div>
              <div className="input-group">
                <label>Gender</label>
                <select
                  name="gender"
                  value={editChildData.gender}
                  onChange={handleEditChildInputChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="modal-btn">
                  Update Child
                </button>
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setShowEditChildModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────── Delete Child Confirmation ───────── */}
      {showDeleteChildModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteChildModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 400 }}
          >
            <h2>Delete Child Account</h2>
            <p>Are you sure you want to delete this child account?</p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 15,
              }}
            >
              <button
                onClick={handleDeleteChildConfirm}
                style={{
                  backgroundColor: "#e74c3c",
                  color: "#fff",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteChildModal(false)}
                style={{
                  backgroundColor: "#95a5a6",
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

export default ParentPage;
