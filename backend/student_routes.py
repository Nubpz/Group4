from flask import jsonify, request
from datetime import datetime
import json
import uuid

def register_routes(app, get_db_connection, jwt_required, get_jwt_identity):
    # Helper to verify student role and retrieve STUDENT_ID
    def verify_student(identity):
        try:
            user_data = json.loads(identity)
            if user_data.get('role') != 'student':
                return None
            user_id = user_data.get('userId')
            if not user_id:
                return None
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT STUDENT_ID FROM STUDENT WHERE USER_ID = %s", (user_id,)
            )
            student = cursor.fetchone()
            cursor.close()
            conn.close()
            if not student:
                return None
            return student['STUDENT_ID'], user_id
        except Exception as e:
            print(f"Error verifying student: {e}")
            return None

    @app.route('/students/profile', methods=['GET'])
    @jwt_required()
    def student_get_profile():
        student_info = verify_student(get_jwt_identity())
        if not student_info:
            return jsonify({"message": "Access denied: Not a student"}), 403
        student_id, _ = student_info
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT s.STUDENT_ID, s.FirstName AS first_name, s.LastName AS last_name,
                       s.DOB, s.Gender AS gender, s.Phone_number AS phone_number, u.username
                FROM STUDENT s
                JOIN USERS u ON s.USER_ID = u.USER_ID
                WHERE s.STUDENT_ID = %s
                """, (student_id,)
            )
            profile = cursor.fetchone()
            cursor.close()
            conn.close()
            if not profile:
                return jsonify({"message": "Student not found"}), 404
            if isinstance(profile.get('DOB'), datetime):
                profile['DOB'] = profile['DOB'].strftime('%Y-%m-%d')
            # Check if profile is complete
            is_complete = all([
                profile['first_name'],
                profile['last_name'],
                profile['DOB'],
                profile['gender']
            ])
            profile['isProfileComplete'] = is_complete
            return jsonify({"profile": profile}), 200
        except Exception as e:
            print(f"Error fetching profile: {e}")
            return jsonify({"message": "Server error fetching profile"}), 500

    @app.route('/students/profile', methods=['PUT'])
    @jwt_required()
    def student_update_profile():
        student_info = verify_student(get_jwt_identity())
        if not student_info:
            return jsonify({"message": "Access denied: Not a student"}), 403
        student_id, _ = student_info
        data = request.get_json() or {}
        first_name = data.get('firstName')
        last_name = data.get('lastName')
        date_of_birth = data.get('dateOfBirth')
        phone_number = data.get('phoneNumber')
        gender = data.get('gender')
        if not all([first_name, last_name, date_of_birth, gender]):
            return jsonify({"message": "Missing required fields"}), 400
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE STUDENT SET
                  FirstName=%s, LastName=%s, DOB=%s,
                  Phone_number=%s, Gender=%s
                WHERE STUDENT_ID=%s
                """,
                (first_name, last_name, date_of_birth, phone_number, gender, student_id)
            )
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({"message": "Profile updated successfully"}), 200
        except Exception as e:
            print(f"Error updating profile: {e}")
            return jsonify({"message": "Server error updating profile"}), 500

    @app.route('/students/password', methods=['PUT'])
    @jwt_required()
    def student_change_password():
        student_info = verify_student(get_jwt_identity())
        if not student_info:
            return jsonify({"message": "Access denied: Not a student"}), 403
        _, user_id = student_info
        data = request.get_json() or {}
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        if not current_password or not new_password:
            return jsonify({"message": "Current and new password required"}), 400
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT password FROM USERS WHERE USER_ID=%s", (user_id,)
            )
            user = cursor.fetchone()
            if not user:
                cursor.close(); conn.close();
                return jsonify({"message": "User not found"}), 404
            from app import bcrypt
            if not bcrypt.check_password_hash(user['password'], current_password):
                cursor.close(); conn.close();
                return jsonify({"message": "Current password incorrect"}), 401
            hashed = bcrypt.generate_password_hash(new_password).decode()
            cursor.execute(
                "UPDATE USERS SET password=%s WHERE USER_ID=%s",
                (hashed, user_id)
            )
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({"message": "Password updated successfully"}), 200
        except Exception as e:
            print(f"Error changing password: {e}")
            return jsonify({"message": "Server error changing password"}), 500

    @app.route('/logout', methods=['POST'])
    @jwt_required()
    def logout():
        # In a JWT-based system, logout is typically handled client-side by clearing the token.
        # This endpoint is a placeholder for server-side session management if needed.
        return jsonify({"message": "Successfully logged out"}), 200

    @app.route('/students/appointments', methods=['GET'])
    @jwt_required()
    def student_get_appointments():
        student_info = verify_student(get_jwt_identity())
        if not student_info:
            return jsonify({"message": "Access denied: Not a student"}), 403
        student_id, _ = student_info
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT a.Appointment_ID AS id, a.Appointment_time, a.Status AS status,
                       a.Appointment_type AS appointment_type, a.Meeting_link AS meeting_link,
                       a.Reason_for_meeting AS reasonForMeeting,
                       CONCAT(t.FirstName,' ',t.LastName) AS therapist_name,
                       t.THERAPIST_ID AS therapist_id
                FROM APPOINTMENTS a
                JOIN AVAILABILITY av ON a.AVAILABILITY_ID=av.ID
                JOIN THERAPIST t ON av.THERAPIST_ID=t.THERAPIST_ID
                WHERE a.STUDENT_ID=%s
                ORDER BY a.Appointment_time DESC
                """,
                (student_id,)
            )
            apps = cursor.fetchall()
            for appt in apps:
                if isinstance(appt.get('Appointment_time'), datetime):
                    appt['appointment_time'] = appt['Appointment_time'].strftime('%Y-%m-%d %H:%M:%S')
                    del appt['Appointment_time']
            cursor.close(); conn.close()
            return jsonify({"appointments": apps}), 200
        except Exception as e:
            print(f"Error fetching appointments: {e}")
            return jsonify({"message": "Server error fetching appointments"}), 500

    @app.route('/students/appointments', methods=['POST'])
    @jwt_required()
    def student_book_appointment():
        student_info = verify_student(get_jwt_identity())
        if not student_info:
            return jsonify({"message": "Access denied: Not a student"}), 403
        student_id, _ = student_info
        data = request.get_json() or {}
        slot_id = data.get('slotId')
        appt_type = data.get('appointment_type')
        reason = data.get('reasonForMeeting','')
        if not slot_id or not appt_type:
            return jsonify({"message": "Missing required fields"}), 400
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT ID, Date, Start_Time, Status FROM AVAILABILITY WHERE ID=%s",
                (slot_id,)
            )
            slot = cursor.fetchone()
            if not slot or slot['Status']!='available':
                cursor.close(); conn.close();
                return jsonify({"message": "Selected slot is not available"}), 400
            appt_time = f"{slot['Date']} {slot['Start_Time']}"
            link = None
            if appt_type=='virtual': link = f"https://therapy-clinic.com/meeting/{uuid.uuid4()}"
            cursor.execute(
                """
                INSERT INTO APPOINTMENTS(STUDENT_ID,AVAILABILITY_ID,Appointment_time,Status,Appointment_type,Meeting_link,Reason_for_meeting)
                VALUES(%s,%s,%s,'confirmed',%s,%s,%s)
                """,
                (student_id,slot_id,appt_time,appt_type,link,reason)
            )
            cursor.execute("UPDATE AVAILABILITY SET Status='not_available' WHERE ID=%s",(slot_id,))
            conn.commit()
            cursor.close(); conn.close()
            return jsonify({"message":"Appointment booked successfully"}),200
        except Exception as e:
            print(f"Error booking appointment: {e}")
            return jsonify({"message":"Server error booking appointment"}),500

    @app.route('/students/appointments/cancel', methods=['POST'])
    @jwt_required()
    def student_cancel_appointment():
        student_info = verify_student(get_jwt_identity())
        if not student_info:
            return jsonify({"message":"Access denied: Not a student"}),403
        student_id, _ = student_info
        data = request.get_json() or {}
        appt_id = data.get('appointmentId')
        if not appt_id:
            return jsonify({"message":"Appointment ID required"}),400
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT AVAILABILITY_ID,Status FROM APPOINTMENTS WHERE Appointment_ID=%s AND STUDENT_ID=%s",
                (appt_id,student_id)
            )
            appt = cursor.fetchone()
            if not appt:
                cursor.close(); conn.close(); return jsonify({"message":"Appointment not found"}),404
            if appt['Status']=='cancelled':
                cursor.close(); conn.close(); return jsonify({"message":"Already cancelled"}),400
            avail = appt['AVAILABILITY_ID']
            cursor.execute("UPDATE APPOINTMENTS SET Status='cancelled' WHERE Appointment_ID=%s",(appt_id,))
            cursor.execute("UPDATE AVAILABILITY SET Status='available' WHERE ID=%s",(avail,))
            conn.commit()
            cursor.close(); conn.close()
            return jsonify({"message":"Appointment cancelled successfully"}),200
        except Exception as e:
            print(f"Error cancelling appointment: {e}")
            return jsonify({"message":"Server error cancelling appointment"}),500

    @app.route('/students/appointments/reschedule', methods=['POST'])
    @jwt_required()
    def student_reschedule_appointment():
        student_info = verify_student(get_jwt_identity())
        if not student_info:
            return jsonify({"message":"Access denied: Not a student"}),403
        student_id, _ = student_info
        data = request.get_json() or {}
        appt_id = data.get('appointmentId')
        new_slot = data.get('newSlotId')
        if not appt_id or not new_slot:
            return jsonify({"message":"Appointment ID and new slot ID required"}),400
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT AVAILABILITY_ID,Appointment_type FROM APPOINTMENTS WHERE Appointment_ID=%s AND STUDENT_ID=%s",
                (appt_id,student_id)
            )
            orig = cursor.fetchone()
            if not orig:
                cursor.close(); conn.close(); return jsonify({"message":"Appointment not found"}),404
            old_av = orig['AVAILABILITY_ID']
            appt_type = orig['Appointment_type']
            cursor.execute("SELECT Status,Date,Start_Time FROM AVAILABILITY WHERE ID=%s",(new_slot,))
            slot = cursor.fetchone()
            if not slot or slot['Status']!='available':
                cursor.close(); conn.close(); return jsonify({"message":"New slot not available"}),400
            new_time = f"{slot['Date']} {slot['Start_Time']}"
            link = None
            if appt_type=='virtual': link = f"https://therapy-clinic.com/meeting/{uuid.uuid4()}"
            cursor.execute(
                "UPDATE APPOINTMENTS SET AVAILABILITY_ID=%s,Appointment_time=%s,Meeting_link=%s WHERE Appointment_ID=%s",
                (new_slot,new_time,link,appt_id)
            )
            cursor.execute("UPDATE AVAILABILITY SET Status='available' WHERE ID=%s",(old_av,))
            cursor.execute("UPDATE AVAILABILITY SET Status='not_available' WHERE ID=%s",(new_slot,))
            conn.commit()
            cursor.close(); conn.close()
            return jsonify({"message":"Appointment rescheduled successfully"}),200
        except Exception as e:
            print(f"Error rescheduling appointment: {e}")
            return jsonify({"message":"Server error rescheduling appointment"}),500

    @app.route('/students/available-appointments', methods=['GET'])
    @jwt_required()
    def student_get_available_appointments():
        if not verify_student(get_jwt_identity()):
            return jsonify({"message":"Access denied: Not a student"}),403
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT THERAPIST_ID,CONCAT(FirstName,' ',LastName) AS therapist_name FROM THERAPIST")
            therapists = cursor.fetchall()
            result = []
            for t in therapists:
                cursor.execute(
                    "SELECT ID AS id, Date AS date, Start_Time AS start_time, End_Time AS end_time "
                    "FROM AVAILABILITY WHERE THERAPIST_ID=%s AND Status='available' AND Date>=CURDATE() "
                    "ORDER BY Date,Start_Time",
                    (t['THERAPIST_ID'],)
                )
                slots = cursor.fetchall()
                formatted_slots = [
                    {
                        'id': s['id'],
                        'date': s['date'].strftime('%Y-%m-%d') if hasattr(s['date'], 'strftime') else s['date'],
                        'start_time': str(s['start_time']),
                        'end_time': str(s['end_time'])
                    }
                    for s in slots
                ]
                result.append({
                    'therapist_id': t['THERAPIST_ID'],
                    'therapist_name': t['therapist_name'],
                    'appointments': formatted_slots
                })
            cursor.close()
            conn.close()
            print("Available appointments:", result)
            return jsonify({"availableAppointments": result}), 200
        except Exception as e:
            print(f"Error fetching available appointments: {e}")
            return jsonify({"message": "Server error fetching available appointments"}), 500

    @app.route('/students/guardians', methods=['GET'])
    @jwt_required()
    def student_get_guardians():
        student_info = verify_student(get_jwt_identity())
        if not student_info:
            return jsonify({"message":"Access denied: Not a student"}),403
        student_id, _ = student_info
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT p.PARENT_ID AS id, CONCAT(p.FirstName,' ',p.LastName) AS name,
                       p.Phone_number AS phone, u.username AS email, g.Relation AS relation
                FROM GUARDIAN g
                JOIN PARENT p ON g.PARENT_ID=p.PARENT_ID
                JOIN USERS u ON p.USER_ID=u.USER_ID
                WHERE g.STUDENT_ID=%s
                """, (student_id,)
            )
            guardians = cursor.fetchall()
            cursor.close(); conn.close()
            return jsonify({"guardians":guardians}),200
        except Exception as e:
            print(f"Error fetching guardians: {e}")
            return jsonify({"message":"Server error fetching guardians"}),500

    return app