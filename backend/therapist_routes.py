import json
from flask import jsonify, request
import mysql.connector
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.emailer import notify_student_for_appt, notify_parent_for_appt, notify_therapist_for_appt

def extract_user_id():
    current = get_jwt_identity()
    if not isinstance(current, dict):
        try:
            current = json.loads(current)
        except Exception as e:
            print("Error decoding JWT identity:", e)
    return current.get("userId") if isinstance(current, dict) else current

def register_routes(app, get_db_connection, jwt_required, get_jwt_identity, mail):
    """
    Register therapist-specific endpoints.
    """

    @app.route('/therapist/profile', methods=['GET'])
    @jwt_required()
    def get_therapist_profile():
        current_user_id = extract_user_id()
        print("Extracted numeric USER_ID:", current_user_id)
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            query = """
            SELECT 
                u.USER_ID as user_id,
                u.username,
                t.FirstName as first_name,
                t.LastName as last_name,
                t.Gender as gender,
                t.CERT_Number as cert_number,
                t.ADMIN_ID as verified
            FROM USERS u
            JOIN THERAPIST t ON u.USER_ID = t.USER_ID
            WHERE u.USER_ID = %s
            """
            cursor.execute(query, (current_user_id,))
            therapist = cursor.fetchone()
            if not therapist:
                return jsonify({"error": "Therapist profile not found"}), 404

            therapist['verified'] = therapist['verified'] is not None
            return jsonify(therapist), 200
        except mysql.connector.Error as err:
            print("Database error in get_therapist_profile:", err)
            return jsonify({"error": "Database error occurred"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @app.route('/therapist/profile', methods=['PUT'])
    @jwt_required()
    def update_therapist_profile():
        current_user_id = extract_user_id()
        data = request.get_json()
        required_fields = ['firstName', 'lastName', 'gender']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            update_query = """
            UPDATE THERAPIST
            SET FirstName = %s, LastName = %s, Gender = %s
            WHERE USER_ID = %s
            """
            cursor.execute(update_query, (
                data['firstName'],
                data['lastName'],
                data['gender'],
                current_user_id
            ))
            conn.commit()

            cursor = conn.cursor(dictionary=True)
            select_query = """
            SELECT 
                u.USER_ID as user_id,
                u.username,
                t.FirstName as first_name,
                t.LastName as last_name,
                t.Gender as gender,
                t.CERT_Number as cert_number,
                t.ADMIN_ID as verified
            FROM USERS u
            JOIN THERAPIST t ON u.USER_ID = t.USER_ID
            WHERE u.USER_ID = %s
            """
            cursor.execute(select_query, (current_user_id,))
            updated_profile = cursor.fetchone()
            updated_profile['verified'] = updated_profile['verified'] is not None
            return jsonify(updated_profile), 200
        except mysql.connector.Error as err:
            print("Database error in update_therapist_profile:", err)
            return jsonify({"error": "Failed to update profile"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @app.route('/therapist/availability', methods=['GET'])
    @jwt_required()
    def get_therapist_availability():
        current_user_id = extract_user_id()
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            query = """
            SELECT ID, Date, Start_Time, End_Time, Status
            FROM AVAILABILITY
            WHERE THERAPIST_ID = (
                SELECT THERAPIST_ID FROM THERAPIST WHERE USER_ID = %s
            )
            ORDER BY Date, Start_Time
            """
            cursor.execute(query, (current_user_id,))
            availability = cursor.fetchall()

            for row in availability:
                if "Date" in row and hasattr(row["Date"], "isoformat"):
                    row["Date"] = row["Date"].isoformat()
                if "Start_Time" in row and row["Start_Time"] is not None:
                    row["Start_Time"] = str(row["Start_Time"])
                if "End_Time" in row and row["End_Time"] is not None:
                    row["End_Time"] = str(row["End_Time"])
            return jsonify(availability), 200
        except mysql.connector.Error as err:
            print("Database error in get_therapist_availability:", err)
            return jsonify({"error": "Failed to retrieve availability"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @app.route('/therapist/availability', methods=['POST'])
    @jwt_required()
    def create_therapist_availability():
        current_user_id = extract_user_id()
        data = request.get_json()
        required_fields = ['date', 'startTime', 'endTime']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT THERAPIST_ID FROM THERAPIST WHERE USER_ID = %s", (current_user_id,))
            therapist_row = cursor.fetchone()
            if not therapist_row:
                return jsonify({"error": "Therapist not found"}), 404

            therapist_id = therapist_row[0]
            insert_query = """
            INSERT INTO AVAILABILITY (THERAPIST_ID, Date, Start_Time, End_Time, Status)
            VALUES (%s, %s, %s, %s, 'available')
            """
            cursor.execute(insert_query, (
                therapist_id,
                data['date'],
                data['startTime'],
                data['endTime']
            ))
            conn.commit()
            new_availability_id = cursor.lastrowid
            return jsonify({
                "message": "Availability created successfully",
                "availabilityId": new_availability_id
            }), 201
        except mysql.connector.Error as err:
            print("Database error in create_therapist_availability:", err)
            return jsonify({"error": "Failed to create availability"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @app.route('/therapist/appointments', methods=['GET'])
    @jwt_required()
    def get_therapist_appointments():
        current_user_id = extract_user_id()
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            query = """
            SELECT 
                a.Appointment_ID,
                a.Appointment_time,
                a.Status,
                a.Appointment_type,
                a.Reason_for_meeting,
                s.FirstName as student_first_name,
                s.LastName as student_last_name
            FROM APPOINTMENTS a
            JOIN AVAILABILITY av ON a.AVAILABILITY_ID = av.ID
            JOIN THERAPIST t ON av.THERAPIST_ID = t.THERAPIST_ID
            JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
            WHERE t.USER_ID = %s
            ORDER BY a.Appointment_time DESC
            """
            cursor.execute(query, (current_user_id,))
            appointments = cursor.fetchall()
            return jsonify(appointments), 200
        except mysql.connector.Error as err:
            print("Database error in get_therapist_appointments:", err)
            return jsonify({"error": "Failed to retrieve appointments"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @app.route('/therapist/availability/<int:availability_id>', methods=['DELETE'])
    @jwt_required()
    def delete_therapist_availability(availability_id):
        current_user_id = extract_user_id()
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            check_query = """
            SELECT ID
            FROM AVAILABILITY
            WHERE ID = %s AND THERAPIST_ID = (
                SELECT THERAPIST_ID FROM THERAPIST WHERE USER_ID = %s
            )
            """
            cursor.execute(check_query, (availability_id, current_user_id))
            if not cursor.fetchone():
                return jsonify({"error": "Availability slot not found or not owned by this therapist"}), 404

            delete_query = """
            DELETE FROM AVAILABILITY
            WHERE ID = %s
            """
            cursor.execute(delete_query, (availability_id,))
            conn.commit()

            return jsonify({"message": "Availability deleted successfully"}), 200
        except mysql.connector.Error as err:
            print("Database error in delete_therapist_availability:", err)
            return jsonify({"error": "Failed to delete availability"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @app.route('/therapist/availability/<int:availability_id>', methods=['PUT'])
    @jwt_required()
    def update_therapist_availability(availability_id):
        current_user_id = extract_user_id()
        data = request.get_json()
        required_fields = ['date', 'startTime', 'endTime', 'status']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            check_query = """
            SELECT ID
            FROM AVAILABILITY
            WHERE ID = %s AND THERAPIST_ID = (
                SELECT THERAPIST_ID FROM THERAPIST WHERE USER_ID = %s
            )
            """
            cursor.execute(check_query, (availability_id, current_user_id))
            if not cursor.fetchone():
                return jsonify({"error": "Availability slot not found or not owned by this therapist"}), 404

            update_query = """
            UPDATE AVAILABILITY
            SET Date = %s, Start_Time = %s, End_Time = %s, Status = %s
            WHERE ID = %s
            """
            cursor.execute(update_query, (
                data['date'],
                data['startTime'],
                data['endTime'],
                data['status'],
                availability_id
            ))
            conn.commit()

            return jsonify({"message": "Availability updated successfully"}), 200
        except mysql.connector.Error as err:
            print("Database error in update_therapist_availability:", err)
            return jsonify({"error": "Failed to update availability"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @app.route('/therapist/appointments/<int:appointment_id>', methods=['DELETE'])
    @jwt_required()
    def delete_appointment(appointment_id):
        current_user_id = extract_user_id()
        print(f"START: Deleting appointment: appointment_id={appointment_id}, therapist_user_id={current_user_id}")
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            # Verify the appointment belongs to the therapist and get the AVAILABILITY_ID
            query = """
            SELECT a.Appointment_ID, a.AVAILABILITY_ID, a.STUDENT_ID
            FROM APPOINTMENTS a
            JOIN AVAILABILITY av ON a.AVAILABILITY_ID = av.ID
            JOIN THERAPIST t ON av.THERAPIST_ID = t.THERAPIST_ID
            WHERE a.Appointment_ID = %s AND t.USER_ID = %s
            """
            cursor.execute(query, (appointment_id, current_user_id))
            appointment = cursor.fetchone()
            print(f"Appointment query result: {appointment}")
            if not appointment:
                return jsonify({"error": "Appointment not found or not owned by this therapist"}), 404

            # Delete the appointment
            cursor.execute("DELETE FROM APPOINTMENTS WHERE Appointment_ID = %s", (appointment_id,))

            # Update the availability slot to "available"
            cursor.execute("""
            UPDATE AVAILABILITY
            SET Status = 'available'
            WHERE ID = %s
            """, (appointment["AVAILABILITY_ID"],))

            conn.commit()

            # Send notifications to student, parent (if linked), and therapist
            # Student: Always notified, as APPOINTMENTS.STUDENT_ID is required
            try:
                print(f"Calling notify_student_for_appt for appointment_id={appointment_id}")
                notify_student_for_appt(cursor, mail, appointment_id, "cancelled")
                print(f"Student email notification sent for appointment_id={appointment_id}, status=cancelled")
            except Exception as email_err:
                print(f"Error sending student email notification for appointment_id={appointment_id}: {email_err}")
            # Parent: Notified if GUARDIAN links STUDENT_ID to a PARENT_ID
            try:
                print(f"Calling notify_parent_for_appt for appointment_id={appointment_id}")
                notify_parent_for_appt(cursor, mail, appointment_id, "cancelled")
                print(f"Parent email notification sent for appointment_id={appointment_id}, status=cancelled")
            except Exception as email_err:
                print(f"Error sending parent email notification for appointment_id={appointment_id}: {email_err}")
            # Therapist: Notified to confirm their own action
            try:
                print(f"Calling notify_therapist_for_appt for appointment_id={appointment_id}")
                notify_therapist_for_appt(cursor, mail, appointment_id, "cancelled")
                print(f"Therapist email notification sent for appointment_id={appointment_id}, status=cancelled")
            except Exception as email_err:
                print(f"Error sending therapist email notification for appointment_id={appointment_id}: {email_err}")

            print(f"END: Appointment deleted successfully for appointment_id={appointment_id}")
            return jsonify({"message": "Appointment deleted and slot made available"}), 200
        except mysql.connector.Error as err:
            print(f"END: Database error in delete_appointment: {err}")
            conn.rollback()
            return jsonify({"error": "Failed to delete appointment"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    @app.route('/therapist/appointments/<int:appointment_id>', methods=['PUT'])
    @jwt_required()
    def update_appointment(appointment_id):
        current_user_id = extract_user_id()
        data = request.get_json()
        required_fields = ['status']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        print(f"START: Updating appointment: appointment_id={appointment_id}, therapist_user_id={current_user_id}, data={data}")
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            # Verify the appointment belongs to the therapist
            check_query = """
            SELECT a.Appointment_ID, a.STUDENT_ID, a.Meeting_link AS current_meeting_link
            FROM APPOINTMENTS a
            JOIN AVAILABILITY av ON a.AVAILABILITY_ID = av.ID
            JOIN THERAPIST t ON av.THERAPIST_ID = t.THERAPIST_ID
            WHERE a.Appointment_ID = %s AND t.USER_ID = %s
            """
            cursor.execute(check_query, (appointment_id, current_user_id))
            appointment = cursor.fetchone()
            print(f"Appointment query result: {appointment}")
            if not appointment:
                return jsonify({"error": "Appointment not found or not owned by this therapist"}), 404

            # Update appointment
            update_query = """
            UPDATE APPOINTMENTS
            SET Status = %s, Meeting_link = %s
            WHERE Appointment_ID = %s
            """
            cursor.execute(update_query, (
                data['status'],
                data.get('meetingLink'),
                appointment_id
            ))
            conn.commit()

            # Determine notification status
            # If only meetingLink changed, use 'link_updated'
            new_meeting_link = data.get('meetingLink')
            current_meeting_link = appointment.get('current_meeting_link')
            status = data['status'].lower()
            if (new_meeting_link != current_meeting_link and 
                status == appointment.get('Status', '').lower()):
                status = 'link_updated'
            elif status not in ['booked', 'cancelled', 'rescheduled']:
                status = 'updated'  # Generic status for other changes

            # Send notifications to student, parent (if linked), and therapist
            # Student: Always notified, as APPOINTMENTS.STUDENT_ID is required
            try:
                print(f"Calling notify_student_for_appt for appointment_id={appointment_id}")
                notify_student_for_appt(cursor, mail, appointment_id, status)
                print(f"Student email notification sent for appointment_id={appointment_id}, status={status}")
            except Exception as email_err:
                print(f"Error sending student email notification for appointment_id={appointment_id}: {email_err}")
            # Parent: Notified if GUARDIAN links STUDENT_ID to a PARENT_ID
            try:
                print(f"Calling notify_parent_for_appt for appointment_id={appointment_id}")
                notify_parent_for_appt(cursor, mail, appointment_id, status)
                print(f"Parent email notification sent for appointment_id={appointment_id}, status={status}")
            except Exception as email_err:
                print(f"Error sending parent email notification for appointment_id={appointment_id}: {email_err}")
            # Therapist: Notified to confirm their own action
            try:
                print(f"Calling notify_therapist_for_appt for appointment_id={appointment_id}")
                notify_therapist_for_appt(cursor, mail, appointment_id, status)
                print(f"Therapist email notification sent for appointment_id={appointment_id}, status={status}")
            except Exception as email_err:
                print(f"Error sending therapist email notification for appointment_id={appointment_id}: {email_err}")

            print(f"END: Appointment updated successfully for appointment_id={appointment_id}")
            return jsonify({"message": "Appointment updated successfully"}), 200
        except mysql.connector.Error as err:
            print(f"END: Database error in update_appointment: {err}")
            return jsonify({"error": "Failed to update appointment"}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()

    return app