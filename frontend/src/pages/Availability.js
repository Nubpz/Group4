import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./design/availability.css";

const PresetBlocksAvailability = () => {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [confirmationMsg, setConfirmationMsg] = useState("");
  const [activeTab, setActiveTab] = useState("today");
  const [appointments, setAppointments] = useState([]);
  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [slotMode, setSlotMode] = useState("default"); // default or custom
  const [customStartTime, setCustomStartTime] = useState("10:00");
  const [customDuration, setCustomDuration] = useState(20);

  useEffect(() => {
    if (!confirmationMsg) return;
    const timer = setTimeout(() => setConfirmationMsg(""), 3000);
    return () => clearTimeout(timer);
  }, [confirmationMsg]);

  useEffect(() => {
    fetchAvailability();
    fetchAppointments();
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in as a therapist.");
      const response = await fetch("http://localhost:3000/therapist/availability", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch availability data.");
      const data = await response.json();
      console.log("Raw availability data:", data); // Debugging log
      setAvailability(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in as a therapist.");
      const response = await fetch("http://localhost:3000/therapist/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch appointments.");
      const data = await response.json();
      console.log("Appointments fetched:", data);
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const onDateClick = (date) => {
    setSelectedDate(date);
    setSlotMode("default"); // Reset to default when changing date
  };

  const generateTimeBlocks = (startHour, endHour) => {
    const blocks = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 20) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        blocks.push(`${hh}:${mm}`);
      }
    }
    return blocks;
  };

  // Updated time blocks starting from 10 AM
  const morningBlocks = generateTimeBlocks(10, 12);
  const afternoonBlocks = generateTimeBlocks(13, 16);
  const eveningBlocks = generateTimeBlocks(17, 19);
  const presetTimes = [...morningBlocks, ...afternoonBlocks, ...eveningBlocks];

  const addMinutes = (timeStr, minutes) => {
    const [hh, mm] = timeStr.split(":").map(Number);
    let newH = hh;
    let newM = mm + minutes;
    while (newM >= 60) {
      newH += 1;
      newM -= 60;
    }
    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
  };

  const formatTime12 = (timeStr) => {
    let parts = timeStr.split(":");
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const isSlotTaken = (dateStr, timeStr) => {
    return availability.some((row) => row.Date === dateStr && row.Start_Time?.startsWith(timeStr));
  };

  const isPastTime = (dateStr, timeStr) => {
    const now = new Date();
    const selectedDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return selectedDateTime < now;
  };

  const hasCustomSlots = (dateStr) => {
    const extraSlots = getExtraSlots(dateStr);
    return extraSlots.length > 0;
  };

  const isOverlapping = (dateStr, startTime, endTime) => {
    const newStart = new Date(`${dateStr}T${startTime}:00`);
    const newEnd = new Date(`${dateStr}T${endTime}:00`);
    return availability.some((slot) => {
      if (slot.Date !== dateStr) return false;
      const existingStart = new Date(`${slot.Date}T${slot.Start_Time}`);
      const existingEnd = new Date(`${slot.Date}T${slot.End_Time}`);
      return newStart < existingEnd && newEnd > existingStart;
    });
  };

  const handleBlockClick = async (blockTime) => {
    if (!selectedDate) {
      setError("Please select a date on the calendar first.");
      return;
    }
    setError("");
    const dateStr = selectedDate.toISOString().split("T")[0];
    if (isPastTime(dateStr, blockTime)) {
      setError("You cannot modify availability for past times.");
      return;
    }

    const startTime = blockTime;
    const endTime = addMinutes(blockTime, 20);
    if (isOverlapping(dateStr, startTime, endTime)) {
      setError("This slot overlaps with an existing availability. Please choose a different time.");
      return;
    }

    const slotExists = isSlotTaken(dateStr, startTime);

    if (slotExists) {
      const slotToUpdate = availability.find(
        (slot) => slot.Date === dateStr && slot.Start_Time.startsWith(startTime)
      );
      if (slotToUpdate.Status === "available") {
        setAvailability((prev) => prev.filter((slot) => slot.ID !== slotToUpdate.ID));
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`http://localhost:3000/therapist/availability/${slotToUpdate.ID}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Failed to remove availability.");
          setConfirmationMsg(`Availability removed for ${dateStr} from ${startTime} to ${endTime}`);
          fetchAvailability();
        } catch (err) {
          setError(err.message);
          fetchAvailability();
        }
      } else {
        setAvailability((prev) =>
          prev.map((slot) =>
            slot.ID === slotToUpdate.ID ? { ...slot, Status: "available" } : slot
          )
        );
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`http://localhost:3000/therapist/availability/${slotToUpdate.ID}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "available" }),
          });
          if (!response.ok) throw new Error("Failed to update availability.");
          setConfirmationMsg(`Availability set to available for ${dateStr} from ${startTime} to ${endTime}`);
          fetchAvailability();
        } catch (err) {
          setError(err.message);
          fetchAvailability();
        }
      }
    } else {
      const tempId = Date.now();
      const newSlot = {
        ID: tempId,
        Date: dateStr,
        Start_Time: startTime + ":00",
        End_Time: endTime + ":00",
        Status: "available",
      };
      setAvailability((prev) => [...prev, newSlot]);

      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:3000/therapist/availability", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ date: dateStr, startTime, endTime }),
        });
        const data = await response.json();
        if (!response.ok) {
          setAvailability((prev) => prev.filter((slot) => slot.ID !== tempId));
          throw new Error(data.error || "Failed to create availability.");
        }
        if (data.availabilityId) {
          setAvailability((prev) =>
            prev.map((slot) =>
              slot.ID === tempId ? { ...slot, ID: data.availabilityId } : slot
            )
          );
        }
        setConfirmationMsg(`Availability added for ${dateStr} from ${startTime} to ${endTime}`);
        fetchAvailability();
      } catch (err) {
        setAvailability((prev) => prev.filter((slot) => slot.ID !== tempId));
        setError(err.message);
      }
    }
  };

  const handleCustomSlotSubmit = async () => {
    if (!selectedDate) {
      setError("Please select a date on the calendar first.");
      return;
    }
    setError("");
    const dateStr = selectedDate.toISOString().split("T")[0];
    if (isPastTime(dateStr, customStartTime)) {
      setError("You cannot set availability for past times.");
      return;
    }

    const endTime = addMinutes(customStartTime, parseInt(customDuration));
    if (isOverlapping(dateStr, customStartTime, endTime)) {
      setError("This slot overlaps with an existing availability. Please choose a different time.");
      return;
    }

    const tempId = Date.now();
    const newSlot = {
      ID: tempId,
      Date: dateStr,
      Start_Time: customStartTime + ":00",
      End_Time: endTime + ":00",
      Status: "available",
    };
    setAvailability((prev) => [...prev, newSlot]);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/therapist/availability", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: dateStr,
          startTime: customStartTime,
          endTime: endTime,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAvailability((prev) => prev.filter((slot) => slot.ID !== tempId));
        throw new Error(data.error || "Failed to create custom availability.");
      }
      if (data.availabilityId) {
        setAvailability((prev) =>
          prev.map((slot) =>
            slot.ID === tempId ? { ...slot, ID: data.availabilityId } : slot
          )
        );
      }
      setConfirmationMsg(`Custom availability added for ${dateStr} from ${customStartTime} to ${endTime}`);
      fetchAvailability();
    } catch (err) {
      setAvailability((prev) => prev.filter((slot) => slot.ID !== tempId));
      setError(err.message);
    }
  };

  const categorizeAvailability = () => {
    const categorized = { today: [], tomorrow: [], thisWeek: [] };
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA"); // "2025-05-18" in local time (EDT)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString("en-CA"); // "2025-05-19"
    const weekLater = new Date(now);
    weekLater.setDate(weekLater.getDate() + 7);
    const weekLaterStr = weekLater.toLocaleDateString("en-CA");

    console.log("TodayStr:", todayStr);
    console.log("TomorrowStr:", tomorrowStr);
    console.log("WeekLaterStr:", weekLaterStr);
    console.log("Current time (EDT):", now.toString());

    availability.forEach((slot) => {
      const slotDate = new Date(slot.Date);
      const slotStr = slot.Date;
      const slotStartTime = new Date(`${slot.Date}T${slot.Start_Time}`);

      console.log(`Processing slot - Date: ${slotStr}, Start: ${slot.Start_Time}`);

      if (slotStr === todayStr) {
        // For "today", only include slots that haven't passed
        if (slotStartTime > now) {
          console.log(`Slot added to today: ${slotStr} ${slot.Start_Time}`);
          categorized.today.push(slot);
        } else {
          console.log(`Slot skipped for today (past time): ${slotStr} ${slot.Start_Time}`);
        }
      } else if (slotStr === tomorrowStr) {
        console.log(`Slot added to tomorrow: ${slotStr} ${slot.Start_Time}`);
        categorized.tomorrow.push(slot);
      } else if (slotDate > new Date(tomorrowStr) && slotDate <= new Date(weekLaterStr)) {
        console.log(`Slot added to thisWeek: ${slotStr} ${slot.Start_Time}`);
        categorized.thisWeek.push(slot);
      } else {
        console.log(`Slot not categorized: ${slotStr} ${slot.Start_Time}`);
      }
    });

    console.log("Categorized slots:", categorized);
    return categorized;
  };

  const getExtraSlots = (dateStr) => {
    return availability
      .filter((slot) => slot.Date === dateStr)
      .filter((slot) => !presetTimes.some((time) => slot.Start_Time.startsWith(time)));
  };

  const renderTabs = () => {
    const tabs = [
      { key: "today", label: "Today" },
      { key: "tomorrow", label: "Tomorrow" },
      { key: "thisWeek", label: "This Week" },
    ];
    return (
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const getBookedBy = (slot) => {
    if (slot.Status === "available") return "Not booked";
    const appointment = appointments.find((appt) => {
      const apptDateTime = new Date(appt.Appointment_time);
      const slotDateTime = new Date(`${slot.Date}T${slot.Start_Time}`);
      const timeDiff = Math.abs(apptDateTime.getTime() - slotDateTime.getTime());
      return timeDiff < 60 * 1000;
    });
    return appointment ? `${appointment.student_first_name} ${appointment.student_last_name}` : "Unknown";
  };

  const renderCategoryTable = (slots) => (
    <table className="avail-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Start</th>
          <th>End</th>
          <th>Status</th>
          <th>Booked By</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {slots.map((slot) => (
          <tr key={slot.ID}>
            <td>{slot.Date}</td>
            <td>{formatTime12(slot.Start_Time)}</td>
            <td>{formatTime12(slot.End_Time)}</td>
            <td>{slot.Status}</td>
            <td>{getBookedBy(slot)}</td>
            <td>
              <button onClick={() => setEditModal(slot)} className="action-btn edit-btn">
                Edit
              </button>
              {slot.Status !== "available" && (
                <button onClick={() => setViewModal(slot)} className="action-btn view-btn">
                  View
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderCategorizedAvailability = () => {
    const cat = categorizeAvailability();
    if (activeTab === "today") {
      return cat.today.length ? renderCategoryTable(cat.today) : <p>No Today availability.</p>;
    } else if (activeTab === "tomorrow") {
      return cat.tomorrow.length ? renderCategoryTable(cat.tomorrow) : <p>No Tomorrow availability.</p>;
    } else if (activeTab === "thisWeek") {
      return cat.thisWeek.length ? renderCategoryTable(cat.thisWeek) : <p>No This Week availability.</p>;
    }
    return null;
  };

  const ShiftBlock = ({ title, blocks }) => {
    const dateStr = selectedDate ? selectedDate.toISOString().split("T")[0] : null;
    const isDisabled = dateStr && hasCustomSlots(dateStr);

    return (
      <div className="shift-card">
        <h3>{title}</h3>
        <div className="shift-blocks">
          {blocks.map((time) => {
            const taken = dateStr && isSlotTaken(dateStr, time);
            const past = dateStr && isPastTime(dateStr, time);
            const endTime = addMinutes(time, 20);
            const overlaps = dateStr && isOverlapping(dateStr, time, endTime);
            const disabled = !dateStr || past || isDisabled || overlaps || taken;
            const tooltip = overlaps || taken ? "Time already selected or overlaps" : past ? "Past time" : isDisabled ? "Custom slots exist" : "";
            return (
              <button
                key={time}
                onClick={() => !disabled && handleBlockClick(time)}
                disabled={disabled}
                className={`time-btn ${past ? "past" : isDisabled ? "disabled" : overlaps ? "overlaps" : taken ? "taken" : "available"}`}
                title={tooltip}
              >
                {formatTime12(time + ":00").replace(":00", "")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const CustomSlotsSection = () => {
    const dateStr = selectedDate ? selectedDate.toISOString().split("T")[0] : null;
    if (!dateStr) return null;

    return (
      <div
        className="shift-card custom-slots"
        style={{
          backgroundColor: "#f9f9f9",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "15px",
          margin: "10px 0",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", fontSize: "1.2em" }}>Custom Slots</h3>
        <div
          className="custom-slot-form"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "0.9em",
            }}
          >
            Start Time:
            <input
              type="time"
              value={customStartTime}
              onChange={(e) => setCustomStartTime(e.target.value)}
              style={{
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "0.9em",
              }}
            />
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "0.9em",
            }}
          >
            Duration (minutes):
            <input
              type="number"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              min="5"
              style={{
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "0.9em",
              }}
            />
          </label>
          <button
            className="add-custom-slot-btn"
            onClick={handleCustomSlotSubmit}
            style={{
              padding: "10px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9em",
            }}
          >
            Add Custom Slot
          </button>
        </div>
      </div>
    );
  };

  const ViewModal = ({ slot, onClose }) => {
    const appointment = appointments.find((appt) => {
      const apptDateTime = new Date(appt.Appointment_time);
      const slotDateTime = new Date(`${slot.Date}T${slot.Start_Time}Z`);
      const timeDiff = Math.abs(apptDateTime.getTime() - slotDateTime.getTime());
      return timeDiff < 60 * 1000;
    });

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Booking Details</h2>
          {appointment ? (
            <div className="booking-details">
              <div className="detail-item">
                <span className="detail-label">Student:</span>
                <span className="detail-value">
                  {appointment.student_first_name} {appointment.student_last_name}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{slot.Date}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Time:</span>
                <span className="detail-value">
                  {formatTime12(slot.Start_Time)} - {formatTime12(slot.End_Time)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{appointment.Appointment_type || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Reason:</span>
                <span className="detail-value">{appointment.Reason_for_meeting || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{appointment.Status || slot.Status}</span>
              </div>
            </div>
          ) : (
            <p className="no-data">No booking details available for this slot.</p>
          )}
          <button className="modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  };

  const EditModal = ({ slot, onClose }) => {
    const [newDate, setNewDate] = useState(slot.Date);
    const [newStartTime, setNewStartTime] = useState(slot.Start_Time.slice(0, 5));
    const [newEndTime, setNewEndTime] = useState(slot.End_Time.slice(0, 5));

    const handleEdit = async () => {
      if (!selectedDate) {
        setError("Please select a date first.");
        return;
      }
      const dateStr = newDate;
      if (isPastTime(dateStr, newStartTime)) {
        setError("You cannot set availability for past times.");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found. Please log in as therapist.");
        const response = await fetch(`http://localhost:3000/therapist/availability/${slot.ID}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: newDate,
            startTime: newStartTime,
            endTime: newEndTime,
            status: slot.Status,
          }),
        });
        if (!response.ok) throw new Error("Failed to update availability.");
        setConfirmationMsg(`Availability updated for ${newDate} from ${newStartTime} to ${newEndTime}`);
        fetchAvailability();
        onClose();
      } catch (err) {
        setError(err.message);
      }
    };

    const handleCancel = () => {
      if (slot.Status === "booked") {
        const appointment = appointments.find((appt) => {
          const apptDateTime = new Date(appt.Appointment_time);
          const slotDateTime = new Date(`${slot.Date}T${slot.Start_Time}Z`);
          const timeDiff = Math.abs(apptDateTime.getTime() - slotDateTime.getTime());
          return timeDiff < 60 * 1000;
        });
        if (!appointment) {
          setError("No appointment found for this booked slot.");
          return;
        }
        setConfirmDelete({ type: "appointment", id: appointment.Appointment_ID, slot });
      } else {
        setConfirmDelete({ type: "availability", id: slot.ID, slot });
      }
    };

    const confirmCancel = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found. Please log in as therapist.");
        if (confirmDelete.type === "appointment") {
          const response = await fetch(`http://localhost:3000/therapist/appointments/${confirmDelete.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Failed to delete appointment and update availability.");
          setConfirmationMsg(`Appointment canceled and slot made available for ${slot.Date} from ${slot.Start_Time} to ${slot.End_Time}`);
        } else {
          const response = await fetch(`http://localhost:3000/therapist/availability/${confirmDelete.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Failed to delete availability.");
          setConfirmationMsg(`Availability removed for ${slot.Date} from ${slot.Start_Time} to ${slot.End_Time}`);
        }
        fetchAvailability();
        fetchAppointments();
        setConfirmDelete(null);
        onClose();
      } catch (err) {
        setError(err.message);
        setConfirmDelete(null);
      }
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Edit Booking</h2>
          <div className="edit-form">
            <label>
              Date:
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </label>
            <label>
              Start Time:
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
              />
            </label>
            <label>
              End Time:
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="modal-btn save-btn" onClick={handleEdit}>
              Save
            </button>
            <button className="modal-btn cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button className="modal-btn close-btn" onClick={onClose}>
              Close
            </button>
          </div>
          {confirmDelete && (
            <div className="confirm-delete">
              <p>
                Are you sure you want to {confirmDelete.type === "appointment" ? "cancel this appointment" : "delete this availability"}?
              </p>
              <button className="modal-btn delete-btn" onClick={confirmCancel}>
                Yes
              </button>
              <button className="modal-btn" onClick={() => setConfirmDelete(null)}>
                No
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="preset-container">
      <h1>Select Availability</h1>
      {confirmationMsg && <div className="confirmation-msg">{confirmationMsg}</div>}
      {error && <p className="error-message">{error}</p>}
      {loading && <p>Loading availability...</p>}
      <div className="top-area">
        <div className="calendar-box">
          <Calendar onClickDay={onDateClick} minDate={new Date()} />
          <div className="selected-date">
            {selectedDate ? <strong>Selected: {selectedDate.toDateString()}</strong> : <em>No date selected</em>}
          </div>
          {selectedDate && (
            <div
              className="slot-mode-toggle"
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "10px",
                justifyContent: "center",
              }}
            >
              <button
                className={`mode-btn ${slotMode === "default" ? "active" : ""}`}
                onClick={() => setSlotMode("default")}
                disabled={hasCustomSlots(selectedDate.toISOString().split("T")[0])}
                style={{
                  padding: "8px 16px",
                  backgroundColor: slotMode === "default" ? "#4CAF50" : "#e0e0e0",
                  color: slotMode === "default" ? "#fff" : "#333",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: hasCustomSlots(selectedDate.toISOString().split("T")[0]) ? "not-allowed" : "pointer",
                  opacity: hasCustomSlots(selectedDate.toISOString().split("T")[0]) ? 0.6 : 1,
                }}
              >
                Default Slots
              </button>
              <button
                className={`mode-btn ${slotMode === "custom" ? "active" : ""}`}
                onClick={() => setSlotMode("custom")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: slotMode === "custom" ? "#4CAF50" : "#e0e0e0",
                  color: slotMode === "custom" ? "#fff" : "#333",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Custom Slots
              </button>
            </div>
          )}
        </div>
        <div className="shifts">
          {slotMode === "default" && (
            <>
              <ShiftBlock title="Morning (10:00 - 12:00)" blocks={morningBlocks} />
              <ShiftBlock title="Afternoon (1:00 - 4:00)" blocks={afternoonBlocks} />
              <ShiftBlock title="Evening (5:00 - 7:00)" blocks={eveningBlocks} />
            </>
          )}
          {slotMode === "custom" && <CustomSlotsSection />}
          {/* Removed <ExtraSlotsSection /> as it's no longer needed */}
        </div>
      </div>
      <div className="availability-list">
        <h2>Your Current Availability</h2>
        {renderTabs()}
        {renderCategorizedAvailability()}
      </div>
      {viewModal && <ViewModal slot={viewModal} onClose={() => setViewModal(null)} />}
      {editModal && <EditModal slot={editModal} onClose={() => setEditModal(null)} />}
    </div>
  );
};

export default PresetBlocksAvailability;