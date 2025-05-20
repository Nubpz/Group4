from flask import request, jsonify
import mysql.connector
from datetime import datetime, timedelta
import json
import bcrypt
from utils.emailer import send_appt_email 
from utils.emailer import notify_parent_for_appt, notify_therapist_for_appt 
from flask_mail import Mail         

def register_routes(app, get_db_connection, jwt_required, get_jwt_identity, mail):
    """
    Register parent-specific routes with the Flask app.
    """

    def get_parent_user_id():
        """Helper to extract parent's user ID from the JWT."""
        current_identity = get_jwt_identity()
        if isinstance(current_identity, str):
            try:
                current_identity = json.loads(current_identity)
            except Exception as e:
                print("JWT decoding error:", e)
        return current_identity.get("userId") if isinstance(current_identity, dict) else current_identity

    # --- Get Parent Profile ---
    @app.route("/parents/profile", methods=["GET"])
    @jwt_required()
    def get_parent_profile():
        user_id = get_parent_user_id()
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            query = """
                SELECT 
                    u.USER_ID as user_id,
                    u.username,
                    p.FirstName as first_name,
                    p.LastName as last_name,
                    p.DOB as date_of_birth,
                    p.Gender as gender,
                    p.Phone_number as phone_number
                FROM USERS u
                JOIN PARENT p ON u.USER_ID = p.USER_ID
                WHERE u.USER_ID = %s
            """
            cursor.execute(query, (user_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"message": "Parent profile not found"}), 404
            return jsonify({"profile": row}), 200
        except mysql.connector.Error as err:
            print("Database error in get_parent_profile:", err)
            return jsonify({"message": "Database error occurred"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Update Parent Profile ---
    @app.route("/parents/profile", methods=["PUT"])
    @jwt_required()
    def update_parent_profile():
        user_id = get_parent_user_id()
        data = request.get_json()
        required_fields = ["firstName", "lastName", "dateOfBirth", "gender", "phoneNumber"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"message": f"Missing required field: {field}"}), 400

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            # Verify that the parent exists and fetch existing DOB
            cursor.execute("SELECT PARENT_ID, DOB FROM PARENT WHERE USER_ID = %s", (user_id,))
            parent_row = cursor.fetchone()
            if not parent_row:
                return jsonify({"message": "Parent not found"}), 404

            # Validate that the provided dateOfBirth matches the existing DOB
            existing_dob = parent_row["DOB"]
            provided_dob = data["dateOfBirth"]
            # Convert existing DOB to string in YYYY-MM-DD format for comparison
            existing_dob_str = existing_dob.strftime("%Y-%m-%d") if existing_dob else ""
            if provided_dob != existing_dob_str:
                return jsonify({"message": "Date of Birth does not match our records."}), 400

            # Update the parent's record in the PARENT table
            update_query = """
                UPDATE PARENT
                SET FirstName = %s,
                    LastName = %s,
                    DOB = %s,
                    Gender = %s,
                    Phone_number = %s
                WHERE USER_ID = %s
            """
            cursor.execute(update_query, (
                data["firstName"],
                data["lastName"],
                data["dateOfBirth"],
                data["gender"],
                data["phoneNumber"],
                user_id
            ))
            conn.commit()

            # Fetch the updated profile
            cursor.execute("""
                SELECT 
                    u.USER_ID as user_id,
                    u.username,
                    p.FirstName as first_name,
                    p.LastName as last_name,
                    p.DOB as date_of_birth,
                    p.Gender as gender,
                    p.Phone_number as phone_number
                FROM USERS u
                JOIN PARENT p ON u.USER_ID = p.USER_ID
                WHERE u.USER_ID = %s
            """, (user_id,))
            updated_profile = cursor.fetchone()
            return jsonify({"profile": updated_profile}), 200

        except mysql.connector.Error as err:
            conn.rollback()
            print("Database error in update_parent_profile:", err)
            return jsonify({"message": f"Error updating profile: {str(err)}"}), 500

        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Change Parent Password ---
    @app.route("/parents/change-password", methods=["POST"])
    @jwt_required()
    def change_parent_password():
        user_id = get_parent_user_id()
        data = request.get_json()
        required_fields = ["currentPassword", "newPassword", "confirmNewPassword"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"message": f"Missing required field: {field}"}), 400

        if data["newPassword"] != data["confirmNewPassword"]:
            return jsonify({"message": "New passwords do not match."}), 400

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            # Fetch the user's hashed password
            cursor.execute("SELECT password FROM USERS WHERE USER_ID = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"message": "User not found."}), 404

            # Verify the current password using bcrypt
            input_password = data["currentPassword"].strip().encode('utf-8')
            stored_password = user["password"].encode('utf-8')
            if not bcrypt.checkpw(input_password, stored_password):
                print(f"Password mismatch - Input: {input_password}, Stored: {stored_password}")
                return jsonify({"message": "Current password is incorrect."}), 401

            # Hash the new password and update it
            new_password = data["newPassword"].strip().encode('utf-8')
            hashed_new_password = bcrypt.hashpw(new_password, bcrypt.gensalt())
            cursor.execute(
                "UPDATE USERS SET password = %s WHERE USER_ID = %s",
                (hashed_new_password.decode('utf-8'), user_id)
            )
            conn.commit()
            return jsonify({"message": "Password updated successfully."}), 200

        except mysql.connector.Error as err:
            conn.rollback()
            print("Database error in change_parent_password:", err)
            return jsonify({"message": "Error updating password."}), 500

        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Get Children ---
    @app.route("/parents/children", methods=["GET"])
    @jwt_required()
    def get_parent_children():
        user_id = get_parent_user_id()
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s", (user_id,))
            parent_row = cursor.fetchone()
            if not parent_row:
                return jsonify({"message": "Parent not found."}), 404
            parent_id = parent_row["PARENT_ID"]

            query = """
                SELECT 
                    s.STUDENT_ID as id,
                    s.FirstName as first_name,
                    s.LastName as last_name,
                    s.DOB as date_of_birth
                FROM GUARDIAN g
                JOIN STUDENT s ON g.STUDENT_ID = s.STUDENT_ID
                WHERE g.PARENT_ID = %s
            """
            cursor.execute(query, (parent_id,))
            children = cursor.fetchall()
            return jsonify({"children": children}), 200
        except mysql.connector.Error as err:
            print("Database error in get_parent_children:", err)
            return jsonify({"message": "Error fetching children."}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Add a Child ---
    @app.route("/parents/children", methods=["POST"])
    @jwt_required()
    def add_parent_child():
        user_id = get_parent_user_id()
        data = request.get_json()
        required_fields = ["firstName", "lastName", "dateOfBirth", "gender"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"message": f"Missing required field: {field}"}), 400
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s", (user_id,))
            parent_row = cursor.fetchone()
            if not parent_row:
                return jsonify({"message": "Parent not found"}), 404
            parent_id = parent_row["PARENT_ID"]

            placeholder_username = f"{data['firstName']}.{data['lastName']}.{datetime.now().timestamp()}"
            placeholder_password = "placeholderPassForChild"
            # Hash the placeholder password with bcrypt
            hashed_password = bcrypt.hashpw(placeholder_password.encode('utf-8'), bcrypt.gensalt())
            cursor.execute(
                "INSERT INTO USERS (username, password, ROLE) VALUES (%s, %s, %s)",
                (placeholder_username, hashed_password.decode('utf-8'), "student")
            )
            child_user_id = cursor.lastrowid
            cursor.execute("""
                INSERT INTO Student (USER_ID, FirstName, LastName, DOB, Gender)
                VALUES (%s, %s, %s, %s, %s)
            """, (child_user_id, data["firstName"], data["lastName"], data["dateOfBirth"], data["gender"]))
            student_id = cursor.lastrowid

            relation = data.get("relation", "parent")
            cursor.execute("""
                INSERT INTO GUARDIAN (PARENT_ID, Student_ID, Relation)
                VALUES (%s, %s, %s)
            """, (parent_id, student_id, relation))
            conn.commit()
            
            new_child = {
                "id": student_id,
                "first_name": data["firstName"],
                "last_name": data["lastName"],
                "date_of_birth": data["dateOfBirth"],
                "gender": data["gender"]
            }
            return jsonify({"child": new_child}), 201
        except mysql.connector.Error as err:
            conn.rollback()
            print("Database error in add_parent_child:", err)
            return jsonify({"message": "Error adding child."}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Get Parent Appointments ---
    @app.route("/parents/appointments", methods=["GET"])
    @jwt_required()
    def get_parent_appointments():
        user_id = get_parent_user_id()
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s", (user_id,))
            parent_row = cursor.fetchone()
            if not parent_row:
                return jsonify({"message": "Parent record not found."}), 404
            parent_id = parent_row["PARENT_ID"]

            # Exclude appointments with Status = 'cancelled'
            query = """
                SELECT 
                  a.Appointment_ID as id,
                  a.Appointment_time,
                  a.Status,
                  a.Appointment_type,
                  a.Meeting_link,
                  s.FirstName as child_first_name,
                  s.LastName as child_last_name,
                  s.STUDENT_ID as child_id,
                  t.THERAPIST_ID as therapist_id,
                  t.FirstName as therapist_first_name,
                  t.LastName as therapist_last_name
                FROM APPOINTMENTS a
                JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
                JOIN GUARDIAN g ON s.STUDENT_ID = g.STUDENT_ID
                JOIN AVAILABILITY av ON a.AVAILABILITY_ID = av.ID
                JOIN THERAPIST t ON av.THERAPIST_ID = t.THERAPIST_ID
                WHERE g.PARENT_ID = %s
                  AND a.Status != 'cancelled'
                ORDER BY a.Appointment_time DESC
            """
            cursor.execute(query, (parent_id,))
            rows = cursor.fetchall()
            appts = []
            for row in rows:
                therapist_full = f"{row['therapist_first_name']} {row['therapist_last_name']}"
                child_full = f"{row['child_first_name']} {row['child_last_name']}"
                appt_time = row["Appointment_time"].isoformat() if row["Appointment_time"] else None
                appts.append({
                    "id": row["id"],
                    "appointment_time": appt_time,
                    "status": row["Status"],
                    "appointment_type": row["Appointment_type"],
                    "meeting_link": row["Meeting_link"],
                    "therapist_name": therapist_full,
                    "therapist_id": row["therapist_id"],
                    "child_name": child_full,
                    "child_id": row["child_id"]
                })
            return jsonify({"appointments": appts}), 200
        except mysql.connector.Error as err:
            print("Database error in get_parent_appointments:", err)
            return jsonify({"message": "Error fetching appointments."}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Get Available Appointments Grouped by Therapist ---
    @app.route("/parents/available-appointments", methods=["GET"])
    @jwt_required()
    def get_available_appointments():
        """
        Returns available appointment slots grouped by therapist.
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            query = """
                SELECT
                    av.ID as id,
                    av.Date,
                    av.Start_Time,
                    av.End_Time,
                    t.FirstName as therapist_first_name,
                    t.LastName as therapist_last_name,
                    t.THERAPIST_ID as therapist_id
                FROM AVAILABILITY av
                JOIN THERAPIST t ON av.THERAPIST_ID = t.THERAPIST_ID
                WHERE av.Status = 'available'
                  AND av.Date >= CURDATE()
                ORDER BY t.FirstName, t.LastName, av.Date, av.Start_Time
            """
            cursor.execute(query)
            rows = cursor.fetchall()

            # Group slots by therapist full name.
            grouped = {}
            for row in rows:
                therapist_name = f"{row['therapist_first_name']} {row['therapist_last_name']}"
                slot = {
                    "id": row["id"],
                    "date": row["Date"].strftime("%Y-%m-%d") if hasattr(row["Date"], "strftime") else str(row["Date"]),
                    "start_time": row["Start_Time"].strftime("%H:%M:%S") if hasattr(row["Start_Time"], "strftime") else str(row["Start_Time"]),
                    "end_time": row["End_Time"].strftime("%H:%M:%S") if hasattr(row["End_Time"], "strftime") else str(row["End_Time"])
                }
                if therapist_name not in grouped:
                    grouped[therapist_name] = {
                        "therapist_id": row["therapist_id"],
                        "therapist_name": therapist_name,
                        "appointments": []
                    }
                grouped[therapist_name]["appointments"].append(slot)
            result = list(grouped.values())
            return jsonify({"availableAppointments": result}), 200
        except mysql.connector.Error as err:
            print("Database error in get_available_appointments:", err)
            return jsonify({"message": "Error fetching available appointments."}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Get Appointments for a Specific Child ---
    @app.route("/parents/child-appointments/<int:child_id>", methods=["GET"])
    @jwt_required()
    def get_child_appointments(child_id):
        """
        Returns upcoming and past appointments for a specific child.
        """
        user_id = get_parent_user_id()
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            # Verify that this child belongs to the parent.
            cursor.execute("""
                SELECT 1
                FROM GUARDIAN
                WHERE PARENT_ID = (SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s)
                  AND Student_ID = %s
            """, (user_id, child_id))
            guardian_row = cursor.fetchone()
            if not guardian_row:
                return jsonify({"message": "Child does not belong to this parent."}), 403
            query = """
                SELECT 
                  a.Appointment_ID as id,
                  a.Appointment_time,
                  a.Status,
                  a.Appointment_type,
                  a.Meeting_link,
                  t.THERAPIST_ID as therapist_id,
                  t.FirstName as therapist_first_name,
                  t.LastName as therapist_last_name
                FROM APPOINTMENTS a
                JOIN AVAILABILITY av ON a.AVAILABILITY_ID = av.ID
                JOIN THERAPIST t ON av.THERAPIST_ID = t.THERAPIST_ID
                WHERE a.STUDENT_ID = %s
                  AND a.Status != 'cancelled'
                ORDER BY a.Appointment_time DESC
            """
            cursor.execute(query, (child_id,))
            rows = cursor.fetchall()
            upcoming = []
            past = []
            now = datetime.now()
            for row in rows:
                appt_time = row["Appointment_time"]
                appointment = {
                    "id": row["id"],
                    "appointment_time": appt_time.isoformat() if appt_time else None,
                    "status": row["Status"],
                    "appointment_type": row["Appointment_type"],
                    "meeting_link": row["Meeting_link"],
                    "therapist_name": f"{row['therapist_first_name']} {row['therapist_last_name']}",
                    "therapist_id": row["therapist_id"]
                }
                if appt_time and appt_time >= now:
                    upcoming.append(appointment)
                else:
                    past.append(appointment)
            return jsonify({"upcoming": upcoming, "past": past}), 200
        except mysql.connector.Error as err:
            print("Database error in get_child_appointments:", err)
            return jsonify({"message": "Error fetching appointments for child."}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Book an Appointment ---
    @app.route("/parents/appointments", methods=["POST"])
    @jwt_required()
    def book_appointment():
        user_id = get_parent_user_id()
        data = request.get_json()
        slot_id = data.get("slotId")
        child_id = data.get("childId")
        if not slot_id or not child_id:
            return jsonify({"message": "Missing slotId or childId"}), 400
        appointment_type = data.get("appointment_type", "virtual")
        reason_for_meeting = data.get("reasonForMeeting", "")
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            # Verify that the child belongs to this parent.
            cursor.execute("""
                SELECT 1
                FROM GUARDIAN
                WHERE PARENT_ID = (SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s)
                  AND Student_ID = %s
            """, (user_id, child_id))
            guardian_row = cursor.fetchone()
            if not guardian_row:
                return jsonify({"message": "Child does not belong to this parent."}), 403
            # Check if the appointment slot is available.
            cursor.execute("""
                SELECT ID, Date, Start_Time, THERAPIST_ID
                FROM AVAILABILITY
                WHERE ID = %s AND Status = 'available'
            """, (slot_id,))
            slot_row = cursor.fetchone()
            if not slot_row:
                return jsonify({"message": "Slot not found or already booked."}), 404

            # Check if the child already has an appointment with this therapist on the same day
            slot_date = slot_row["Date"].strftime('%Y-%m-%d') if isinstance(slot_row["Date"], datetime) else slot_row["Date"]
            cursor.execute(
                """
                SELECT COUNT(*) AS count
                FROM APPOINTMENTS a
                JOIN AVAILABILITY av ON a.AVAILABILITY_ID = av.ID
                WHERE a.STUDENT_ID = %s
                  AND av.THERAPIST_ID = %s
                  AND DATE(a.Appointment_time) = %s
                  AND a.Status != 'cancelled'
                """,
                (child_id, slot_row["THERAPIST_ID"], slot_date)
            )
            existing_appointment = cursor.fetchone()
            if existing_appointment['count'] > 0:
                return jsonify({"message": "This child already has an appointment with this therapist on the same day."}), 400

            start_value = slot_row["Start_Time"]
            if isinstance(start_value, timedelta):
                start_time = (datetime.min + start_value).time()
            else:
                start_time = start_value
            appt_datetime = datetime.combine(slot_row["Date"], start_time)
            insert_q = """
                INSERT INTO APPOINTMENTS
                (STUDENT_ID, AVAILABILITY_ID, Appointment_time, Status, Appointment_type, Reason_for_meeting, PARENTID)
                VALUES (%s, %s, %s, %s, %s, %s, (SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s))
            """
            cursor.execute(insert_q, (
                child_id,
                slot_id,
                appt_datetime,
                "pending",
                appointment_type,
                reason_for_meeting,
                user_id
            ))
            new_appointment_id = cursor.lastrowid
            cursor.execute("UPDATE AVAILABILITY SET Status = 'not_available' WHERE ID = %s", (slot_id,))
            conn.commit()

            notify_parent_for_appt(cursor, mail, new_appointment_id, "booked")
            
            notify_therapist_for_appt(cursor, mail, new_appointment_id, "booked")

            return jsonify({
                "message": "Appointment booked successfully, pending therapist confirmation",
                "appointmentId": new_appointment_id
            }), 201
        except mysql.connector.Error as err:
            conn.rollback()
            print("Database error in book_appointment:", err)
            return jsonify({"message": f"Error booking appointment: {str(err)}"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Cancel Appointment Endpoint ---
    @app.route("/parents/appointments/cancel", methods=["POST"])
    @jwt_required()
    def cancel_appointment():
        user_id = get_parent_user_id()
        data = request.get_json()
        appointment_id = data.get("appointmentId")
        if not appointment_id:
            return jsonify({"message": "Missing appointmentId"}), 400
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            # Verify appointment ownership.
            cursor.execute("""
                SELECT a.Appointment_ID as id, a.AVAILABILITY_ID
                FROM APPOINTMENTS a
                JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
                JOIN GUARDIAN g ON s.STUDENT_ID = g.STUDENT_ID
                WHERE a.Appointment_ID = %s
                  AND g.PARENT_ID = (SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s)
            """, (appointment_id, user_id))
            appointment = cursor.fetchone()
            if not appointment:
                return jsonify({"message": "Appointment not found or permission denied."}), 403
            # Update the appointment's status to 'cancelled'.
            cursor.execute("UPDATE APPOINTMENTS SET Status = 'cancelled' WHERE Appointment_ID = %s", (appointment_id,))
            # Mark the availability slot as available.
            cursor.execute("UPDATE AVAILABILITY SET Status = 'available' WHERE ID = %s", (appointment["AVAILABILITY_ID"],))
            conn.commit()

            notify_parent_for_appt(cursor, mail, appointment_id, "cancelled")

            notify_therapist_for_appt(cursor, mail, appointment_id, "cancelled")

            return jsonify({"message": "Appointment cancelled successfully."}), 200
        except mysql.connector.Error as err:
            conn.rollback()
            print("Database error in cancel_appointment:", err)
            return jsonify({"message": f"Error cancelling appointment: {str(err)}"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Reschedule Appointment Endpoint ---
    @app.route("/parents/appointments/reschedule", methods=["POST"])
    @jwt_required()
    def reschedule_appointment():
        user_id = get_parent_user_id()
        data = request.get_json()
        appointment_id = data.get("appointmentId")
        new_slot_id = data.get("newSlotId")
        if not appointment_id or not new_slot_id:
            return jsonify({"message": "Missing appointmentId or newSlotId"}), 400
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            # Verify appointment ownership.
            cursor.execute("""
                SELECT a.Appointment_ID as id, a.AVAILABILITY_ID, a.Appointment_time, a.STUDENT_ID
                FROM APPOINTMENTS a
                JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
                JOIN GUARDIAN g ON s.STUDENT_ID = g.STUDENT_ID
                WHERE a.Appointment_ID = %s
                  AND g.PARENT_ID = (SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s)
            """, (appointment_id, user_id))
            appointment = cursor.fetchone()
            if not appointment:
                return jsonify({"message": "Appointment not found or permission denied."}), 403
            # Check that the new slot is available.
            cursor.execute("""
                SELECT ID, Date, Start_Time, THERAPIST_ID
                FROM AVAILABILITY
                WHERE ID = %s AND Status = 'available'
            """, (new_slot_id,))
            new_slot = cursor.fetchone()
            if not new_slot:
                return jsonify({"message": "New slot not available."}), 404

            # Check if the child already has an appointment with this therapist on the same day
            slot_date = new_slot["Date"].strftime('%Y-%m-%d') if isinstance(new_slot["Date"], datetime) else new_slot["Date"]
            cursor.execute(
                """
                SELECT COUNT(*) AS count
                FROM APPOINTMENTS a
                JOIN AVAILABILITY av ON a.AVAILABILITY_ID = av.ID
                WHERE a.STUDENT_ID = %s
                  AND av.THERAPIST_ID = %s
                  AND DATE(a.Appointment_time) = %s
                  AND a.Status != 'cancelled'
                  AND a.Appointment_ID != %s
                """,
                (appointment["STUDENT_ID"], new_slot["THERAPIST_ID"], slot_date, appointment_id)
            )
            existing_appointment = cursor.fetchone()
            if existing_appointment['count'] > 0:
                return jsonify({"message": "This child already has an appointment with this therapist on the same day."}), 400

            start_value = new_slot["Start_Time"]
            if isinstance(start_value, timedelta):
                new_start_time = (datetime.min + start_value).time()
            else:
                new_start_time = start_value
            new_appt_datetime = datetime.combine(new_slot["Date"], new_start_time)
            # Update the appointment with the new slot and appointment time.
            cursor.execute("""
                UPDATE APPOINTMENTS
                SET AVAILABILITY_ID = %s, Appointment_time = %s, Status = 'pending'
                WHERE Appointment_ID = %s
            """, (new_slot_id, new_appt_datetime, appointment_id))
            # Set the old slot status to 'available'.
            cursor.execute("UPDATE AVAILABILITY SET Status = 'available' WHERE ID = %s", (appointment["AVAILABILITY_ID"],))
            # Mark the new slot as 'not_available'.
            cursor.execute("UPDATE AVAILABILITY SET Status = 'not_available' WHERE ID = %s", (new_slot_id,))
            
            notify_parent_for_appt(cursor, mail, appointment_id, "rescheduled")

            notify_therapist_for_appt(cursor, mail, appointment_id, "rescheduled")
            
            conn.commit()
            return jsonify({"message": "Appointment rescheduled successfully, pending therapist confirmation"}), 200
        except mysql.connector.Error as err:
            conn.rollback()
            print("Database error in reschedule_appointment:", err)
            return jsonify({"message": f"Error rescheduling appointment: {str(err)}"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @app.route("/parents/children/<int:child_id>", methods=["PUT"])
    @jwt_required()
    def update_child(child_id):
        user_id = get_parent_user_id()
        data = request.get_json()
        required_fields = ["firstName", "lastName", "dateOfBirth", "gender"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"message": f"Missing required field: {field}"}), 400

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            # Verify that the child belongs to the current parent.
            cursor.execute(
                """
                SELECT 1
                FROM GUARDIAN
                WHERE PARENT_ID = (SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s)
                AND Student_ID = %s
                """,
                (user_id, child_id)
            )
            if not cursor.fetchone():
                return jsonify({"message": "Child does not belong to this parent."}), 403

            # Update the child's record in the Student table.
            update_query = """
                UPDATE Student
                SET FirstName = %s,
                    LastName = %s,
                    DOB = %s,
                    Gender = %s
                WHERE Student_ID = %s
            """
            cursor.execute(update_query, (
                data["firstName"],
                data["lastName"],
                data["dateOfBirth"],
                data["gender"],
                child_id
            ))
            conn.commit()

            # Optionally fetch the updated record.
            cursor.execute(
                """
                SELECT Student_ID AS id,
                    FirstName AS first_name,
                    LastName AS last_name,
                    DOB AS date_of_birth,
                    Gender AS gender
                FROM Student
                WHERE Student_ID = %s
                """,
                (child_id,)
            )
            updated_child = cursor.fetchone()
            return jsonify({"child": updated_child}), 200

        except mysql.connector.Error as err:
            conn.rollback()
            print("Database error in update_child:", err)
            return jsonify({"message": "Error updating child."}), 500

        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    # --- Delete Child Account Endpoint ---
    @app.route("/parents/children/<int:child_id>", methods=["DELETE"])
    @jwt_required()
    def delete_child(child_id):
        user_id = get_parent_user_id()
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Verify that the child belongs to this parent.
            cursor.execute(
                """
                SELECT 1
                FROM GUARDIAN
                WHERE PARENT_ID = (SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s)
                  AND Student_ID = %s
                """,
                (user_id, child_id)
            )
            if not cursor.fetchone():
                return jsonify({"message": "Child does not belong to this parent."}), 403

            # Retrieve all appointments for this child.
            cursor.execute(
                """
                SELECT Appointment_ID, AVAILABILITY_ID
                FROM APPOINTMENTS
                WHERE Student_ID = %s
                """,
                (child_id,)
            )
            child_appointments = cursor.fetchall()

            # For each appointment, update the availability slot back to "available"
            # and then delete the appointment.
            for appt in child_appointments:
                cursor.execute(
                    "UPDATE AVAILABILITY SET Status = 'available' WHERE ID = %s",
                    (appt["AVAILABILITY_ID"],)
                )
                cursor.execute(
                    "DELETE FROM APPOINTMENTS WHERE Appointment_ID = %s",
                    (appt["Appointment_ID"],)
                )

            # Delete the guardian record.
            cursor.execute(
                "DELETE FROM GUARDIAN WHERE Student_ID = %s",
                (child_id,)
            )

            # Delete the child record.
            cursor.execute(
                "DELETE FROM Student WHERE Student_ID = %s",
                (child_id,)
            )
            
            conn.commit()
            return jsonify({"message": "Child account and associated appointments deleted successfully."}), 200

        except mysql.connector.Error as err:
            conn.rollback()
            print("Database error in delete_child:", err)
            return jsonify({"message": f"Error deleting child: {str(err)}"}), 500

        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()