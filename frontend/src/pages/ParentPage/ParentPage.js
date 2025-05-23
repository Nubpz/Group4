// src/pages/ParentPage.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../design/parentCss/parentsPage.css";

import HomeTab from "./HomeTab";
import AccountsTab from "./AccountsTab";
import BookingTab from "./BookingTab";

// Sidebar menu definitions
const menuItems = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
  },
  {
    id: "accounts",
    label: "Child Accounts",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path>
        <circle cx="10" cy="7" r="4"></circle>
      </svg>
    ),
  },
  {
    id: "appointments",
    label: "Book Appointments",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ),
  },
];

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
  const [locationError, setLocationError] = useState("");
  const [locationSuccess, setLocationSuccess] = useState("");

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

  // Clear booking message after 5 seconds
  useEffect(() => {
    if (bookingMsg) {
      const timer = setTimeout(() => {
        setBookingMsg("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [bookingMsg]);

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
  
  const [hasFetchedChildren, setHasFetchedChildren] = useState(false);
  // ───────── fetch children ───────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    // Fetch only if childrenData is not yet populated
    if (!hasFetchedChildren) {
      fetch("http://localhost:3000/parents/children", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.children) {
            setChildrenData(data.children);
            setHasFetchedChildren(true);
          } else {
            setError(data.message || "Failed to fetch children data");
          }
        })
        .catch(() => setError("Failed to fetch children data"));
    }
  }, [navigate, hasFetchedChildren]);

  // Separate effect to set selectedChildId after childrenData is populated
  useEffect(() => {
    if (childrenData.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenData[0].id);
    }
  }, [childrenData, selectedChildId]);

  // ───────── home appointments ─────────
  useEffect(() => {
    if (selectedTab === "home" || selectedTab === "appointments") {
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
      setNewChild({ firstName: "", lastName: "", dateOfBirth: "", gender: "" });
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
      setShowProfileCompleteModal(false); // Close the modal
      setProfileMessage({ type: "success", message: "Profile updated successfully!" });
      setIsProfileIncomplete(false); // Profile is now complete
    } catch {
      setProfileMessage({ type: "error", message: "Failed to update profile due to an error." });
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

  // ───────── Location handler ─────────
  const handleSetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setLocationError("No token found. Please log in again.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Geolocation coordinates:", { latitude, longitude });
        try {
          const res = await fetch("http://localhost:3000/user/location", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Failed to update location");
          }
          setLocationSuccess("Location updated successfully!");
          setLocationError("");
          setProfile({ ...profile, latitude, longitude });
          setTimeout(() => setLocationSuccess(""), 3000);
        } catch (err) {
          console.error("Error updating location:", err);
          setLocationError(err.message);
          setLocationSuccess("");
        }
      },
      (err) => {
        setLocationError(`Geolocation error: ${err.message}`);
        setLocationSuccess("");
      }
    );
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
      setBookingError("You must be logged in to book an appointment.");
      return;
    }
    if (!selectedChildId) {
      console.error("Please select a child to book for.");
      setBookingError("Please select a child to book for.");
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
      setBookingMsg(data.message || "Appointment booked successfully!");
      resetBooking();
      // Refresh appointments
      fetch("http://localhost:3000/parents/appointments", {
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
      const res = await fetch("http://localhost:3000/parents/appointments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId }),
      });
      if (!res.ok) {
        throw new Error("Failed to cancel appointment.");
      }
      fetchChildAppointments();
    } catch (err) {
      console.error("Cancel error:", err);
      throw err;
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
        setBookingError(data.message || "Failed to reschedule appointment.");
        return;
      }
      setBookingMsg(data.message || "Appointment rescheduled successfully!");
      setShowRescheduleModal(false);
      setNewSlotId(null);
      setAppointmentToReschedule(null);
      fetchChildAppointments();
      // Refresh appointments
      fetch("http://localhost:3000/parents/appointments", {
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
      setBookingError("Failed to reschedule appointment due to an error.");
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
            appointments={appointments}
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
            {locationError && <p className="error">{locationError}</p>}
            {locationSuccess && <p className="message">{locationSuccess}</p>}
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
                        <div className="profile-info-item">
                          <span className="info-label">Location</span>
                          <span className="info-value">
                            {profile.latitude && profile.longitude
                              ? `${profile.latitude}, ${profile.longitude}`
                              : "Not set"}
                          </span>
                        </div>
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
                        <button className="set-location-btn" onClick={handleSetLocation}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          Set my Location
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
          {menuItems.map((item) => (
            <li
              key={item.id}
              className={selectedTab === item.id ? "active" : ""}
              onClick={() => {
                if (!isProfileIncomplete || item.id === "profile") setSelectedTab(item.id);
              }}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </li>
          ))}
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
                  value={newChild.date_of_birth}
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
                      arr.length > 0 && (
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

      {/* ───────── Complete Profile Modal ───────── */}
      {showProfileCompleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: 600 }}>
            <h2>Complete Your Profile</h2>
            <p className="mandatory-message">
              Please complete your profile details to continue.
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