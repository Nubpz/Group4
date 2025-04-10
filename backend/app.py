from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
import datetime
import json

# Import separate route modules
from auth_routes import register_routes as auth_routes
from admin_routes import register_routes as admin_routes
from therapist_routes import register_routes as therapist_routes
from parent_routes import register_routes as parent_routes
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

# Register route modules
auth_routes(app, get_db_connection, bcrypt, create_access_token)
admin_routes(app, get_db_connection, jwt_required, get_jwt_identity)
therapist_routes(app, get_db_connection, jwt_required, get_jwt_identity)
parent_routes(app, get_db_connection, jwt_required, get_jwt_identity)
# ... Add other routes here ...

# --------------------
# Run the App
# --------------------
if __name__ == '__main__':
    app.run(port=3000, debug=True)