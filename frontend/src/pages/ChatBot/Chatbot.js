// src/components/Chatbot.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../design/chatBotCss/Chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startChat = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/chatbot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        setSessionId(data.session_id);
        setMessages([{ sender: 'bot', text: data.message }]);
      } else {
        setMessages([{ sender: 'bot', text: 'Failed to start chat. Please try again.' }]);
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      setMessages([{ sender: 'bot', text: 'An error occurred. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message) => {
    if (!message.trim() || isLoading) return;

    setMessages([...messages, { sender: 'user', text: message }]);
    setInput('');
    setIsLoading(true);

    // Add a "typing..." message
    setMessages((prev) => [...prev, { sender: 'bot', text: 'typing...' }]);

    try {
      const response = await fetch('http://localhost:3000/chatbot/interact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ session_id: sessionId, message }),
      });
      const data = await response.json();

      if (response.ok) {
        // Simulate typing delay (1-2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Remove the "typing..." message and add the actual response
        setMessages((prev) => {
          const updatedMessages = prev.filter((msg) => msg.text !== 'typing...');
          return [...updatedMessages, { sender: 'bot', text: data.message }];
        });

        if (data.token) {
          setToken(data.token);
          localStorage.setItem('chatbot_token', data.token);
        }
      } else {
        // Remove the "typing..." message and show error
        setMessages((prev) => {
          const updatedMessages = prev.filter((msg) => msg.text !== 'typing...');
          return [...updatedMessages, { sender: 'bot', text: data.message || 'An error occurred.' }];
        });
      }
    } catch (err) {
      console.error('Error interacting with chatbot:', err);
      setMessages((prev) => {
        const updatedMessages = prev.filter((msg) => msg.text !== 'typing...');
        return [...updatedMessages, { sender: 'bot', text: 'An error occurred. Please try again.' }];
      });
    } finally {
      setIsLoading(false);
      inputRef.current.focus();
    }
  };

  const handleButtonClick = (value) => {
    sendMessage(value);
  };

  const minimizeChatbot = () => {
    setIsOpen(false);
  };

  const closeChatbot = () => {
    setIsOpen(false);
    setMessages([]);
    setSessionId(null);
    setToken(null);
    setInput('');
  };

  const toggleChatbot = () => {
    if (!isOpen) {
      if (!sessionId) startChat();
    }
    setIsOpen(!isOpen);
  };

  const renderMessage = (msg, index) => {
    if (msg.sender === 'bot' && msg.text.includes('No children registered')) {
      return (
        <div key={index} className={`message ${msg.sender}`}>
          <span>
            No children registered. Please log into your account at <Link to="/parents">/parents</Link> to add a child.
          </span>
        </div>
      );
    }

    // Special case for typing indicator
    if (msg.sender === 'bot' && msg.text === 'typing...') {
      return (
        <div key={index} className={`message ${msg.sender} typing-indicator`}>
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      );
    }

    // Parse the message for therapist lists or numbered lists (e.g., appointments)
    let therapistOptions = [];
    let formattedMessage = msg.text;

    // Handle therapist list in messages like "select from the list: Jane Smith, John Jones, Nabin Poudel."
    const therapistListMatch = msg.text.match(/select from the list: (.*)\.$/);
    if (therapistListMatch) {
      const therapistList = therapistListMatch[1].split(',').map(name => name.trim());
      therapistOptions = therapistList.map((therapist, idx) => ({
        number: (idx + 1).toString(),
        label: therapist
      }));
      formattedMessage = msg.text.replace(/select from the list: (.*)\.$/, "select from the list below:");
    }

    // Parse lines for numbered lists (e.g., therapists, dates, times, appointments)
    const lines = formattedMessage.split('\n');
    let options = [];
    const formattedLines = lines.map((line, i) => {
      const match = line.match(/^(?:\*\*)?(\d+)\.\s*(.*)$/);
      if (match) {
        const number = match[1];
        const label = match[2];
        options.push({ number, label });
        return null;
      }
      return <div key={i}>{line}</div>;
    });

    const showCommandButtons = msg.sender === 'bot' && msg.text.includes("I didn’t quite catch that");
    const showConfirmationButtons = msg.sender === 'bot' && msg.text.includes("Just say 'yes' to confirm or 'no' to go back");
    const showAppointmentButtons = msg.sender === 'bot' && (msg.text.includes("Which appointment would you like to reschedule") || msg.text.includes("Which appointment would you like to cancel"));

    return (
      <div key={index} className={`message ${msg.sender}`}>
        <span>
          {formattedLines}
          {options.length > 0 && (
            <div className="options-buttons">
              {options.map((option) => (
                <button
                  key={option.number}
                  className="option-button"
                  onClick={() => handleButtonClick(option.number)}
                  disabled={isLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {therapistOptions.length > 0 && (
            <div className="options-buttons">
              {therapistOptions.map((option) => (
                <button
                  key={option.number}
                  className="option-button"
                  onClick={() => handleButtonClick(option.number)} // Send the number to select the therapist
                  disabled={isLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {showCommandButtons && (
            <div className="command-buttons">
              <button
                className="command-button"
                onClick={() => handleButtonClick('show therapists')}
                disabled={isLoading}
              >
                Show Therapists
              </button>
              <button
                className="command-button"
                onClick={() => handleButtonClick('schedule')}
                disabled={isLoading}
              >
                Schedule
              </button>
              <button
                className="command-button"
                onClick={() => handleButtonClick('reschedule')}
                disabled={isLoading}
              >
                Reschedule
              </button>
              <button
                className="command-button"
                onClick={() => handleButtonClick('cancel')}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="command-button"
                onClick={() => handleButtonClick('view appointments')}
                disabled={isLoading}
              >
                View Appointments
              </button>
            </div>
          )}
          {showConfirmationButtons && (
            <div className="confirmation-buttons">
              <button
                className="confirmation-button"
                onClick={() => handleButtonClick('yes')}
                disabled={isLoading}
              >
                Yes
              </button>
              <button
                className="confirmation-button"
                onClick={() => handleButtonClick('no')}
                disabled={isLoading}
              >
                No
              </button>
            </div>
          )}
          {showAppointmentButtons && options.length > 0 && (
            <div className="options-buttons">
              {options.map((option) => (
                <button
                  key={option.number}
                  className="option-button"
                  onClick={() => handleButtonClick(option.number)}
                  disabled={isLoading}
                >
                  {option.number}
                </button>
              ))}
            </div>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="chatbot-container">
      {!isOpen && (
        <button className="chatbot-toggle" onClick={toggleChatbot} disabled={isLoading}>
          Chat with Us
        </button>
      )}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>Therapy Clinic Chatbot</h3>
            <div>
              <button className="minimize-button" onClick={minimizeChatbot} disabled={isLoading}>−</button>
              <button className="close-button" onClick={closeChatbot} disabled={isLoading}>X</button>
            </div>
          </div>
          <div className="chatbot-messages">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
          <form className="chatbot-input" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
            />
            <button type="submit" disabled={isLoading}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;