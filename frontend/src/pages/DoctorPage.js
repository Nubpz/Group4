import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './design/TherapistPage.css';
import axios from 'axios';

const DoctorsAvailabilityPage = () => {
  // Auto-detect system time zone
  const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Today's date; restrict selection from today up to two months later
  const today = new Date();
  const minDate = today;
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [timeZone, setTimeZone] = useState(defaultTimeZone);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Available time slots
  const times = [
    "8:00 am", "9:00 am", "10:00 am", "11:00 am",
    "12:00 pm", "1:00 pm", "2:00 pm", "3:00 pm", "4:00 pm", "5:00 pm"
  ];

  // Function to fetch doctor's existing availabilities
  useEffect(() => {
    const fetchAvailabilities = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Get the JWT token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('You must be logged in to view availability');
          setLoading(false);
          return;
        }
        
        const response = await axios.get('http://localhost:3000/availability', {
          headers: {
            Authorization: `Bearer ${token}`
          }
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

  // Convert existing availabilities to a format for highlighting on the calendar
  const getAvailabilityDates = () => {
    return availabilities.map(availability => {
      // Convert the date string to a Date object
      return new Date(availability.date);
    });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTimes([]); // Reset time selections when date changes
    setSuccessMessage('');
  };

  const handleTimeClick = (time) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter(t => t !== time));
    } else {
      setSelectedTimes([...selectedTimes, time]);
    }
  };

  // Convert time format (e.g., "8:00 am" to "08:00:00")
  const convertTimeFormat = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (period.toLowerCase() === 'pm' && hours !== '12') {
      hours = parseInt(hours) + 12;
    } else if (period.toLowerCase() === 'am' && hours === '12') {
      hours = '00';
    }
    
    return `${hours.padStart(2, '0')}:${minutes}:00`;
  };

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
      // Get the JWT token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('You must be logged in to set availability');
        setLoading(false);
        return;
      }
      
      // Format the selected date as yyyy-mm-dd
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // For each selected time slot, create an availability entry
      for (const time of selectedTimes) {
        // Assuming each time slot is 1 hour
        const startTime = convertTimeFormat(time);
        
        // Calculate end time (1 hour later)
        const endTimeHour = parseInt(startTime.split(':')[0]) + 1;
        const endTime = `${endTimeHour.toString().padStart(2, '0')}:00:00`;
        
        await axios.post('http://localhost:3000/availability', {
          date: formattedDate,
          start_time: startTime,
          end_time: endTime
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Refresh availabilities after setting new ones
      const response = await axios.get('http://localhost:3000/availability', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setAvailabilities(response.data.availabilities);
      setSuccessMessage(`Availability set for ${formattedDate} at ${selectedTimes.join(', ')}`);
      setSelectedDate(null);
      setSelectedTimes([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set availability');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-availability">
      <h1>Manage Your Availability</h1>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      {loading && <div className="loading-indicator">Loading...</div>}
      
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
                // Disable past dates
                if (date < new Date().setHours(0,0,0,0)) {
                  return 'past-date';
                }
                
                // Highlight dates with existing availability
                const availableDates = getAvailabilityDates();
                if (availableDates.some(availableDate => 
                  availableDate.getDate() === date.getDate() &&
                  availableDate.getMonth() === date.getMonth() &&
                  availableDate.getFullYear() === date.getFullYear()
                )) {
                  return 'available-date';
                }
              }
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
              <option value="America/Los_Angeles">America/Los Angeles (GMT-08:00)</option>
              <option value="America/New_York">America/New York (GMT-05:00)</option>
              <option value="Europe/London">Europe/London (GMT+00:00)</option>
            </select>
          </div>
          
          <div className="times-list">
            {selectedDate ? (
              times.map(time => (
                <div
                  key={time}
                  className={`time-slot ${selectedTimes.includes(time) ? 'selected-time' : ''}`}
                  onClick={() => handleTimeClick(time)}
                >
                  {time}
                </div>
              ))
            ) : (
              <p className="no-day-selected">Select a date to view available times</p>
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
      
      {/* Display current availabilities */}
      <div className="current-availabilities">
        <h2>Your Current Availabilities</h2>
        {availabilities.length > 0 ? (
          <table className="availabilities-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
              </tr>
            </thead>
            <tbody>
              {availabilities.map(availability => (
                <tr key={availability.id}>
                  <td>{new Date(availability.date).toLocaleDateString()}</td>
                  <td>{new Date(`2000-01-01T${availability.start_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td>{new Date(`2000-01-01T${availability.end_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No availabilities set yet.</p>
        )}
      </div>
    </div>
  );
};

export default DoctorsAvailabilityPage;