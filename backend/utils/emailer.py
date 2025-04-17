# emailer.py  (or utils/emailer.py)
from flask_mail import Message
from flask import current_app as app

def send_appt_email(mail, to_email, status, appt):
    """
    appt = {
        'child': 'John Doe',
        'therapist': 'Dr. Smith',
        'time': '2025‑04‑16 10:00 AM',
        'type': 'Online'
    }
    status = 'booked' | 'rescheduled' | 'cancelled'
    """
    subj = f"Appointment {status.capitalize()} – {appt['child']}"
    html = f"""
    <h2>Appointment {status.capitalize()}</h2>
    <p>Your appointment for <b>{appt['child']}</b> has been {status}.</p>
    <ul>
      <li><b>Therapist:</b> {appt['therapist']}</li>
      <li><b>Date & Time:</b> {appt['time']}</li>
      <li><b>Type:</b> {appt['type']}</li>
    </ul>
    """

    try:
        mail.send(Message(subject=subj, recipients=[to_email], html=html))
        app.logger.info("E‑mail sent to %s (%s)", to_email, status)
    except Exception as e:
        app.logger.exception("SMTP error: %s", e)


# utils/emailer.py  (keep your original send_appt_email)

def notify_parent_for_appt(cursor, mail, appointment_id, status):
    """
    Build the msg for appointment_id (already cancelled / rescheduled / booked)
    and send it using send_appt_email().
    • status = 'booked' | 'cancelled' | 'rescheduled'
    """
    # parent e‑mail and user‑id
    cursor.execute("""
        SELECT p.USER_ID, u.username AS parent_email
        FROM APPOINTMENTS a
        JOIN STUDENT s   ON a.STUDENT_ID = s.STUDENT_ID
        JOIN GUARDIAN g  ON s.STUDENT_ID = g.STUDENT_ID
        JOIN PARENT  p   ON g.PARENT_ID  = p.PARENT_ID
        JOIN USERS   u   ON p.USER_ID    = u.USER_ID
        WHERE a.Appointment_ID = %s
    """, (appointment_id,))
    rec = cursor.fetchone()
    parent_email = rec["parent_email"]

    # child, therapist, time, type
    cursor.execute("""
        SELECT CONCAT(s.FirstName,' ',s.LastName)          AS child,
               CONCAT(t.FirstName,' ',t.LastName)          AS therapist,
               a.Appointment_time                          AS atime,
               a.Appointment_type                          AS atype
        FROM APPOINTMENTS a
        JOIN STUDENT s      ON a.STUDENT_ID     = s.STUDENT_ID
        JOIN AVAILABILITY v ON a.AVAILABILITY_ID = v.ID
        JOIN THERAPIST t    ON v.THERAPIST_ID    = t.THERAPIST_ID
        WHERE a.Appointment_ID = %s
    """, (appointment_id,))
    info = cursor.fetchone()

    send_appt_email(
        mail,
        parent_email,
        status,
        {
            "child":     info["child"],
            "therapist": info["therapist"],
            "time":      info["atime"].strftime("%Y-%m-%d %I:%M %p"),
            "type":      "Online" if info["atype"] == "virtual" else "In‑Person"
        }
    )
