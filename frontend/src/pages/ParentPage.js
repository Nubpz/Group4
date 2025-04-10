import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./design/parentsPage.css";

const ParentPage = () => {
  // Sidebar/tab state: "home", "accounts", "appointments", "profile"
  const [selectedTab, setSelectedTab] = useState("home");

  // Data states
  const [childrenData, setChildrenData] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // "Add Child" modal state
  const [showModal, setShowModal] = useState(false);
  const [newChild, setNewChild] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: ""
  });

  // New state for Edit Child modal
  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [editChildData, setEditChildData] = useState({
    id: null,
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: ""
  });

  // New state for Delete Child confirmation modal
  const [showDeleteChildModal, setShowDeleteChildModal] = useState(false);
  const [childToDelete, setChildToDelete] = useState(null);

  // For showing dropdown options (three dots) per child
  const [childOptionsChildId, setChildOptionsChildId] = useState(null);

  // Booking appointment states (for booking UI in Appointments tab)
  const [availableSlots, setAvailableSlots] = useState([]); // Grouped by therapist from backend
  const [bookingError, setBookingError] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedTherapist, setSelectedTherapist] = useState(null); // For booking/reschedule UI
  const [bookingDate, setBookingDate] = useState(null); // For booking/reschedule date
  const [selectedSlot, setSelectedSlot] = useState(null); // Chosen slot for booking
  const [appointmentType, setAppointmentType] = useState("virtual");
  const [reasonForVisit, setReasonForVisit] = useState("");

  // Child appointments (Accounts tab)
  const [childAppointments, setChildAppointments] = useState({ upcoming: [], past: [] });

  // For Reschedule modal
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newSlotId, setNewSlotId] = useState(null);

  const navigate = useNavigate();

  // Fetch available slots on mount
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

  // When reschedule modal opens, set bookingDate to the appointment's date if not set
  useEffect(() => {
    if (showRescheduleModal && appointmentToReschedule && !bookingDate) {
      setBookingDate(new Date(appointmentToReschedule.appointment_time));
    }
  }, [showRescheduleModal, appointmentToReschedule, bookingDate]);

  /* HANDLERS FOR "ADD CHILD" MODAL */
  const handleChildInputChange = (e) => {
    setNewChild({ ...newChild, [e.target.name]: e.target.value });
  };

  const handleAddChildSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to add a child.");
      return;
    }
    if (!newChild.firstName || !newChild.lastName || !newChild.dateOfBirth || !newChild.gender) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const response = await fetch("http://localhost:3000/parents/children", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newChild),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to add child.");
        return;
      }
      setChildrenData([...childrenData, data.child]);
      if (!selectedChildId) setSelectedChildId(data.child.id);
      setShowModal(false);
    } catch (err) {
      setError("Failed to add child.");
    }
  };

  /* HANDLERS FOR EDIT CHILD MODAL */
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

  const handleEditChildInputChange = (e) => {
    setEditChildData({ ...editChildData, [e.target.name]: e.target.value });
  };

  const handleEditChildSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to edit a child.");
      return;
    }
    if (!editChildData.firstName || !editChildData.lastName || !editChildData.dateOfBirth || !editChildData.gender) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const response = await fetch(
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
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to edit child.");
        return;
      }
      // Update the child in state
      setChildrenData((prev) =>
        prev.map((c) => (c.id === editChildData.id ? data.child : c))
      );
      setShowEditChildModal(false);
    } catch (err) {
      setError("Failed to edit child account due to an error.");
    }
  };

  /* HANDLERS FOR DELETE CHILD MODAL */
  const openDeleteChildModal = (child) => {
    setChildToDelete(child);
    setShowDeleteChildModal(true);
    setChildOptionsChildId(null);
  };

  const handleDeleteChildConfirm = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:3000/parents/children/${childToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to delete child.");
        return;
      }
      // Remove the child from state and clear selected if needed
      setChildrenData((prev) => prev.filter((child) => child.id !== childToDelete.id));
      if (selectedChildId === childToDelete.id) setSelectedChildId("");
      setShowDeleteChildModal(false);
    } catch (err) {
      setError("Failed to delete child account due to an error.");
    }
  };

  /* RESET BOOKING UI */
  const resetBooking = () => {
    setBookingError("");
    setBookingMsg("");
    setSelectedTherapist(null);
    setBookingDate(null);
    setSelectedSlot(null);
    setAppointmentType("virtual");
    setReasonForVisit("");
  };

  /* FINAL BOOKING HANDLER */
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
      const response = await fetch("http://localhost:3000/parents/appointments", {
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
      });
      const data = await response.json();
      if (!response.ok) {
        setBookingError(data.message || "Booking failed.");
        return;
      }
      setBookingMsg("Appointment booked successfully!");
      resetBooking();
      // Optionally refresh appointments for home tab here.
    } catch (err) {
      console.error("Booking error:", err.message);
      setBookingError("Booking failed due to an error.");
    }
  };

  /* CANCEL APPOINTMENT HANDLER */
  const handleCancelAppointment = async (appointmentId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://localhost:3000/parents/appointments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId }),
      });
      const data = await response.json();
      if (!response.ok) {
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

  /* RESCHEDULE APPOINTMENT HANDLER */
  const handleRescheduleAppointment = async () => {
    if (!appointmentToReschedule || !newSlotId) return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://localhost:3000/parents/appointments/reschedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId: appointmentToReschedule.id,
          newSlotId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
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

  /* FETCH PARENT PROFILE */
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
        if (data.profile) {
          setProfile(data.profile);
        } else {
          setError(data.message || "Failed to fetch profile data");
        }
      })
      .catch((err) => {
        console.error("Error fetching profile:", err);
        setError("Failed to fetch profile data");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const greeting =
      hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    return profile && profile.first_name
      ? `${greeting}, ${profile.first_name}`
      : `${greeting}, Parent`;
  };

  /* FETCH CHILDREN DATA */
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

  /* FETCH APPOINTMENTS FOR HOME TAB */
  useEffect(() => {
    if (selectedTab === "home") {
      const token = localStorage.getItem("token");
      fetch("http://localhost:3000/parents/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.appointments) {
            // Filter out appointments with status "cancelled"
            setAppointments(data.appointments.filter((app) => app.status !== "cancelled"));
          } else {
            setError(data.message || "Failed to fetch appointments");
          }
        })
        .catch(() => setError("Failed to fetch appointments"));
    }
  }, [selectedTab, navigate]);

  /* FETCH APPOINTMENTS FOR A SPECIFIC CHILD */
  const fetchChildAppointments = useCallback(() => {
    if (selectedTab === "accounts" && selectedChildId) {
      const token = localStorage.getItem("token");
      fetch(`http://localhost:3000/parents/child-appointments/${selectedChildId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.upcoming !== undefined && data.past !== undefined) {
            setChildAppointments({ upcoming: data.upcoming, past: data.past });
          } else {
            setChildAppointments({ upcoming: [], past: [] });
          }
        })
        .catch((err) => {
          console.error("Error fetching child appointments:", err);
          setChildAppointments({ upcoming: [], past: [] });
        });
    }
  }, [selectedTab, selectedChildId]);

  useEffect(() => {
    fetchChildAppointments();
  }, [fetchChildAppointments]);

  /* Utility: Categorize Slots into Morning, Afternoon, Evening */
  const categorizeSlots = (slots) => {
    if (bookingDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(bookingDate);
      selected.setHours(0, 0, 0, 0);
      if (selected < today) {
        return { Morning: [], Afternoon: [], Evening: [] };
      }
    }
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const selectedDateStr = bookingDate ? bookingDate.toISOString().split("T")[0] : "";
    const morning = [];
    const afternoon = [];
    const evening = [];
    slots.forEach((slot) => {
      if (selectedDateStr === todayStr) {
        const slotDateTime = new Date(`${selectedDateStr}T${slot.start_time}`);
        if (slotDateTime < now) return;
      }
      const hour = parseInt(slot.start_time.split(":")[0], 10);
      if (hour < 12) morning.push(slot);
      else if (hour < 18) afternoon.push(slot);
      else evening.push(slot);
    });
    return { Morning: morning, Afternoon: afternoon, Evening: evening };
  };

  /* Utility: Normalize and Format Time with AM/PM */
  const normalizeTime = (timeStr) => {
    const parts = timeStr.split(":");
    if (parts.length >= 2 && parts[0].length === 1) {
      parts[0] = "0" + parts[0];
    }
    return parts.join(":");
  };

  const formatTime = (timeStr) => {
    const normalizedTime = normalizeTime(timeStr);
    const dateObj = new Date(`1970-01-01T${normalizedTime}`);
    if (isNaN(dateObj.getTime())) {
      return "Invalid time";
    }
    return dateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };

  /* Render Home Tab: Upcoming & Past Appointments */
  const renderHome = () => {
    const now = new Date();
    const upcoming = appointments.filter((app) => new Date(app.appointment_time) >= now);
    const past = appointments.filter((app) => new Date(app.appointment_time) < now);
    return (
      <div className="home-tab">
        <h2>Welcome to Your Dashboard</h2>
        <div className="appointments-group">
          <h3>Upcoming Appointments</h3>
          {upcoming.length === 0 ? (
            <p>No upcoming appointments.</p>
          ) : (
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Therapist</th>
                  <th>Child</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((app, index) => (
                  <tr key={app.id}>
                    <td>{index + 1}</td>
                    <td>{new Date(app.appointment_time).toLocaleDateString()}</td>
                    <td>{new Date(app.appointment_time).toLocaleTimeString()}</td>
                    <td>{app.therapist_name}</td>
                    <td>{app.child_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="appointments-group">
          <h3>Past Appointments</h3>
          {past.length === 0 ? (
            <p>No past appointments.</p>
          ) : (
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Therapist</th>
                  <th>Child</th>
                </tr>
              </thead>
              <tbody>
                {past.map((app, index) => (
                  <tr key={app.id}>
                    <td>{index + 1}</td>
                    <td>{new Date(app.appointment_time).toLocaleDateString()}</td>
                    <td>{new Date(app.appointment_time).toLocaleTimeString()}</td>
                    <td>{app.therapist_name}</td>
                    <td>{app.child_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  /* Render Accounts Tab: Children Cards and Selected Child's Appointments */
  const renderAccounts = () => {
    const getSelectedChildName = () => {
      const child = childrenData.find((c) => c.id === selectedChildId);
      return child ? `${child.first_name} ${child.last_name}` : "";
    };

    return (
      <div className="accounts-tab">
        <div className="accounts-header">
          <h2>Children Accounts</h2>
          <button className="add-child-btn" onClick={() => setShowModal(true)}>
            Add Child
          </button>
        </div>
        {childrenData.length === 0 ? (
          <p>No children linked to your account.</p>
        ) : (
          <div className="children-cards">
            {childrenData.map((child) => {
              const initials = `${child.first_name.charAt(0)}${child.last_name.charAt(0)}`.toUpperCase();
              return (
                <div
                  key={child.id}
                  className={`child-card selectable ${selectedChildId === child.id ? "selected" : ""}`}
                  onClick={() => setSelectedChildId(child.id)}
                  style={{ position: "relative" }}
                >
                  <div className="child-avatar">{initials}</div>
                  <div className="child-info">
                    <p className="child-name">
                      {child.first_name} {child.last_name}
                    </p>
                    <p className="child-dob">{child.date_of_birth}</p>
                  </div>
                  {/* Three dots for edit/delete options */}
                  <div style={{ position: "absolute", top: "5px", right: "5px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChildOptionsChildId(child.id === childOptionsChildId ? null : child.id);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "18px",
                      }}
                    >
                      &#8942;
                    </button>
                    {childOptionsChildId === child.id && (
                      <div
                        style={{
                          position: "absolute",
                          top: "25px",
                          right: "0",
                          background: "#fff",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          boxShadow: "0px 2px 6px rgba(0,0,0,0.1)",
                          zIndex: 10,
                        }}
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditChildModal(child);
                          }}
                          style={{
                            padding: "5px 10px",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteChildModal(child);
                          }}
                          style={{
                            padding: "5px 10px",
                            cursor: "pointer",
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
            <h3 style={{ marginTop: "25px", marginBottom: "15px" }}>
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
                    {childAppointments.upcoming.map((app, index) => (
                      <tr key={app.id}>
                        <td>{index + 1}</td>
                        <td>{new Date(app.appointment_time).toLocaleDateString()}</td>
                        <td>{new Date(app.appointment_time).toLocaleTimeString()}</td>
                        <td>{app.therapist_name}</td>
                        <td>
                          <button
                            onClick={() => handleCancelAppointment(app.id)}
                            style={{
                              marginRight: "25px",
                              backgroundColor: "#e74c3c",
                              color: "#fff",
                              padding: "10px 16px",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Cancel Appointment
                          </button>
                          <button
                            onClick={() => {
                              setAppointmentToReschedule(app);
                              setShowRescheduleModal(true);
                              setBookingDate(new Date(app.appointment_time));
                              const group = availableSlots.find(
                                (g) => g.therapist_id === app.therapist_id
                              );
                              if (group) setSelectedTherapist(group);
                            }}
                            style={{
                              backgroundColor: "#f39c12",
                              color: "#fff",
                              padding: "10px 16px",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Reschedule Appointment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="appointments-group">
              <h4 style={{ marginTop: "25px", marginBottom: "15px" }}>
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
                    {childAppointments.past.map((app, index) => (
                      <tr key={app.id}>
                        <td>{index + 1}</td>
                        <td>{new Date(app.appointment_time).toLocaleDateString()}</td>
                        <td>{new Date(app.appointment_time).toLocaleTimeString()}</td>
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
  };

  /* Render Appointments Tab: Booking UI (3-Column Layout) */
  const renderBookingUI = () => {
    let availableDates = [];
    if (selectedTherapist) {
      availableDates = Array.from(new Set(selectedTherapist.appointments.map((slot) => slot.date)));
      const todayStr = new Date().toISOString().split("T")[0];
      availableDates = availableDates.filter((dateStr) => dateStr >= todayStr);
    }
    let filteredSlots = [];
    if (selectedTherapist && bookingDate) {
      const selectedDateStr = bookingDate.toISOString().split("T")[0];
      filteredSlots = selectedTherapist.appointments.filter((slot) => slot.date === selectedDateStr);
    }
    const categorizedSlots = filteredSlots.length ? categorizeSlots(filteredSlots) : null;

    return (
      <div className="appointment-booking">
        <h2>Book an Appointment</h2>
        {/* Child Cards */}
        <div className="booking-section">
          <label>Select Child:</label>
          <div className="children-cards">
            {childrenData.length === 0 ? (
              <p>No children available.</p>
            ) : (
              childrenData.map((child) => {
                const initials = `${child.first_name.charAt(0)}${child.last_name.charAt(0)}`.toUpperCase();
                return (
                  <div
                    key={child.id}
                    className={`child-card selectable ${selectedChildId === child.id ? "selected" : ""}`}
                    onClick={() => setSelectedChildId(child.id)}
                  >
                    <div className="child-avatar">{initials}</div>
                    <div className="child-info">
                      <p className="child-name">{child.first_name} {child.last_name}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        {/* 3-Column Layout for Booking */}
        <div className="booking-3columns">
          {/* Column 1: Therapist Section (Vertical List) */}
          <div className="booking-therapist">
            <label>Therapist</label>
            {availableSlots.length === 0 ? (
              <p>No therapists available.</p>
            ) : (
              <div className="therapist-row">
                {availableSlots.map((group, idx) => (
                  <div
                    key={idx}
                    className={`therapist-row-item selectable ${
                      selectedTherapist &&
                      selectedTherapist.therapist_name === group.therapist_name
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedTherapist(group);
                      setBookingDate(null);
                      setSelectedSlot(null);
                    }}
                  >
                    <div className="therapist-initials">
                      {group.therapist_name.split(" ").map((n) => n.charAt(0)).join("")}
                    </div>
                    <div className="therapist-details">
                      <span className="therapist-name">{group.therapist_name}</span>
                      <span className="therapist-description">Certified Therapist</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Column 2: Calendar */}
          <div className="booking-calendar">
            <label>Select Date:</label>
            {selectedTherapist ? (
              <Calendar
                onChange={setBookingDate}
                value={bookingDate}
                tileDisabled={({ date, view }) => {
                  if (view !== "month") return false;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const d = new Date(date);
                  d.setHours(0, 0, 0, 0);
                  if (d < today) return true;
                  const dateStr = date.toISOString().split("T")[0];
                  return !availableDates.includes(dateStr);
                }}
              />
            ) : (
              <Calendar disabled />
            )}
            {!selectedTherapist && (
              <p className="info-message">Please select a therapist to view dates.</p>
            )}
          </div>
          {/* Column 3: Available Times */}
          <div className="booking-timeslots">
            <label>Available Times:</label>
            {selectedTherapist && bookingDate ? (
              categorizedSlots ? (
                <div className="timeslot-categories">
                  {categorizedSlots.Morning.length > 0 && (
                    <div className="timeslot-category">
                      <h4>Morning</h4>
                      <div className="timeslot-list">
                        {categorizedSlots.Morning.map((slot) => (
                          <button
                            key={slot.id}
                            className={`time-slot-btn ${
                              selectedSlot && selectedSlot.id === slot.id ? "selected" : ""
                            }`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {categorizedSlots.Afternoon.length > 0 && (
                    <div className="timeslot-category">
                      <h4>Afternoon</h4>
                      <div className="timeslot-list">
                        {categorizedSlots.Afternoon.map((slot) => (
                          <button
                            key={slot.id}
                            className={`time-slot-btn ${
                              selectedSlot && selectedSlot.id === slot.id ? "selected" : ""
                            }`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {categorizedSlots.Evening.length > 0 && (
                    <div className="timeslot-category">
                      <h4>Evening</h4>
                      <div className="timeslot-list">
                        {categorizedSlots.Evening.map((slot) => (
                          <button
                            key={slot.id}
                            className={`time-slot-btn ${
                              selectedSlot && selectedSlot.id === slot.id ? "selected" : ""
                            }`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p>No available slots on this date.</p>
              )
            ) : (
              <p>Please select a therapist and a date.</p>
            )}
          </div>
        </div>
        {/* Appointment Options (Type & Reason) */}
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
            placeholder="Enter the purpose of your visit..."
          />
        </div>
        {/* Final Booking Button */}
        {selectedSlot && (
          <div className="booking-section">
            <button className="final-book-btn" onClick={handleFinalBooking}>
              Book Appointment
            </button>
          </div>
        )}
        <div className="booking-section">
          {bookingError && <p className="error-message">{bookingError}</p>}
          {bookingMsg && <p className="confirmation-msg">{bookingMsg}</p>}
          <button className="cancel-btn" onClick={resetBooking}>
            Cancel Booking
          </button>
        </div>
      </div>
    );
  };

  /* Render Reschedule Modal (2-column layout) */
  const renderRescheduleModal = () => {
    console.log("Full Available Slots:", availableSlots);
    console.log("Appointment to Reschedule:", appointmentToReschedule);

    const groupForTherapist = availableSlots.find(
      (g) => g.therapist_id === appointmentToReschedule.therapist_id
    );
    console.log("Group for Therapist:", groupForTherapist);

    const therapistName = groupForTherapist ? groupForTherapist.therapist_name : "Unknown Therapist";
    const todayStr = new Date().toISOString().split("T")[0];
    const availableDates = groupForTherapist
      ? Array.from(new Set(groupForTherapist.appointments.map((slot) => slot.date))).filter(
          (dateStr) => dateStr >= todayStr
        )
      : [];
    let filteredSlots = [];
    if (groupForTherapist && bookingDate) {
      const selectedDateStr = bookingDate.toISOString().split("T")[0];
      filteredSlots = groupForTherapist.appointments.filter((slot) => slot.date === selectedDateStr);
    }
    const categorizedSlots = filteredSlots.length
      ? categorizeSlots(filteredSlots)
      : { Morning: [], Afternoon: [], Evening: [] };

    console.log("Categorized Slots:", categorizedSlots);

    return (
      <div className="modal-overlay" onClick={() => setShowRescheduleModal(false)}>
        <div
          className="modal-content reschedule-modal-content"
          style={{ width: "900px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2>Reschedule Appointment</h2>
          <p style={{ color: "red", paddingBottom: "10px" }}>
            Booked Appointment: {new Date(appointmentToReschedule.appointment_time).toLocaleString()}
          </p>
          <p
            style={{
              fontWeight: "bold",
              fontSize: "22px",
              marginBottom: "15px",
              color: "#2d6a4f",
            }}
          >
            Rescheduling with: {therapistName}
          </p>
          <div className="reschedule-2columns">
            {/* Column 1: Calendar */}
            <div className="reschedule-calendar">
              <label>Select New Date:</label>
              {groupForTherapist ? (
                <Calendar
                  onChange={(date) => {
                    console.log("Reschedule modal - new date selected:", date);
                    setBookingDate(date);
                    setNewSlotId(null);
                  }}
                  value={bookingDate}
                  tileDisabled={({ date, view }) => {
                    if (view !== "month") return false;
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    const dateStr = d.toISOString().split("T")[0];
                    if (d < new Date(todayStr)) return true;
                    return !availableDates.includes(dateStr);
                  }}
                />
              ) : (
                <Calendar disabled />
              )}
            </div>
            {/* Column 2: Available Times */}
            <div className="reschedule-timeslots">
              <label>Select New Time:</label>
              {groupForTherapist && bookingDate ? (
                Object.values(categorizedSlots).some((arr) => arr.length > 0) ? (
                  <div className="timeslot-categories">
                    {categorizedSlots.Morning.length > 0 && (
                      <div className="timeslot-category">
                        <h4>Morning</h4>
                        <div className="timeslot-list">
                          {categorizedSlots.Morning.map((slot) => (
                            <button
                              key={slot.id}
                              className={`time-slot-btn ${newSlotId === slot.id ? "selected" : ""}`}
                              onClick={() => {
                                console.log("Selected Slot:", slot);
                                setNewSlotId(slot.id);
                              }}
                            >
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {categorizedSlots.Afternoon.length > 0 && (
                      <div className="timeslot-category">
                        <h4>Afternoon</h4>
                        <div className="timeslot-list">
                          {categorizedSlots.Afternoon.map((slot) => (
                            <button
                              key={slot.id}
                              className={`time-slot-btn ${newSlotId === slot.id ? "selected" : ""}`}
                              onClick={() => setNewSlotId(slot.id)}
                            >
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {categorizedSlots.Evening.length > 0 && (
                      <div className="timeslot-category">
                        <h4>Evening</h4>
                        <div className="timeslot-list">
                          {categorizedSlots.Evening.map((slot) => (
                            <button
                              key={slot.id}
                              className={`time-slot-btn ${newSlotId === slot.id ? "selected" : ""}`}
                              onClick={() => setNewSlotId(slot.id)}
                            >
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>No available slots on this date.</p>
                )
              ) : (
                <p>Please select a date.</p>
              )}
            </div>
          </div>
          <div style={{ marginTop: "15px" }}>
            <button
              className="final-book-btn"
              onClick={handleRescheduleAppointment}
              disabled={!newSlotId}
            >
              Confirm Reschedule
            </button>
            <button
              className="cancel-btn"
              onClick={() => setShowRescheduleModal(false)}
              style={{ marginLeft: "10px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* Render Profile Tab */
  const renderProfile = () => (
    <div className="profile-tab">
      <h2>Your Profile</h2>
      {profile ? (
        <div className="profile-details">
          <p>
            <strong>Email:</strong> {profile.username}
          </p>
          <p>
            <strong>Name:</strong> {profile.first_name} {profile.last_name}
          </p>
          {profile.date_of_birth && (
            <p>
              <strong>Date of Birth:</strong> {profile.date_of_birth}
            </p>
          )}
          <button className="edit-profile-btn">Edit Profile</button>
        </div>
      ) : (
        <p>No profile data found.</p>
      )}
    </div>
  );

  /* Render Main Content Based on Selected Tab */
  const renderContent = () => {
    if (loading) return <p className="loader">Loading...</p>;
    if (error) return <p className="error">{error}</p>;
    switch (selectedTab) {
      case "home":
        return renderHome();
      case "accounts":
        return renderAccounts();
      case "appointments":
        return renderBookingUI();
      case "profile":
        return renderProfile();
      default:
        return <p>Please select a tab.</p>;
    }
  };

  return (
    <div className="parents-page">
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
      <div className="main-content">{renderContent()}</div>

      {/* Add Child Modal */}
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
                <button type="submit" className="modal-btn">Add Child</button>
                <button type="button" className="modal-btn cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Child Modal */}
      {showEditChildModal && (
        <div className="modal-overlay" onClick={() => setShowEditChildModal(false)}>
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
                <button type="submit" className="modal-btn">Update Child</button>
                <button type="button" className="modal-btn cancel-btn" onClick={() => setShowEditChildModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Child Confirmation Modal */}
      {showDeleteChildModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteChildModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "400px" }}>
            <h2>Delete Child Account</h2>
            <p>Are you sure you want to delete this child account?</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
              <button
                onClick={handleDeleteChildConfirm}
                style={{
                  backgroundColor: "#e74c3c",
                  color: "#fff",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
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
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && appointmentToReschedule && renderRescheduleModal()}
    </div>
  );
};

export default ParentPage;
