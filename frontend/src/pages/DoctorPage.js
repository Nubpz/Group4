import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './design/TherapistPage.css'; 
import axios from 'axios';

// ===========================
// Helpers for grouping & sorting
// ===========================
function groupAvailabilitiesByDate(avails) {
  const grouped = {};
  for (const slot of avails) {
    if (!grouped[slot.date]) {
      grouped[slot.date] = [];
    }
    grouped[slot.date].push(slot);
  }
  return grouped;
}

// Sort by start_time (HH:MM:SS)
function sortTimes(a, b) {
  const [hourA, minA] = a.start_time.split(':').map(Number);
  const [hourB, minB] = b.start_time.split(':').map(Number);
  return hourA - hourB || minA - minB;
}

// ===========================
// Date/Time Parsing & Formatting
// (Similar to your existing logic)
// ===========================
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function formatLocalDateString(dateStr) {
  // e.g. "2025-04-05" => "4/5/2025"
  const { year, month, day } = parseLocalDate(dateStr);
  return `${month}/${day}/${year}`;
}

function parseLocalTime(timeStr) {
  // e.g. "08:00:00"
  const [hour, minute, second] = timeStr.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute, second);
}

function formatLocalTimeString(timeStr) {
  const dateObj = parseLocalTime(timeStr);
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function convertTimeFormat(timeStr) {
  // e.g. "8:00 am" => "08:00:00"
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  if (period.toLowerCase() === 'pm' && hours !== '12') {
    hours = parseInt(hours) + 12;
  } else if (period.toLowerCase() === 'am' && hours === '12') {
    hours = '00';
  }
  return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
}

// ===========================
// Timeline Component
// (Group by date, render each day in a card, times in "pills")
// ===========================
function AvailabilityTimeline({ availabilities }) {
  const grouped = groupAvailabilitiesByDate(availabilities);
  const sortedDates = Object.keys(grouped).sort(); // sort date strings (e.g. 2025-04-05)

  return (
    <div className="availability-timeline">
      {sortedDates.map((date) => {
        // Sort the time slots
        const slots = [...grouped[date]].sort(sortTimes);

        return (
          <div key={date} className="availability-day-card">
            <h3 className="availability-day-title">
              {formatLocalDateString(date)}
            </h3>
            <div className="availability-day-slots">
              {slots.map((slot) => {
                const start = formatLocalTimeString(slot.start_time);
                const end = formatLocalTimeString(slot.end_time);
                return (
                  <div className="availability-slot" key={slot.id}>
                    <span className="slot-time">
                      {start} – {end}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DoctorsAvailabilityPage = () => {
  // Detect user’s time zone
  const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Set up date boundaries
  const today = new Date();
  const minDate = today;
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());

  // State
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [timeZone, setTimeZone] = useState(defaultTimeZone);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Predefined time slots
  const times = [
    "8:00 am", "9:00 am", "10:00 am", "11:00 am",
    "12:00 pm", "1:00 pm", "2:00 pm", "3:00 pm", "4:00 pm", "5:00 pm"
  ];

  // ===========================
  // Fetch Data on Mount
  // ===========================
  useEffect(() => {
    const fetchAvailabilities = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('You must be logged in to view availability');
          setLoading(false);
          return;
        }
        const response = await axios.get('http://localhost:3000/availability', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailabilities(response.data.availabilities);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch availabilities');
      } finally {
        setLoading(false);
      }
    };
    fetchAvailabilities();
  }, []);

  // ===========================
  // Handling Calendar & Times
  // ===========================
  function formatSelectedDate(dateObj) {
    // local date => "YYYY-MM-DD"
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const getAvailabilityDates = () => {
    // Convert each availability date to a JS Date object for tileClassName
    return availabilities.map((av) => {
      const { year, month, day } = parseLocalDate(av.date);
      return new Date(year, month - 1, day);
    });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTimes([]);
    setSuccessMessage('');
  };

  const handleTimeClick = (time) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter((t) => t !== time));
    } else {
      setSelectedTimes([...selectedTimes, time]);
    }
  };

  function isTimeSlotBooked(time) {
    if (!selectedDate) return false;
    const dateStr = formatSelectedDate(selectedDate);
    const time24 = convertTimeFormat(time);
    return availabilities.some(
      (avail) => avail.date === dateStr && avail.start_time === time24
    );
  }

  const handleSetAvailability = async () => {
    if (!selectedDate) {
      setError("Please select a date first.");
      return;
    }
    if (selectedTimes.length === 0) {
      setError("Please select at least one time slot.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to set availability');
        setLoading(false);
        return;
      }
      const dateStr = formatSelectedDate(selectedDate);
      for (const time of selectedTimes) {
        if (isTimeSlotBooked(time)) continue; // skip duplicates
        const startTime = convertTimeFormat(time);
        const endTimeHour = parseInt(startTime.split(':')[0]) + 1;
        const endTime = `${String(endTimeHour).padStart(2, '0')}:00:00`;
        await axios.post(
          'http://localhost:3000/availability',
          {
            date: dateStr,
            start_time: startTime,
            end_time: endTime
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      // Refresh
      const response = await axios.get('http://localhost:3000/availability', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailabilities(response.data.availabilities);
      setSuccessMessage(`Availability set for ${dateStr} at ${selectedTimes.join(', ')}`);
      setSelectedDate(null);
      setSelectedTimes([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set availability');
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // Render
  // ===========================
  return (
    <div className="set-availability">
      <h1>Manage Your Availability</h1>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      {loading && <div className="loading-indicator">Loading...</div>}

      {/* Calendar & Time Slots */}
      <div className="calendar-time-section">
        {/* Calendar Panel */}
        <div className="calendar-panel">
          <h2>Select Date</h2>
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            minDate={minDate}
            maxDate={maxDate}
            prev2Label={null}
            next2Label={null}
            className="minimal-calendar"
            tileClassName={({ date, view }) => {
              if (view === 'month') {
                // Past
                if (date < new Date().setHours(0, 0, 0, 0)) {
                  return 'past-date';
                }
                // If this date is in your availabilities
                const availabilityDates = getAvailabilityDates();
                if (
                  availabilityDates.some(
                    (d) =>
                      d.getFullYear() === date.getFullYear() &&
                      d.getMonth() === date.getMonth() &&
                      d.getDate() === date.getDate()
                  )
                ) {
                  return 'available-date';
                }
              }
              return null;
            }}
          />
        </div>

        {/* Time Slots Panel */}
        <div className="times-panel">
          <h2>Select Time Slots</h2>
          <div className="timezone-select">
            <label htmlFor="timezone">Time Zone:</label>
            <select
              id="timezone"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
            >
              <option value={defaultTimeZone}>{defaultTimeZone}</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>

          <div className="times-list">
            {selectedDate ? (
              times.map((time) => (
                <div
                  key={time}
                  className={`time-slot ${
                    selectedTimes.includes(time) ? 'selected-time' : ''
                  } ${isTimeSlotBooked(time) ? 'booked' : ''}`}
                  onClick={() => {
                    if (!isTimeSlotBooked(time)) {
                      handleTimeClick(time);
                    }
                  }}
                >
                  {time}
                </div>
              ))
            ) : (
              <p className="no-day-selected">
                Select a date to view available times
              </p>
            )}
          </div>

          {selectedDate && (
            <button
              className="set-availability-btn"
              onClick={handleSetAvailability}
              disabled={loading}
            >
              {loading ? 'Setting...' : 'Set Availability'}
            </button>
          )}
        </div>
      </div>

      {/* Current Availabilities in a Timeline Format */}
      <div className="current-availabilities">
        <h2>Your Current Availabilities</h2>
        {availabilities.length > 0 ? (
          <AvailabilityTimeline availabilities={availabilities} />
        ) : (
          <p>No availabilities set yet.</p>
        )}
      </div>
    </div>
  );
};

export default DoctorsAvailabilityPage;
