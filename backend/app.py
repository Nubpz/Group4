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
CORS(app)



# Configure MySQL database connection
db_config = {
    'host': 'localhost',
    'user': 'root',               
    'password': 'University24@',   
    'database': 'therapy_clinic',  
    'port': 3306
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

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

# Register route modules
auth_routes(app, get_db_connection, bcrypt, create_access_token, mail)
admin_routes(app, get_db_connection, jwt_required, get_jwt_identity)
therapist_routes(app, get_db_connection, jwt_required, get_jwt_identity, mail)
parent_routes(app, get_db_connection, jwt_required, get_jwt_identity, mail)
chatbot_routes(app, get_db_connection, jwt_required, get_jwt_identity)
student_routes(app, get_db_connection, jwt_required, get_jwt_identity, mail)
# ... Add other routes here ...

# --------------------
# Run the App
# --------------------
if __name__ == '__main__':
    app.run(port=3000, debug=True)