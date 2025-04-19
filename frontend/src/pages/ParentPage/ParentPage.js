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

  // ─────────── profile state ───────────
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phoneNumber: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", message: "" });
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [showProfileCompleteModal, setShowProfileCompleteModal] = useState(false);

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
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
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
    if (showRescheduleModal && appointmentToReschedule && !bookingDate) {
      setBookingDate(new Date(appointmentToReschedule.appointment_time));
    }
  }, [showRescheduleModal, appointmentToReschedule, bookingDate]);

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
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.message || `HTTP error! Status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          // Check if profile is incomplete (missing DOB, gender, or phone number)
          if (!data.profile.date_of_birth || !data.profile.gender || !data.profile.phone_number) {
            setIsProfileIncomplete(true);
            setShowProfileCompleteModal(true); // Open the modal
            setSelectedTab("profile"); // Redirect to Profile Tab
            setEditProfileData({
              firstName: data.profile.first_name || "",
              lastName: data.profile.last_name || "",
              dateOfBirth: data.profile.date_of_birth || "",
              gender: data.profile.gender || "",
              phoneNumber: data.profile.phone_number || "",
            });
          } else {
            setIsProfileIncomplete(false);
            setShowProfileCompleteModal(false);
          }
        } else {
          setError(data.message || "Failed to fetch profile data");
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to fetch profile data");
      })
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
      const res = await fetch("http://localhost:3000/parents/children", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newChild),
      });
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
        prev.map((c) => (c.id === editChildData.id ? data.child : c))
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
      if (selectedChildId === childToDelete.id) setSelectedChildId("");
      setShowDeleteChildModal(false);
    } catch {
      setError("Failed to delete child account due to an error.");
    }
  };

  // ───────── Profile handlers ─────────
  const handleEditProfileClick = () => {
    setEditProfileData({
      firstName: profile.first_name,
      lastName: profile.last_name,
      dateOfBirth: profile.date_of_birth || "",
      gender: profile.gender || "",
      phoneNumber: profile.phone_number || "",
    });
    setIsEditingProfile(true);
    setProfileMessage({ type: "", message: "" });
  };

  const handleEditProfileChange = (e) => {
    setEditProfileData({
      ...editProfileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setProfileMessage({ type: "error", message: "You must be logged in to update your profile." });
      return;
    }
    if (
      !editProfileData.firstName ||
      !editProfileData.lastName ||
      !editProfileData.dateOfBirth ||
      !editProfileData.gender ||
      !editProfileData.phoneNumber
    ) {
      setProfileMessage({ type: "error", message: "Please fill in all fields." });
      return;
    }
    try {
      console.log("Profile update data:", {
        firstName: editProfileData.firstName,
        lastName: editProfileData.lastName,
        dateOfBirth: editProfileData.dateOfBirth,
        gender: editProfileData.gender,
        phoneNumber: editProfileData.phoneNumber,
      });
      const res = await fetch("http://localhost:3000/parents/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: editProfileData.firstName,
          lastName: editProfileData.lastName,
          dateOfBirth: editProfileData.dateOfBirth,
          gender: editProfileData.gender,
          phoneNumber: editProfileData.phoneNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: "error", message: data.message || "Failed to update profile." });
        return;
      }
      setProfile(data.profile);
      setIsEditingProfile(false);
      setShowProfileCompleteModal(false);
      setProfileMessage({ type: "success", message: "Profile updated successfully!" });
      setIsProfileIncomplete(false);
    } catch (err) {
      console.error("Update profile error:", err);
      setProfileMessage({ type: "error", message: err.message || "Failed to update profile due to an error." });
    }
  };

  const handleChangePasswordClick = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setIsChangingPassword(true);
    setProfileMessage({ type: "", message: "" });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setProfileMessage({ type: "error", message: "You must be logged in to change your password." });
      return;
    }
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmNewPassword
    ) {
      setProfileMessage({ type: "error", message: "Please fill in all password fields." });
      return;
    }
    try {
      const res = await fetch("http://localhost:3000/parents/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmNewPassword: passwordData.confirmNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: "error", message: data.message || "Failed to change password." });
        return;
      }
      setIsChangingPassword(false);
      setProfileMessage({ type: "success", message: "Password updated successfully!" });
    } catch {
      setProfileMessage({ type: "error", message: "Failed to change password due to an error." });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
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
      const res = await fetch("http://localhost:3000/parents/appointments", {
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
      const res = await fetch("http://localhost:3000/parents/appointments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId }),
      });
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
      const res = await fetch("http://localhost:3000/parents/appointments/reschedule", {
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
    const selStr = bookingDate ? bookingDate.toISOString().split("T")[0] : "";
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
            {profileMessage.message && (
              <p className={`message ${profileMessage.type}`}>
                {profileMessage.message}
              </p>
            )}
            {profile ? (
              <div className="profile-container">
                {/* Profile Header */}
                <div className="profile-header">
                  <div className="profile-avatar">
                    {profile.first_name[0]}
                    {profile.last_name[0]}
                  </div>
                  <div className="profile-title">
                    <h3>
                      {profile.first_name} {profile.last_name}
                    </h3>
                    <p className="profile-email">{profile.username}</p>
                  </div>
                </div>

                {/* Profile Details */}
                {!isEditingProfile && !isChangingPassword ? (
                  <div className="profile-details">
                    <div className="profile-section">
                      <h4>Personal Information</h4>
                      <div className="profile-info-grid">
                        <div className="profile-info-item">
                          <span className="info-label">First Name</span>
                          <span className="info-value">{profile.first_name}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">Last Name</span>
                          <span className="info-value">{profile.last_name}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="info-label">Email</span>
                          <span className="info-value">{profile.username}</span>
                        </div>
                        {profile.date_of_birth && (
                          <div className="profile-info-item">
                            <span className="info-label">Date of Birth</span>
                            <span className="info-value">{profile.date_of_birth}</span>
                          </div>
                        )}
                        {profile.gender && (
                          <div className="profile-info-item">
                            <span className="info-label">Gender</span>
                            <span className="info-value">{profile.gender}</span>
                          </div>
                        )}
                        {profile.phone_number && (
                          <div className="profile-info-item">
                            <span className="info-label">Phone Number</span>
                            <span className="info-value">{profile.phone_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="account-actions">
                      <h4>Account Actions</h4>
                      <div className="account-buttons">
                        <button className="edit-profile-btn" onClick={handleEditProfileClick}>
                          Edit Profile
                        </button>
                        <button className="change-password-btn" onClick={handleChangePasswordClick}>
                          Change Password
                        </button>
                        <button className="logout-btn" onClick={handleLogout}>
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isEditingProfile ? (
                  <form onSubmit={handleEditProfileSubmit} className="profile-edit-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name</label>
                        <input
                          type="text"
                          name="firstName"
                          value={editProfileData.firstName}
                          onChange={handleEditProfileChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={editProfileData.lastName}
                          onChange={handleEditProfileChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={profile.username}
                          disabled
                        />
                      </div>
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={editProfileData.dateOfBirth}
                          onChange={handleEditProfileChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Gender</label>
                        <select
                          name="gender"
                          value={editProfileData.gender}
                          onChange={handleEditProfileChange}
                          required
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={editProfileData.phoneNumber}
                          onChange={handleEditProfileChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="save-btn">
                        Save
                      </button>
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleChangePasswordSubmit} className="password-form">
                    <div className="form-group">
                      <label>Current Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="confirmNewPassword"
                        value={passwordData.confirmNewPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    <div className="show-password-toggle">
                      <label>
                        <input
                          type="checkbox"
                          checked={showPassword}
                          onChange={() => setShowPassword(!showPassword)}
                        />
                        Show Passwords
                      </label>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="save-btn">
                        Change Password
                      </button>
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => setIsChangingPassword(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
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
            onClick={() => {
              if (!isProfileIncomplete) setSelectedTab("home");
            }}
          >
            Home
          </li>
          <li
            className={selectedTab === "accounts" ? "active" : ""}
            onClick={() => {
              if (!isProfileIncomplete) setSelectedTab("accounts");
            }}
          >
            Child Accounts
          </li>
          <li
            className={selectedTab === "appointments" ? "active" : ""}
            onClick={() => {
              if (!isProfileIncomplete) setSelectedTab("appointments");
            }}
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
        <div className="modal-overlay" onClick={() => setShowDeleteChildModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <h2>Delete Child Account</h2>
            <p>Are you sure you want to delete this child account?</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 15 }}>
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
        <div className="modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div
            className="modal-content reschedule-modal-content"
            style={{ width: 900 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Reschedule Appointment</h2>
            <p style={{ color: "red", paddingBottom: 10 }}>
              Booked Appointment:{" "}
              {new Date(appointmentToReschedule.appointment_time).toLocaleString()}
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
              {availableSlots.find(
                (g) => g.therapist_id === appointmentToReschedule.therapist_id
              )?.therapist_name}
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
                              g.therapist_id === appointmentToReschedule.therapist_id
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
                        g.therapist_id === appointmentToReschedule.therapist_id
                    );
                    const filtered = grp
                      ? grp.appointments.filter(
                          (s) =>
                            s.date === bookingDate.toISOString().split("T")[0]
                        )
                      : [];
                    const categorized = filtered.length
                      ? categorizeSlots(filtered)
                      : { Morning: [], Afternoon: [], Evening: [] };
                    return Object.entries(categorized).map(([cat, arr]) =>
                      arr.length > 0 ? (
                        <div key={cat} className="timeslot-category">
                          <h4>{cat}</h4>
                          <div className="timeslot-list">
                            {arr.map((slot) => (
                              <button
                                key={slot.id}
                                className={`time-slot-btn ${
                                  newSlotId === slot.id ? "selected" : ""
                                }`}
                                onClick={() => setNewSlotId(slot.id)}
                              >
                                {formatTime(slot.start_time)} -{" "}
                                {formatTime(slot.end_time)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null
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

      {/* ───────── Complete Profile Modal ───────── */}
      {showProfileCompleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: 600 }}>
            <h2>Complete Your Profile</h2>
            <p className="mandatory-message">
              Please complete your profile details to continue. Your date of birth must match our records.
            </p>
            {profileMessage.message && (
              <p className={`message ${profileMessage.type}`}>
                {profileMessage.message}
              </p>
            )}
            <form onSubmit={handleEditProfileSubmit} className="profile-edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editProfileData.firstName}
                    onChange={handleEditProfileChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editProfileData.lastName}
                    onChange={handleEditProfileChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profile.username}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={editProfileData.dateOfBirth}
                    onChange={handleEditProfileChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={editProfileData.gender}
                    onChange={handleEditProfileChange}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={editProfileData.phoneNumber}
                    onChange={handleEditProfileChange}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentPage;