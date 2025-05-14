# emailer.py  (or utils/emailer.py)
from flask_mail import Message
from flask import current_app as app

def send_appt_email(mail, to_email, status, appt):
    """
    appt = {
        'child': 'John Doe',
        'therapist': 'Dr. Smith',
        'time': '2025-04-16 10:00 AM',
        'type': 'Online',
        'meeting_link': 'https://therapy-clinic.com/meeting/abc123'  # Optional
    }
    status = 'booked' | 'rescheduled' | 'cancelled' | 'updated' | 'link_updated'
    """
    subj = f"Appointment {status.capitalize()} – {appt['child']}"
    html = f"""
    <h2>Appointment {status.capitalize()}</h2>
    <p>Appointment for <b>{appt['child']}</b> has been {status}.</p>
    <ul>
      <li><b>Therapist:</b> {appt['therapist']}</li>
      <li><b>Date & Time:</b> {appt['time']}</li>
      <li><b>Type:</b> {appt['type']}</li>
    """
    if appt.get('meeting_link') and appt['type'] == 'Online':
        html += f"""
      <li><b>Meeting Link:</b> <a href="{appt['meeting_link']}">{appt['meeting_link']}</a></li>
        """
    html += "</ul>"
    print(f"Attempting to send email to {to_email} with subject: {subj}")
    try:
        mail.send(Message(subject=subj, recipients=[to_email], html=html))
        app.logger.info("E-mail sent to %s (%s)", to_email, status)
        print(f"Email sent successfully to {to_email} for status {status}")
    except Exception as e:
        app.logger.exception("SMTP error: %s", e)
        print(f"SMTP error sending email to {to_email}: {str(e)}")
        raise

def notify_parent_for_appt(cursor, mail, appointment_id, status):
    """
    Send email to the parent (if linked via GUARDIAN) for the appointment.
    • status = 'booked' | 'cancelled' | 'rescheduled' | 'updated' | 'link_updated'
    """
    print(f"Notify parent for appointment_id={appointment_id}, status={status}")
    cursor.execute("""
        SELECT p.USER_ID, u.username AS parent_email
        FROM APPOINTMENTS a
        JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
        JOIN GUARDIAN g ON s.STUDENT_ID = g.STUDENT_ID
        JOIN PARENT p ON g.PARENT_ID = p.PARENT_ID
        JOIN USERS u ON p.USER_ID = u.USER_ID
        WHERE a.Appointment_ID = %s
    """, (appointment_id,))
    rec = cursor.fetchone()
    print(f"Parent query result: {rec}")
    if not rec:
        print(f"No parent found for appointment_id={appointment_id}")
        return
    parent_email = rec["parent_email"]
    if not parent_email:
        print(f"No valid parent email found for appointment_id={appointment_id}")
        return

    cursor.execute("""
        SELECT CONCAT(s.FirstName,' ',s.LastName) AS child,
               CONCAT(t.FirstName,' ',t.LastName) AS therapist,
               a.Appointment_time AS atime,
               a.Appointment_type AS atype,
               a.Meeting_link AS meeting_link
        FROM APPOINTMENTS a
        JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
        JOIN AVAILABILITY v ON a.AVAILABILITY_ID = v.ID
        JOIN THERAPIST t ON v.THERAPIST_ID = t.THERAPIST_ID
        WHERE a.Appointment_ID = %s
    """, (appointment_id,))
    info = cursor.fetchone()
    print(f"Appointment details query result: {info}")
    if not info:
        print(f"No appointment details found for appointment_id={appointment_id}")
        return

    try:
        send_appt_email(
            mail,
            parent_email,
            status,
            {
                "child": info["child"],
                "therapist": info["therapist"],
                "time": info["atime"].strftime("%Y-%m-%d %I:%M %p"),
                "type": "Online" if info["atype"] == "virtual" else "In-Person",
                "meeting_link": info["meeting_link"]
            }
        )
    except Exception as e:
        print(f"Failed to send parent email for appointment_id={appointment_id}: {str(e)}")
        raise

