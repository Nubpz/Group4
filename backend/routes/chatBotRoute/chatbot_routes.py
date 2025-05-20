# chatbot_routes.py
from flask import request, jsonify
from flask_jwt_extended import create_access_token
import mysql.connector
from datetime import datetime, timedelta, date
from dateutil.parser import parse as parse_date
from dateutil.relativedelta import relativedelta
import json
import spacy

# Load spaCy model for NLU
nlp = spacy.load("en_core_web_sm")

def extract_intent_and_entities(text):
    doc = nlp(text.lower())
    
    # Extract intent
    intent = None
    if any(word in text.lower() for word in ["book", "schedule", "make an appointment"]):
        intent = "schedule"
    elif any(word in text.lower() for word in ["reschedule", "change", "modify"]):
        intent = "reschedule"
    elif any(word in text.lower() for word in ["cancel", "delete", "remove"]):
        intent = "cancel"
    elif any(word in text.lower() for word in ["view appointments", "show appointments", "see appointments", "list appointments"]):
        intent = "view_appointments"
    elif any(word in text.lower() for word in ["show therapists", "list therapists", "available therapists", "therapist availability"]):
        intent = "show_therapists"
    # Check for greetings
    elif any(word in text.lower() for word in ["hello", "hi", "hey", "greetings"]):
        intent = "greet"

    entities = {
        "therapist": None,
        "date": None,
        "time": None
    }

    # Extract therapist name (robust matching)
    text_lower = text.lower()
    words = text_lower.split()
    therapist_start = None
    for i, word in enumerate(words):
        if word == "with" and i + 1 < len(words):
            therapist_start = i + 1
            break

    if therapist_start is not None:
        # Extract everything after "with" until a keyword like "tomorrow", "at", "on", "for"
        remaining_words = words[therapist_start:]
        therapist_name_parts = []
        for word in remaining_words:
            if word in ["tomorrow", "today", "at", "on", "for"]:
                break
            therapist_name_parts.append(word)
        therapist_name = " ".join(therapist_name_parts).strip()
        if therapist_name:
            entities["therapist"] = therapist_name

    # Fallback to spaCy's PERSON entity if no "with" is found
    if not entities["therapist"]:
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                entities["therapist"] = ent.text
                break

    # Extract date with improved parsing
    for ent in doc.ents:
        if ent.label_ == "DATE":
            try:
                if "tomorrow" in ent.text:
                    tomorrow = date.today() + timedelta(days=1)
                    entities["date"] = tomorrow.strftime("%Y-%m-%d")
                elif "today" in ent.text:
                    entities["date"] = date.today().strftime("%Y-%m-%d")
                elif "next week" in ent.text:
                    next_week = date.today() + relativedelta(weeks=1)
                    entities["date"] = next_week.strftime("%Y-%m-%d")
                else:
                    parsed_date = parse_date(ent.text, fuzzy=True, default=datetime.now())
                    entities["date"] = parsed_date.strftime("%Y-%m-%d")
            except ValueError:
                pass

    # Extract time
    for ent in doc.ents:
        if ent.label_ == "TIME":
            try:
                time_str = ent.text.replace(" ", "")
                parsed_time = datetime.strptime(time_str, "%I:%M%p")
                entities["time"] = parsed_time.strftime("%I:%M %p").lstrip("0")
            except ValueError:
                try:
                    parsed_time = datetime.strptime(time_str, "%I%p")
                    entities["time"] = parsed_time.strftime("%I:%M %p").lstrip("0")
                except ValueError:
                    pass

    # Debug: Log the extracted intent and entities
    print(f"NLU Debug - Input: {text}, Intent: {intent}, Entities: {entities}")
    
    return intent, entities

