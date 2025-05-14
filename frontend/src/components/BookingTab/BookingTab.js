import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import './BookingTab.css';

const BookingTab = () => {
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingStatus, setBookingStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    // Fetch therapists when component mounts
    fetchTherapists();
  }, []);

  useEffect(() => {
    // Fetch available slots when therapist or date changes
    if (selectedTherapist && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedTherapist, selectedDate]);

  const fetchTherapists = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/therapists');
      setTherapists(response.data);
    } catch (error) {
      setBookingStatus({
        type: 'error',
        message: 'Failed to fetch therapists. Please try again.'
      });
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/appointments/available-slots', {
        params: {
          therapist_id: selectedTherapist,
          date: selectedDate
        }
      });
      setAvailableSlots(response.data);
    } catch (error) {
      setBookingStatus({
        type: 'error',
        message: 'Failed to fetch available slots. Please try again.'
      });
    }
  };

  const handleBookAppointment = async () => {
    try {
      const response = await axios.post('/api/appointments/book', {
        therapist_id: selectedTherapist,
        appointment_date: selectedDate,
        appointment_time: selectedTime
      });

      setBookingStatus({
        type: 'success',
        message: 'Appointment booked successfully!'
      });

      // Reset form
      setSelectedTherapist('');
      setSelectedDate('');
      setSelectedTime('');
    } catch (error) {
      setBookingStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to book appointment. Please try again.'
      });
    }
  };

  return (
    <div className="booking-tab">
      <h2>Book an Appointment</h2>
      
      {bookingStatus.message && (
        <div className={`status-message ${bookingStatus.type}`}>
          {bookingStatus.message}
        </div>
      )}

      <div className="booking-form">
        <div className="form-group">
          <label htmlFor="therapist">Select Therapist:</label>
          <select
            id="therapist"
            value={selectedTherapist}
            onChange={(e) => setSelectedTherapist(e.target.value)}
          >
            <option value="">Choose a therapist</option>
            {therapists.map((therapist) => (
              <option key={therapist.id} value={therapist.id}>
                {therapist.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>

        {availableSlots.length > 0 && (
          <div className="form-group">
            <label htmlFor="time">Select Time:</label>
            <select
              id="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            >
              <option value="">Choose a time slot</option>
              {availableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          className="book-button"
          onClick={handleBookAppointment}
          disabled={!selectedTherapist || !selectedDate || !selectedTime}
        >
          Book Appointment
        </button>
      </div>
    </div>
  );
};

export default BookingTab; 