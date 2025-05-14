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
      console.log("Availability fetched:", data);
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

  const onDateClick = (date) => setSelectedDate(date);

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

  const morningBlocks = generateTimeBlocks(9, 12);
  const afternoonBlocks = generateTimeBlocks(13, 16);
  const eveningBlocks = generateTimeBlocks(17, 19);
  const presetTimes = [...morningBlocks, ...afternoonBlocks, ...eveningBlocks];

  const add20Min = (timeStr) => {
    const [hh, mm] = timeStr.split(":").map(Number);
    let newH = hh;
    let newM = mm + 20;
    if (newM >= 60) {
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

  const normalizeTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  };

  const isSlotTaken = (dateStr, timeStr) => {
    return availability.some(
      (row) =>
        row.Date === dateStr &&
        normalizeTime(row.Start_Time) === normalizeTime(timeStr)
    );
  };

  const isPastTime = (dateStr, timeStr) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (dateStr !== todayStr) return false;
    const [blockHH, blockMM] = timeStr.split(":").map(Number);
    const blockDateTime = new Date(selectedDate);
    blockDateTime.setHours(blockHH, blockMM, 0, 0);
    return blockDateTime < now;
  };

  const isOverlappedByExtra = (dateStr, startTime, endTime) => {
    const extraSlots = getExtraSlots(dateStr);
    if (!extraSlots.length) return false;
    const presetStart = new Date(`${dateStr}T${startTime}:00`);
    const presetEnd = new Date(`${dateStr}T${endTime}:00`);
    return extraSlots.some((slot) => {
      const slotStart = new Date(`${dateStr}T${slot.Start_Time}`);
      const slotEnd = new Date(`${dateStr}T${slot.End_Time}`);
      return presetStart < slotEnd && presetEnd > slotStart;
    });
  };

  const handleBlockClick = async (blockTime) => {
    if (!selectedDate) {
      setError("Please select a date on the calendar first.");
      return;
    }
    setError("");
    const dateStr = selectedDate.toISOString().split("T")[0];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (dateStr === todayStr && isPastTime(dateStr, blockTime)) {
      setError("You cannot modify availability for past times.");
      return;
    }

    const startTime = blockTime;
    const endTime = add20Min(blockTime);
    const slotExists = isSlotTaken(dateStr, startTime);

    // Check if this preset slot overlaps with an existing Quick Slot
    if (isOverlappedByExtra(dateStr, startTime, endTime)) {
      setError("This preset slot overlaps with an existing Quick Slot.");
      return;
    }

    if (slotExists) {
      const slotToUpdate = availability.find(
        (slot) => slot.Date === dateStr && normalizeTime(slot.Start_Time) === normalizeTime(startTime)
      );
      if (slotToUpdate && slotToUpdate.Status === "available") {
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
      } else if (slotToUpdate) {
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

  const categorizeAvailability = () => {
    const categorized = { today: [], tomorrow: [], thisWeek: [] };
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const weekLater = new Date(now);
    weekLater.setDate(weekLater.getDate() + 7);

    availability.forEach((slot) => {
      const slotDate = new Date(slot.Date);
      const slotStr = slot.Date;
      if (slotStr === todayStr) categorized.today.push(slot);
      else if (slotStr === tomorrowStr) categorized.tomorrow.push(slot);
      else if (slotDate <= weekLater) categorized.thisWeek.push(slot);
    });
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
    const extraSlots = dateStr ? getExtraSlots(dateStr) : [];

    return (
      <div className="shift-card">
        <h3>{title}</h3>
        <div className="shift-blocks">
          {blocks.map((time) => {
            const taken = dateStr && isSlotTaken(dateStr, time);
            const past = dateStr && isPastTime(dateStr, time);
            const overlapped = dateStr && extraSlots.some((slot) => {
              const presetStart = new Date(`${dateStr}T${time}:00`);
              const presetEnd = new Date(`${dateStr}T${add20Min(time)}:00`);
              const slotStart = new Date(`${dateStr}T${slot.Start_Time}`);
              const slotEnd = new Date(`${dateStr}T${slot.End_Time}`);
              return presetStart < slotEnd && presetEnd > slotStart;
            });
            const disabled = !dateStr || past || overlapped;
            return (
              <button
                key={time}
                onClick={() => !disabled && handleBlockClick(time)}
                disabled={disabled}
                className={`time-btn ${past ? "past" : overlapped ? "overlapped" : taken ? "taken" : "available"}`}
              >
                {formatTime12(time + ":00").replace(":00", "")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const ExtraSlotsSection = () => {
    const dateStr = selectedDate ? selectedDate.toISOString().split("T")[0] : null;
    if (!dateStr) return null;
    const extraSlots = getExtraSlots(dateStr);

    return (
      <div className="shift-card extra-slots">
        <h3>Extra Slots</h3>
        {extraSlots.length > 0 ? (
          <div className="shift-slots">
            {extraSlots.map((slot) => (
              <div key={slot.ID} className={`slot-item ${slot.Status}`}>
                <span>{formatTime12(slot.Start_Time)} - {formatTime12(slot.End_Time)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p>No extra slots for this date.</p>
        )}
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
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      if (dateStr === todayStr && isPastTime(dateStr, newStartTime)) {
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
        </div>
        <div className="shifts">
          <ShiftBlock title="Morning (9:00 - 12:00)" blocks={morningBlocks} />
          <ShiftBlock title="Afternoon (1:00 - 4:00)" blocks={afternoonBlocks} />
          <ShiftBlock title="Evening (5:00 - 7:00)" blocks={eveningBlocks} />
          <ExtraSlotsSection />
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