def register_routes(app, get_db_connection, jwt_required, get_jwt_identity):
    """
    Register chatbot-specific routes with the Flask app.
    """

    # In-memory store for chatbot session state (for simplicity; consider Redis or DB for production)
    chatbot_sessions = {}

    # --- Start Chat Session ---
    @app.route('/chatbot/start', methods=['POST'])
    def start_chat():
        session_id = str(datetime.now().timestamp())
        chatbot_sessions[session_id] = {
            "state": "awaiting_username",
            "user_id": None,
            "verified": False,
            "role": None,
            "has_greeted": False,  # Track if the user has been greeted
            "user_first_name": None  # Store user's first name for greeting
        }
        return jsonify({
            "session_id": session_id,
            "message": "Hey there! I'm the Therapy Clinic Chatbot. Can you give me your email (username) to get started?"
        }), 200

    # --- Handle Chatbot Interaction ---
    @app.route('/chatbot/interact', methods=['POST'])
    def interact():
        data = request.get_json()
        session_id = data.get("session_id")
        user_input = data.get("message")

        if not session_id or session_id not in chatbot_sessions:
            return jsonify({"message": "Oops, looks like your session expired. Let’s start a new chat!"}), 400

        session = chatbot_sessions[session_id]
        state = session["state"]

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            # --- State: Awaiting Username ---
            if state == "awaiting_username":
                username = user_input.strip()
                # Join USERS with STUDENT to get the FirstName
                cursor.execute("""
                    SELECT u.USER_ID, u.ROLE, s.FirstName
                    FROM USERS u
                    LEFT JOIN STUDENT s ON u.USER_ID = s.USER_ID
                    WHERE u.username = %s
                """, (username,))
                user = cursor.fetchone()
                if not user or user["ROLE"] not in ["parent", "student"]:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Hmm, that username doesn't seem right, or you're not a parent or student. Can you try again?"}), 400
                session["username"] = username
                session["user_id"] = user["USER_ID"]
                session["role"] = user["ROLE"]
                session["user_first_name"] = user["FirstName"] if user["FirstName"] else "User"  # Fallback to "User" if FirstName is not available

                if user["ROLE"] == "parent":
                    cursor.execute("""
                        SELECT s.STUDENT_ID, s.FirstName, s.LastName
                        FROM GUARDIAN g
                        JOIN STUDENT s ON g.STUDENT_ID = s.STUDENT_ID
                        WHERE g.PARENT_ID = (SELECT PARENT_ID FROM PARENT WHERE USER_ID = %s)
                    """, (user["USER_ID"],))
                    children = cursor.fetchall()
                    if not children:
                        cursor.close()
                        conn.close()
                        return jsonify({"message": "Looks like you haven't registered any children yet. You can add a child by logging into your account at /parents."}), 200
                    session["children"] = [
                        {"id": child["STUDENT_ID"], "name": f"{child['FirstName']} {child['LastName']}"}
                        for child in children
                    ]
                    session["state"] = "selecting_child"
                    cursor.close()
                    conn.close()
                    response = "Alright, let’s pick a child for the appointment:\n"
                    for i, child in enumerate(session["children"], 1):
                        response += f"{i}. {child['name']}\n"
                    response += "Which child would you like to select?"
                    return jsonify({"message": response}), 200
                else:
                    session["state"] = "awaiting_dob"
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Great! Now, can you tell me your Date of Birth (YYYY-MM-DD)?"}), 200

            # --- State: Selecting Child (for Parents) ---
            elif state == "selecting_child":
                try:
                    choice = int(user_input.strip()) - 1
                    if choice < 0 or choice >= len(session["children"]):
                        cursor.close()
                        conn.close()
                        return jsonify({"message": f"Hmm, that’s not a valid choice. Please pick a number between 1 and {len(session['children'])}."}), 400
                except ValueError:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Oops, I need a number to select a child. Can you try again?"}), 400

                session["selected_child"] = session["children"][choice]
                session["state"] = "awaiting_child_dob"
                cursor.close()
                conn.close()
                return jsonify({"message": f"Got it! Now, what’s the Date of Birth (YYYY-MM-DD) for {session['selected_child']['name']}?"}), 200

            # --- State: Awaiting Child DOB (for Parents) ---
            elif state == "awaiting_child_dob":
                try:
                    provided_dob = datetime.strptime(user_input.strip(), "%Y-%m-%d").date()
                except ValueError:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Hmm, that date format doesn’t look right. Can you try again using YYYY-MM-DD?"}), 400

                cursor.execute("SELECT DOB FROM STUDENT WHERE STUDENT_ID = %s", (session["selected_child"]["id"],))
                child_details = cursor.fetchone()
                if not child_details:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "I couldn’t find that child’s details. Let’s try again."}), 404

                stored_dob = child_details["DOB"]
                if stored_dob != provided_dob:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "That Date of Birth doesn’t match our records for this child. Can you double-check?"}), 400

                token_data = json.dumps({
                    "userId": session["user_id"],
                    "username": session["username"],
                    "role": session["role"],
                    "student_id": session["selected_child"]["id"]
                })
                access_token = create_access_token(
                    identity=token_data,
                    expires_delta=timedelta(hours=1)
                )
                session["verified"] = True
                session["state"] = "verified"
                session["token"] = access_token

                cursor.close()
                conn.close()

                # Display a simple greeting after verification
                return jsonify({
                    "message": f"Hi {session['user_first_name']}!! You're all set! How can I help you today? Just say hi, or try things like 'show therapists', 'schedule' to book an appointment, 'view appointments' to see your upcoming ones, or 'reschedule' or 'cancel' to manage them.",
                    "token": access_token
                }), 200

            # --- State: Awaiting Date of Birth (for Students) ---
            elif state == "awaiting_dob":
                try:
                    provided_dob = datetime.strptime(user_input.strip(), "%Y-%m-%d").date()
                except ValueError:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Hmm, that date format doesn’t look right. Can you try again using YYYY-MM-DD?"}), 400

                cursor.execute("SELECT DOB, STUDENT_ID FROM STUDENT WHERE USER_ID = %s", (session["user_id"],))
                user_details = cursor.fetchone()
                if not user_details:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "I couldn’t find your details. Let’s try again."}), 404

                stored_dob = user_details["DOB"]
                if stored_dob != provided_dob:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "That Date of Birth doesn’t match our records. Can you double-check?"}), 400

                token_data = json.dumps({
                    "userId": session["user_id"],
                    "username": session["username"],
                    "role": session["role"],
                    "student_id": user_details["STUDENT_ID"]
                })
                access_token = create_access_token(
                    identity=token_data,
                    expires_delta=timedelta(hours=1)
                )
                session["verified"] = True
                session["state"] = "verified"
                session["token"] = access_token
                session["selected_child"] = {"id": user_details["STUDENT_ID"]}

                cursor.close()
                conn.close()

                # Display a simple greeting after verification
                return jsonify({
                    "message": f"Hi {session['user_first_name']}!! You're all set! How can I help you today? Just say hi, or try things like 'show therapists', 'schedule' to book an appointment, 'view appointments' to see your upcoming ones, or 'reschedule' or 'cancel' to manage them.",
                    "token": access_token
                }), 200

            # --- State: Verified (Handle Commands) ---
            elif state == "verified":
                # Try NLU processing first
                intent, entities = extract_intent_and_entities(user_input)

                if intent:
                    # If NLU detected an intent, use it as the command
                    command = intent
                    session["nlu_entities"] = entities  # Store entities for later use
                    print(f"Command set to: {command}, Entities: {entities}")  # Debug log
                else:
                    # Fallback to manual command
                    command = user_input.lower().strip()
                    print(f"No intent detected, command set to: {command}")  # Debug log

                # Handle greeting if the user hasn't been greeted yet
                if not session["has_greeted"] and command == "greet":
                    session["has_greeted"] = True
                    cursor.close()
                    conn.close()
                    return jsonify({"message": f"Hey there, {session['user_first_name']}! I’m here to help with your therapy needs. You can say things like 'show therapists' to see who’s available, 'schedule' to book an appointment, 'view appointments' to check your upcoming ones, or 'reschedule' or 'cancel' to manage them. What’s up?"}), 200

                # If the user hasn't been greeted yet, prompt them
                if not session["has_greeted"]:
                    session["has_greeted"] = True
                    cursor.close()
                    conn.close()
                    return jsonify({"message": f"Hey there, {session['user_first_name']}! I’m here to help with your therapy needs. You can say things like 'show therapists' to see who’s available, 'schedule' to book an appointment, 'view appointments' to check your upcoming ones, or 'reschedule' or 'cancel' to manage them. What’s up?"}), 200

                if command == "show_therapists":
                    # Fetch available therapists and their next available slots
                    cursor.execute("""
                        SELECT DISTINCT t.THERAPIST_ID, t.FirstName, t.LastName
                        FROM THERAPIST t
                        JOIN AVAILABILITY av ON t.THERAPIST_ID = av.THERAPIST_ID
                        WHERE av.Status = 'available' AND av.Date >= CURDATE()
                        ORDER BY t.FirstName, t.LastName
                    """)
                    therapists = cursor.fetchall()
                    therapist_availability = []
                    for therapist in therapists:
                        cursor.execute("""
                            SELECT av.Date, av.Start_Time
                            FROM AVAILABILITY av
                            WHERE av.THERAPIST_ID = %s AND av.Status = 'available' AND av.Date >= CURDATE()
                            ORDER BY av.Date, av.Start_Time
                            LIMIT 1
                        """, (therapist["THERAPIST_ID"],))
                        next_slot = cursor.fetchone()
                        if next_slot:
                            start_time = next_slot["Start_Time"]
                            if isinstance(start_time, timedelta):
                                total_seconds = int(start_time.total_seconds())
                                hours = total_seconds // 3600
                                minutes = (total_seconds % 3600) // 60
                                am_pm = "AM" if hours < 12 else "PM"
                                if hours == 0:
                                    hours = 12
                                elif hours > 12:
                                    hours -= 12
                                start_time = f"{hours}:{minutes:02d} {am_pm}"
                            else:
                                start_time = start_time.strftime("%I:%M %p").lstrip("0")
                            therapist_availability.append({
                                "name": f"{therapist['FirstName']} {therapist['LastName']}".strip(),
                                "id": therapist["THERAPIST_ID"],
                                "next_slot": f"{next_slot['Date'].strftime('%Y-%m-%d')} at {start_time}"
                            })

                    if not therapist_availability:
                        cursor.close()
                        conn.close()
                        return jsonify({"message": "Sorry, there aren’t any therapists available right now."}), 200

                    therapist_message = "Here’s who’s available and their next open slots:\n"
                    for i, therapist in enumerate(therapist_availability, 1):
                        therapist_message += f"{i}. {therapist['name']} - Next open slot: {therapist['next_slot']}\n"
                    therapist_message += "Pick a therapist by number to schedule, or let me know what else you’d like to do!"

                    cursor.close()
                    conn.close()
                    return jsonify({"message": therapist_message}), 200

                if command == "schedule":
                    # Check if the user input is a number (selecting a therapist from the list)
                    try:
                        choice = int(user_input.strip()) - 1
                        # Fetch the list of available therapists again to match the selection
                        cursor.execute("""
                            SELECT DISTINCT t.THERAPIST_ID, t.FirstName, t.LastName
                            FROM THERAPIST t
                            JOIN AVAILABILITY av ON t.THERAPIST_ID = av.THERAPIST_ID
                            WHERE av.Status = 'available' AND av.Date >= CURDATE()
                            ORDER BY t.FirstName, t.LastName
                        """)
                        therapists = cursor.fetchall()
                        if 0 <= choice < len(therapists):
                            therapist = therapists[choice]
                            session["selected_therapist"] = {
                                "id": therapist["THERAPIST_ID"],
                                "name": f"{therapist['FirstName']} {therapist['LastName']}".strip()
                            }
                            # Skip directly to date selection
                            cursor.execute("""
                                SELECT DISTINCT av.Date
                                FROM AVAILABILITY av
                                WHERE av.THERAPIST_ID = %s AND av.Status = 'available' AND av.Date >= CURDATE()
                                ORDER BY av.Date
                                LIMIT 5
                            """, (session["selected_therapist"]["id"],))
                            dates = cursor.fetchall()
                            if not dates:
                                cursor.close()
                                conn.close()
                                return jsonify({"message": f"Sorry, {session['selected_therapist']['name']} doesn’t have any open dates right now."}), 200

                            session["dates"] = [
                                {"date": d["Date"].strftime("%Y-%m-%d") if hasattr(d["Date"], "strftime") else str(d["Date"])}
                                for d in dates
                            ]
                            session["state"] = "selecting_date"
                            cursor.close()
                            conn.close()

                            response = f"Okay, here are some available dates for {session['selected_therapist']['name']}:\n"
                            for i, date in enumerate(session["dates"], 1):
                                response += f"{i}. {date['date']}\n"
                            response += "Which date works for you?"
                            return jsonify({"message": response}), 200
                    except ValueError:
                        pass  # If not a number, proceed with the regular scheduling flow

                    # Regular scheduling flow if no therapist is provided or input is not a number
                    therapist_name = entities.get("therapist")
                    print(f"Therapist name extracted: {therapist_name}")  # Debug log
                    if therapist_name:
                        # Search by first or last name
                        cursor.execute("""
                            SELECT DISTINCT t.THERAPIST_ID, t.FirstName, t.LastName
                            FROM THERAPIST t
                            JOIN AVAILABILITY av ON t.THERAPIST_ID = av.THERAPIST_ID
                            WHERE av.Status = 'available' AND av.Date >= CURDATE()
                            AND (t.FirstName LIKE %s OR t.LastName LIKE %s OR CONCAT(t.FirstName, ' ', t.LastName) LIKE %s)
                        """, (f"%{therapist_name}%", f"%{therapist_name}%", f"%{therapist_name}%"))
                        therapist = cursor.fetchone()
                        print(f"Therapist search result: {therapist}")  # Debug log
                        if therapist:
                            session["selected_therapist"] = {
                                "id": therapist["THERAPIST_ID"],
                                "name": f"{therapist['FirstName']} {therapist['LastName']}".strip()
                            }
                            print(f"Therapist selected: {session['selected_therapist']['name']}")  # Debug log
                            # Skip directly to date selection
                            cursor.execute("""
                                SELECT DISTINCT av.Date
                                FROM AVAILABILITY av
                                WHERE av.THERAPIST_ID = %s AND av.Status = 'available' AND av.Date >= CURDATE()
                                ORDER BY av.Date
                                LIMIT 5
                            """, (session["selected_therapist"]["id"],))
                            dates = cursor.fetchall()
                            if not dates:
                                cursor.close()
                                conn.close()
                                return jsonify({"message": f"Sorry, {session['selected_therapist']['name']} doesn’t have any open dates right now."}), 200

                            session["dates"] = [
                                {"date": d["Date"].strftime("%Y-%m-%d") if hasattr(d["Date"], "strftime") else str(d["Date"])}
                                for d in dates
                            ]

                            # If date is provided by NLU, try to match it
                            if entities.get("date"):
                                target_date = entities["date"]
                                print(f"Date extracted: {target_date}")  # Debug log
                                if target_date in [d["date"] for d in session["dates"]]:
                                    session["selected_date"] = {"date": target_date}
                                    selected_date = datetime.strptime(session["selected_date"]["date"], "%Y-%m-%d").date()
                                    current_date = datetime.now().date()
                                    time_filter = ""
                                    params = [session["selected_therapist"]["id"], selected_date]
                                    if selected_date == current_date:
                                        time_filter = "AND av.Start_Time > TIME(NOW())"

                                    cursor.execute(f"""
                                        SELECT av.ID as id, av.Date, av.Start_Time
                                        FROM AVAILABILITY av
                                        WHERE av.THERAPIST_ID = %s AND av.Date = %s AND av.Status = 'available' {time_filter}
                                        ORDER BY av.Start_Time
                                        LIMIT 5
                                    """, params)
                                    slots = cursor.fetchall()
                                    if not slots:
                                        cursor.close()
                                        conn.close()
                                        return jsonify({"message": f"Sorry, {session['selected_therapist']['name']} doesn’t have any open slots on {session['selected_date']['date']}."}), 200

                                    def format_timedelta(td):
                                        total_seconds = int(td.total_seconds())
                                        hours = total_seconds // 3600
                                        minutes = (total_seconds % 3600) // 60
                                        am_pm = "AM" if hours < 12 else "PM"
                                        if hours == 0:
                                            hours = 12
                                        elif hours > 12:
                                            hours -= 12
                                        return f"{hours}:{minutes:02d} {am_pm}"

                                    session["slots"] = [
                                        {
                                            "id": slot["id"],
                                            "date": slot["Date"].strftime("%Y-%m-%d") if hasattr(slot["Date"], "strftime") else str(slot["Date"]),
                                            "start_time": format_timedelta(slot["Start_Time"]) if isinstance(slot["Start_Time"], timedelta) else slot["Start_Time"].strftime("%I:%M %p").lstrip("0")
                                        }
                                        for slot in slots
                                    ]

                                    # If time is provided by NLU, try to match it
                                    if entities.get("time"):
                                        target_time = entities["time"]
                                        print(f"Time extracted: {target_time}")  # Debug log
                                        matching_slots = [slot for slot in session["slots"] if slot["start_time"] == target_time]
                                        if matching_slots:
                                            session["selected_slot"] = matching_slots[0]
                                            session["state"] = "selecting_appointment_type"
                                            cursor.close()
                                            conn.close()
                                            return jsonify({"message": "Cool, let’s pick the appointment type: type 'virtual' for online or 'in_person' for in-person."}), 200

                                    session["state"] = "selecting_slot"
                                    cursor.close()
                                    conn.close()

                                    response = f"Here are the available slots for {session['selected_therapist']['name']} on {session['selected_date']['date']}:\n"
                                    for i, slot in enumerate(session["slots"], 1):
                                        response += f"{i}. {slot['start_time']}\n"
                                    response += "Which slot would you like?"
                                    return jsonify({"message": response}), 200

                            session["state"] = "selecting_date"
                            cursor.close()
                            conn.close()

                            response = f"Okay, here are some available dates for {session['selected_therapist']['name']}:\n"
                            for i, date in enumerate(session["dates"], 1):
                                response += f"{i}. {date['date']}\n"
                            response += "Which date works for you?"
                            return jsonify({"message": response}), 200
                        else:
                            # Dynamically fetch available therapists for the error message
                            cursor.execute("""
                                SELECT DISTINCT t.THERAPIST_ID, t.FirstName, t.LastName
                                FROM THERAPIST t
                                JOIN AVAILABILITY av ON t.THERAPIST_ID = av.THERAPIST_ID
                                WHERE av.Status = 'available' AND av.Date >= CURDATE()
                            """)
                            therapists = cursor.fetchall()
                            therapist_list = ", ".join([f"{t['FirstName']} {t['LastName']}".strip() for t in therapists])
                            cursor.close()
                            conn.close()
                            print(f"Therapist not found, returning list: {therapist_list}")  # Debug log
                            return jsonify({"message": f"I couldn’t find a therapist matching '{therapist_name}'. Try again or pick from this list: {therapist_list}."}), 200
                    else:
                        # Default flow if NLU didn't provide a therapist
                        print("No therapist name provided by NLU, listing all therapists")  # Debug log
                        cursor.execute("""
                            SELECT DISTINCT t.THERAPIST_ID, t.FirstName, t.LastName
                            FROM THERAPIST t
                            JOIN AVAILABILITY av ON t.THERAPIST_ID = av.THERAPIST_ID
                            WHERE av.Status = 'available' AND av.Date >= CURDATE()
                        """)
                        therapists = cursor.fetchall()
                        if not therapists:
                            cursor.close()
                            conn.close()
                            return jsonify({"message": "Sorry, there aren’t any therapists available right now."}), 200

                        session["therapists"] = [
                            {"id": t["THERAPIST_ID"], "name": f"{t['FirstName']} {t['LastName']}".strip()}
                            for t in therapists
                        ]
                        session["state"] = "selecting_therapist"
                        cursor.close()
                        conn.close()

                        response = "Let’s pick a therapist first! Here’s who’s available:\n"
                        for i, therapist in enumerate(session["therapists"], 1):
                            response += f"{i}. {therapist['name']}\n"
                        response += "Who would you like to schedule with?"
                        return jsonify({"message": response}), 200

                elif command == "view_appointments":
                    # Fetch upcoming appointments
                    cursor.execute("""
                        SELECT a.Appointment_ID, a.Appointment_time, a.Appointment_type, a.Reason_for_meeting, t.FirstName, t.LastName
                        FROM APPOINTMENTS a
                        JOIN AVAILABILITY av ON a.AVAILABILITY_ID = av.ID
                        JOIN THERAPIST t ON av.THERAPIST_ID = t.THERAPIST_ID
                        WHERE a.STUDENT_ID = %s AND a.Status = 'pending' AND a.Appointment_time >= NOW()
                        ORDER BY a.Appointment_time
                    """, (session["selected_child"]["id"],))
                    appointments = cursor.fetchall()
                    if not appointments:
                        cursor.close()
                        conn.close()
                        return jsonify({"message": "Looks like you don’t have any upcoming appointments right now."}), 200

                    session["appointments"] = [
                        {
                            "id": appt["Appointment_ID"],
                            "therapist": f"{appt['FirstName']} {appt['LastName']}".strip(),
                            "date": appt["Appointment_time"].strftime("%Y-%m-%d"),
                            "time": appt["Appointment_time"].strftime("%I:%M %p").lstrip("0"),
                            "type": appt["Appointment_type"],
                            "reason": appt["Reason_for_meeting"]
                        }
                        for appt in appointments
                    ]
                    cursor.close()
                    conn.close()

                    response = "Here are your upcoming appointments:\n"
                    for i, appt in enumerate(session["appointments"], 1):
                        response += f"{i}. {appt['therapist']} on {appt['date']} at {appt['time']} ({appt['type']}) - {appt['reason']}\n"
                    response += "You can pick an appointment number to reschedule or cancel it, or type 'schedule' to book a new one."
                    return jsonify({"message": response}), 200

                elif command in ["reschedule", "cancel"]:
                    # Fetch upcoming appointments
                    cursor.execute("""
                        SELECT a.Appointment_ID, a.Appointment_time, a.Appointment_type, a.Reason_for_meeting, t.FirstName, t.LastName
                        FROM APPOINTMENTS a
                        JOIN AVAILABILITY av ON a.AVAILABILITY_ID = av.ID
                        JOIN THERAPIST t ON av.THERAPIST_ID = t.THERAPIST_ID
                        WHERE a.STUDENT_ID = %s AND a.Status = 'pending' AND a.Appointment_time >= NOW()
                        ORDER BY a.Appointment_time
                    """, (session["selected_child"]["id"],))
                    appointments = cursor.fetchall()
                    if not appointments:
                        cursor.close()
                        conn.close()
                        return jsonify({"message": f"You don’t have any upcoming appointments to {command} right now."}), 200

                    session["appointments"] = [
                        {
                            "id": appt["Appointment_ID"],
                            "therapist": f"{appt['FirstName']} {appt['LastName']}".strip(),
                            "date": appt["Appointment_time"].strftime("%Y-%m-%d"),
                            "time": appt["Appointment_time"].strftime("%I:%M %p").lstrip("0"),
                            "type": appt["Appointment_type"],
                            "reason": appt["Reason_for_meeting"]
                        }
                        for appt in appointments
                    ]
                    session["state"] = "selecting_appointment_" + command
                    cursor.close()
                    conn.close()

                    response = f"Here are your upcoming appointments:\n"
                    for i, appt in enumerate(session["appointments"], 1):
                        response += f"{i}. {appt['therapist']} on {appt['date']} at {appt['time']} ({appt['type']}) - {appt['reason']}\n"
                    response += f"Which appointment would you like to {command}?"
                    return jsonify({"message": response}), 200
                else:
                    cursor.close()
                    conn.close()
                    print("Reached default else block in verified state")  # Debug log
                    return jsonify({"message": "Hmm, I didn’t quite catch that. What would you like to do? You can say 'show therapists' to see available therapists, 'schedule' to book an appointment, 'view appointments' to check your upcoming ones, or 'reschedule' or 'cancel' to manage them."}), 200

            # --- State: Selecting Appointment for Rescheduling ---
            elif state == "selecting_appointment_reschedule":
                try:
                    choice = int(user_input.strip()) - 1
                    if choice < 0 or choice >= len(session["appointments"]):
                        cursor.close()
                        conn.close()
                        return jsonify({"message": f"Hmm, that’s not a valid choice. Please pick a number between 1 and {len(session['appointments'])}."}), 400
                except ValueError:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Oops, I need a number to select an appointment. Can you try again?"}), 400

                session["selected_appointment"] = session["appointments"][choice]
                session["state"] = "selecting_therapist"
                cursor.close()
                conn.close()

                # Start the scheduling flow for a new slot, but don't free the slot yet
                cursor.execute("""
                    SELECT DISTINCT t.THERAPIST_ID, t.FirstName, t.LastName
                    FROM THERAPIST t
                    JOIN AVAILABILITY av ON t.THERAPIST_ID = av.THERAPIST_ID
                    WHERE av.Status = 'available' AND av.Date >= CURDATE()
                """)
                therapists = cursor.fetchall()
                if not therapists:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Sorry, there aren’t any therapists available right now for rescheduling."}), 200

                session["therapists"] = [
                    {"id": t["THERAPIST_ID"], "name": f"{t['FirstName']} {t['LastName']}".strip()}
                    for t in therapists
                ]
                response = "Let’s reschedule that appointment. Here are the available therapists:\n"
                for i, therapist in enumerate(session["therapists"], 1):
                    response += f"{i}. {therapist['name']}\n"
                response += "Who would you like to reschedule with?"
                return jsonify({"message": response}), 200

            # --- State: Selecting Appointment for Cancellation ---
            elif state == "selecting_appointment_cancel":
                try:
                    choice = int(user_input.strip()) - 1
                    if choice < 0 or choice >= len(session["appointments"]):
                        cursor.close()
                        conn.close()
                        return jsonify({"message": f"Hmm, that’s not a valid choice. Please pick a number between 1 and {len(session['appointments'])}."}), 400
                except ValueError:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Oops, I need a number to select an appointment. Can you try again?"}), 400

                session["selected_appointment"] = session["appointments"][choice]
                session["state"] = "confirming_cancellation"
                cursor.close()
                conn.close()
                return jsonify({
                    "message": f"Are you sure you want to cancel your appointment with {session['selected_appointment']['therapist']} on {session['selected_appointment']['date']} at {session['selected_appointment']['time']}? Just say 'yes' to confirm or 'no' to go back."
                }), 200

            # --- State: Confirming Cancellation ---
            elif state == "confirming_cancellation":
                response = user_input.lower().strip()
                if response == "yes":
                    cursor.execute("UPDATE AVAILABILITY SET Status = 'available' WHERE ID = (SELECT AVAILABILITY_ID FROM APPOINTMENTS WHERE Appointment_ID = %s)", (session["selected_appointment"]["id"],))
                    cursor.execute("UPDATE APPOINTMENTS SET Status = 'cancelled' WHERE Appointment_ID = %s", (session["selected_appointment"]["id"],))
                    conn.commit()
                    cursor.close()
                    conn.close()
                    session["state"] = "verified"
                    return jsonify({
                        "message": f"Okay, I’ve cancelled your appointment with {session['selected_appointment']['therapist']} on {session['selected_appointment']['date']} at {session['selected_appointment']['time']}. Anything else I can help with? You can 'schedule' a new appointment, 'view appointments', or 'reschedule' or 'cancel' others."
                    }), 200
                elif response == "no":
                    cursor.close()
                    conn.close()
                    session["state"] = "verified"
                    return jsonify({
                        "message": "No worries, I’ve cancelled the cancellation! What else can I help with? You can 'show therapists', 'schedule', 'view appointments', 'reschedule', or 'cancel' an appointment."
                    }), 200
                else:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Just say 'yes' to confirm or 'no' to go back, please!"}), 400

            # --- State: Selecting Therapist ---
            elif state == "selecting_therapist":
                try:
                    choice = int(user_input.strip()) - 1
                    if choice < 0 or choice >= len(session["therapists"]):
                        cursor.close()
                        conn.close()
                        return jsonify({"message": f"Hmm, that’s not a valid choice. Please pick a number between 1 and {len(session['therapists'])}."}), 400
                except ValueError:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Oops, I need a number to select a therapist. Can you try again?"}), 400

                session["selected_therapist"] = session["therapists"][choice]
                cursor.execute("""
                    SELECT DISTINCT av.Date
                    FROM AVAILABILITY av
                    WHERE av.THERAPIST_ID = %s AND av.Status = 'available' AND av.Date >= CURDATE()
                    ORDER BY av.Date
                    LIMIT 5
                """, (session["selected_therapist"]["id"],))
                dates = cursor.fetchall()
                if not dates:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": f"Sorry, {session['selected_therapist']['name']} doesn’t have any open dates right now."}), 200

                session["dates"] = [
                    {"date": d["Date"].strftime("%Y-%m-%d") if hasattr(d["Date"], "strftime") else str(d["Date"])}
                    for d in dates
                ]
                session["state"] = "selecting_date"
                cursor.close()
                conn.close()

                response = f"Okay, here are some available dates for {session['selected_therapist']['name']}:\n"
                for i, date in enumerate(session["dates"], 1):
                    response += f"{i}. {date['date']}\n"
                response += "Which date works for you?"
                return jsonify({"message": response}), 200

            # --- State: Selecting Date ---
            elif state == "selecting_date":
                try:
                    choice = int(user_input.strip()) - 1
                    if choice < 0 or choice >= len(session["dates"]):
                        cursor.close()
                        conn.close()
                        return jsonify({"message": f"Hmm, that’s not a valid choice. Please pick a number between 1 and {len(session['dates'])}."}), 400
                except ValueError:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Oops, I need a number to select a date. Can you try again?"}), 400

                session["selected_date"] = session["dates"][choice]
                selected_date = datetime.strptime(session["selected_date"]["date"], "%Y-%m-%d").date()
                current_date = datetime.now().date()
                time_filter = ""
                params = [session["selected_therapist"]["id"], selected_date]
                if selected_date == current_date:
                    time_filter = "AND av.Start_Time > TIME(NOW())"

                cursor.execute(f"""
                    SELECT av.ID as id, av.Date, av.Start_Time
                    FROM AVAILABILITY av
                    WHERE av.THERAPIST_ID = %s AND av.Date = %s AND av.Status = 'available' {time_filter}
                    ORDER BY av.Start_Time
                    LIMIT 5
                """, params)
                slots = cursor.fetchall()
                if not slots:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": f"Sorry, {session['selected_therapist']['name']} doesn’t have any open slots on {session['selected_date']['date']}."}), 200

                def format_timedelta(td):
                    total_seconds = int(td.total_seconds())
                    hours = total_seconds // 3600
                    minutes = (total_seconds % 3600) // 60
                    am_pm = "AM" if hours < 12 else "PM"
                    if hours == 0:
                        hours = 12
                    elif hours > 12:
                        hours -= 12
                    return f"{hours}:{minutes:02d} {am_pm}"

                session["slots"] = [
                    {
                        "id": slot["id"],
                        "date": slot["Date"].strftime("%Y-%m-%d") if hasattr(slot["Date"], "strftime") else str(slot["Date"]),
                        "start_time": format_timedelta(slot["Start_Time"]) if isinstance(slot["Start_Time"], timedelta) else slot["Start_Time"].strftime("%I:%M %p").lstrip("0")
                    }
                    for slot in slots
                ]
                session["state"] = "selecting_slot"
                cursor.close()
                conn.close()

                response = f"Here are the available slots for {session['selected_therapist']['name']} on {session['selected_date']['date']}:\n"
                for i, slot in enumerate(session["slots"], 1):
                    response += f"{i}. {slot['start_time']}\n"
                response += "Which slot would you like?"
                return jsonify({"message": response}), 200

            # --- State: Selecting Slot ---
            elif state == "selecting_slot":
                try:
                    choice = int(user_input.strip()) - 1
                    if choice < 0 or choice >= len(session["slots"]):
                        cursor.close()
                        conn.close()
                        return jsonify({"message": f"Hmm, that’s not a valid choice. Please pick a number between 1 and {len(session['slots'])}."}), 400
                except ValueError:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Oops, I need a number to select a slot. Can you try again?"}), 400

                session["selected_slot"] = session["slots"][choice]
                session["state"] = "selecting_appointment_type"
                cursor.close()
                conn.close()
                return jsonify({"message": "Cool, let’s pick the appointment type: type 'virtual' for online or 'in_person' for in-person."}), 200

            # --- State: Selecting Appointment Type ---
            elif state == "selecting_appointment_type":
                appt_type = user_input.lower().strip()
                if appt_type not in ["virtual", "in_person"]:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Hmm, that’s not quite right. Please type 'virtual' for online or 'in_person' for in-person."}), 400

                session["appointment_type"] = appt_type
                session["state"] = "entering_reason"
                cursor.close()
                conn.close()
                return jsonify({"message": "Got it! Now, what’s the reason for this appointment? (e.g., 'Therapy session for anxiety')"}), 200

            # --- State: Entering Reason for Meeting ---
            elif state == "entering_reason":
                reason = user_input.strip()
                if not reason:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "I need a reason for the appointment. Can you tell me why you’re booking this?"}), 400

                session["reason"] = reason
                session["state"] = "confirming_appointment"
                cursor.close()
                conn.close()
                return jsonify({
                    "message": f"Let’s confirm your appointment with {session['selected_therapist']['name']} on {session['selected_slot']['date']} at {session['selected_slot']['start_time']} ({session['appointment_type']}) - {reason}. Just say 'yes' to confirm or 'no' to go back."
                }), 200

            # --- State: Confirming Appointment (Schedule/Reschedule) ---
            elif state == "confirming_appointment":
                response = user_input.lower().strip()
                if response == "yes":
                    slot_id = session["selected_slot"]["id"]
                    cursor.execute("SELECT Date, Start_Time FROM AVAILABILITY WHERE ID = %s AND Status = 'available'", (slot_id,))
                    slot = cursor.fetchone()
                    if not slot:
                        cursor.close()
                        conn.close()
                        return jsonify({"message": "Oh no, that slot isn’t available anymore. Let’s pick a different one."}), 400

                    start_time = slot["Start_Time"]
                    if isinstance(start_time, timedelta):
                        total_seconds = int(start_time.total_seconds())
                        hours = total_seconds // 3600
                        minutes = (total_seconds % 3600) // 60
                        seconds = total_seconds % 60
                        start_time = datetime.strptime(f"{hours:02d}:{minutes:02d}:{seconds:02d}", "%H:%M:%S").time()
                    appt_datetime = datetime.combine(slot["Date"], start_time)

                    # If rescheduling, free up the old slot
                    if "selected_appointment" in session:
                        cursor.execute("UPDATE AVAILABILITY SET Status = 'available' WHERE ID = (SELECT AVAILABILITY_ID FROM APPOINTMENTS WHERE Appointment_ID = %s)", (session["selected_appointment"]["id"],))
                        cursor.execute("UPDATE APPOINTMENTS SET Status = 'cancelled' WHERE Appointment_ID = %s", (session["selected_appointment"]["id"],))

                    # Book the new appointment
                    cursor.execute("""
                        INSERT INTO APPOINTMENTS
                        (STUDENT_ID, AVAILABILITY_ID, Appointment_time, Status, Appointment_type, Reason_for_meeting, PARENTID)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        session["selected_child"]["id"],
                        slot_id,
                        appt_datetime,
                        "pending",
                        session["appointment_type"],
                        session["reason"],
                        session["user_id"] if session["role"] == "parent" else None
                    ))
                    cursor.execute("UPDATE AVAILABILITY SET Status = 'not_available' WHERE ID = %s", (slot_id,))
                    conn.commit()

                    cursor.close()
                    conn.close()
                    session["state"] = "verified"
                    success_message = "Awesome, your appointment is booked!"
                    if session["role"] == "parent":
                        success_message += f" It’s for {session['selected_child']['name']}"
                    success_message += f" with {session['selected_therapist']['name']} on {session['selected_slot']['date']} at {session['selected_slot']['start_time']} ({session['appointment_type']}). Anything else I can help with? You can 'schedule' another appointment, 'view appointments', 'reschedule', or 'cancel'."
                    return jsonify({"message": success_message}), 200
                elif response == "no":
                    cursor.close()
                    conn.close()
                    session["state"] = "verified"
                    return jsonify({
                        "message": "No problem, I’ve cancelled that booking for now. What else can I help with? You can 'show therapists', 'schedule', 'view appointments', 'reschedule', or 'cancel' an appointment."
                    }), 200
                else:
                    cursor.close()
                    conn.close()
                    return jsonify({"message": "Just say 'yes' to confirm or 'no' to go back, please!"}), 400

        except mysql.connector.Error as err:
            if 'conn' in locals():
                conn.rollback()
                cursor.close()
                conn.close()
            print(f"Database error in chatbot interact: {err}")
            return jsonify({"message": "Oops, something went wrong on my end. Let’s try that again!"}), 500

    return app