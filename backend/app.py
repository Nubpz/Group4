from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from flask_mail import Mail                   # ← SMTP
from dotenv import load_dotenv                # ← read .env
import os

import datetime
import json


# Import route modules
from auth_routes import register_routes as auth_routes
from admin_routes import register_routes as admin_routes
from therapist_routes import register_routes as therapist_routes
from parent_routes import register_routes as parent_routes
from student_routes import register_routes as student_routes
from chatbot_routes import register_routes as chatbot_routes

load_dotenv()    
app = Flask(__name__)

# Configure CORS with specific settings
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3001"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configure MySQL database connection
db_config = {
    'host': 'localhost',
    'user': 'root',               
    'password': 'Bd2222Mo?',   
    'database': 'therapy_clinic',  
    'port': 3306
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        print("Database connection successful")
        return conn
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise

# Configure JWT and Bcrypt
app.config["JWT_SECRET_KEY"] = "your-secret-key"
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# ── Mail (no‑reply account) ───────────────────────────────────
app.config.update(
    MAIL_SERVER       = "smtp.gmail.com",
    MAIL_PORT         = 587,
    MAIL_USE_TLS      = True,
    MAIL_USERNAME     = os.getenv("EMAIL_USER"),   # e.g. donotreply.clinic@gmail.com
    MAIL_PASSWORD     = os.getenv("EMAIL_PASS"),   # 16‑char App Password
    MAIL_DEFAULT_SENDER = ("Therapy‑Bot", os.getenv("EMAIL_USER"))
)
mail = Mail(app)

# New endpoint for user locations
@app.route('/api/users/locations', methods=['GET'])
@jwt_required()
def get_user_locations():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Query to get user locations
        query = """
            SELECT 
                u.USER_ID as id,
                CONCAT(
                    CASE WHEN u.ROLE='parent' THEN p.FirstName
                         WHEN u.ROLE='student' THEN s.FirstName
                         WHEN u.ROLE='therapist' THEN t.FirstName
                         ELSE 'Admin'
                    END,
                    ' ',
                    CASE WHEN u.ROLE='parent' THEN p.LastName
                         WHEN u.ROLE='student' THEN s.LastName
                         WHEN u.ROLE='therapist' THEN t.LastName
                         ELSE ''
                    END
                ) as name,
                u.ROLE as role,
                u.username as contact,
                u.latitude,
                u.longitude
            FROM USERS u
            LEFT JOIN PARENT p ON u.USER_ID = p.USER_ID AND u.ROLE = 'parent'
            LEFT JOIN STUDENT s ON u.USER_ID = s.USER_ID AND u.ROLE = 'student'
            LEFT JOIN THERAPIST t ON u.USER_ID = t.USER_ID AND u.ROLE = 'therapist'
            WHERE u.latitude IS NOT NULL AND u.longitude IS NOT NULL
        """
        
        cursor.execute(query)
        users = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/users/update-location', methods=['POST'])
@jwt_required()
def update_location():
    identity = get_jwt_identity()
    if isinstance(identity, str):
        identity = json.loads(identity)
    user_id = identity['user_id']
    data = request.get_json()
    lat, lng = data.get('latitude'), data.get('longitude')
    if lat is None or lng is None:
        return jsonify({'message': 'Missing coordinates'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE USERS SET latitude=%s, longitude=%s WHERE USER_ID=%s", (lat, lng, user_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Location updated successfully'}), 200
    except Exception as e:
        return jsonify({'message': f'Error updating location: {e}'}), 500

# Register route modules
auth_routes(app, get_db_connection, bcrypt, create_access_token)
admin_routes(app, get_db_connection, jwt_required, get_jwt_identity)
therapist_routes(app, get_db_connection, jwt_required, get_jwt_identity)
parent_routes(app, get_db_connection, jwt_required, get_jwt_identity, mail)
student_routes(app, get_db_connection, jwt_required, get_jwt_identity)
chatbot_routes(app, get_db_connection, jwt_required, get_jwt_identity)
# ... Add other routes here ...

# --------------------
# Run the App
# --------------------
if __name__ == '__main__':
    app.run(debug=True, port=3000)