def notify_student_for_appt(cursor, mail, appointment_id, status):
    """
    Send email to the student for the appointment.
    • status = 'booked' | 'cancelled' | 'rescheduled' | 'updated' | 'link_updated'
    """
    print(f"START: Notify student for appointment_id={appointment_id}, status={status}")
    cursor.execute("""
        SELECT a.STUDENT_ID, s.USER_ID, u.username AS student_email
        FROM APPOINTMENTS a
        JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
        LEFT JOIN USERS u ON s.USER_ID = u.USER_ID
        WHERE a.Appointment_ID = %s
    """, (appointment_id,))
    rec = cursor.fetchone()
    print(f"Student query result: {rec}")
    if not rec:
        print(f"END: No student record found for appointment_id={appointment_id}")
        return
    if not rec["USER_ID"]:
        print(f"END: No USER_ID for student_id={rec['STUDENT_ID']} for appointment_id={appointment_id}")
        return
    if not rec["student_email"]:
        print(f"END: No valid student email found for student_id={rec['STUDENT_ID']}, user_id={rec['USER_ID']} for appointment_id={appointment_id}")
        return
    student_email = rec["student_email"]

    cursor.execute("""
        SELECT CONCAT(s.FirstName,' ',s.LastName) AS child,
               CONCAT(t.FirstName,' ',t.LastName) AS therapist,
               a.Appointment_time AS atime,
               a.Appointment_type AS atype,
               a.Meeting_link AS meeting_link
        FROM APPOINTMENTS a
        JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
        JOIN AVAILABILITY v ON a.AVAILABILITY_ID = v.ID
        JOIN THERAPIST t ON v.THERAPIST_ID = t.THERAPIST_ID
        WHERE a.Appointment_ID = %s
    """, (appointment_id,))
    info = cursor.fetchone()
    print(f"Appointment details query result: {info}")
    if not info:
        print(f"END: No appointment details found for appointment_id={appointment_id}")
        return

    try:
        send_appt_email(
            mail,
            student_email,
            status,
            {
                "child": info["child"],
                "therapist": info["therapist"],
                "time": info["atime"].strftime("%Y-%m-%d %I:%M %p"),
                "type": "Online" if info["atype"] == "virtual" else "In-Person",
                "meeting_link": info["meeting_link"]
            }
        )
        print(f"END: Successfully notified student for appointment_id={appointment_id}")
    except Exception as e:
        print(f"END: Failed to send student email for appointment_id={appointment_id}: {str(e)}")
        raise

def notify_therapist_for_appt(cursor, mail, appointment_id, status):
    """
    Send email to the therapist for the appointment.
    • status = 'booked' | 'cancelled' | 'rescheduled' | 'updated' | 'link_updated'
    """
    print(f"START: Notify therapist for appointment_id={appointment_id}, status={status}")
    cursor.execute("""
        SELECT t.THERAPIST_ID, u.username AS therapist_email
        FROM APPOINTMENTS a
        JOIN AVAILABILITY v ON a.AVAILABILITY_ID = v.ID
        JOIN THERAPIST t ON v.THERAPIST_ID = t.THERAPIST_ID
        JOIN USERS u ON t.USER_ID = u.USER_ID
        WHERE a.Appointment_ID = %s
    """, (appointment_id,))
    rec = cursor.fetchone()
    print(f"Therapist query result: {rec}")
    if not rec:
        print(f"END: No therapist record found for appointment_id={appointment_id}")
        return
    if not rec["therapist_email"]:
        print(f"END: No valid therapist email found for therapist_id={rec['THERAPIST_ID']} for appointment_id={appointment_id}")
        return
    therapist_email = rec["therapist_email"]

    cursor.execute("""
        SELECT CONCAT(s.FirstName,' ',s.LastName) AS child,
               CONCAT(t.FirstName,' ',t.LastName) AS therapist,
               a.Appointment_time AS atime,
               a.Appointment_type AS atype,
               a.Meeting_link AS meeting_link
        FROM APPOINTMENTS a
        JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
        JOIN AVAILABILITY v ON a.AVAILABILITY_ID = v.ID
        JOIN THERAPIST t ON v.THERAPIST_ID = t.THERAPIST_ID
        WHERE a.Appointment_ID = %s
    """, (appointment_id,))
    info = cursor.fetchone()
    print(f"Appointment details query result: {info}")
    if not info:
        print(f"END: No appointment details found for appointment_id={appointment_id}")
        return

    try:
        send_appt_email(
            mail,
            therapist_email,
            status,
            {
                "child": info["child"],
                "therapist": info["therapist"],
                "time": info["atime"].strftime("%Y-%m-%d %I:%M %p"),
                "type": "Online" if info["atype"] == "virtual" else "In-Person",
                "meeting_link": info["meeting_link"]
            }
        )
        print(f"END: Successfully notified therapist for appointment_id={appointment_id}")
    except Exception as e:
        print(f"END: Failed to send therapist email for appointment_id={appointment_id}: {str(e)}")
        raise

def send_reset_code_email(mail, to_email, reset_code):
    """
    Send a password reset code to the specified email.
    reset_code: 6-digit code (string)
    """
    subj = "Password Reset Code"
    html = f"""
    <h2>Password Reset</h2>
    <p>You requested a password reset for your account.</p>
    <p>Your reset code is: <b>{reset_code}</b></p>
    <p>Enter this code on the reset password page to set a new password. It expires in 5 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Regards,<br>YourApp Team</p>
    """
    print(f"Attempting to send reset code email to {to_email}")
    try:
        mail.send(Message(subject=subj, recipients=[to_email], html=html))
        app.logger.info("Reset code email sent to %s", to_email)
        print(f"Reset code email sent successfully to {to_email}")
    except Exception as e:
        app.logger.exception("SMTP error: %s", e)
        print(f"SMTP error sending reset code email to {to_email}: {str(e)}")
        raise