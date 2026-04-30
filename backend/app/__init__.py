import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import pyodbc
import pymysql
from .config import Config

# Initialize the extensions
db = SQLAlchemy()  # Only for the Auth/RBAC SQLite DB

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for the React frontend
    CORS(app)

    # 1. Initialize Auth DB (SQLite)
    db.init_app(app)

    # Ensure tables are created for the Auth DB
    with app.app_context():
        # import your models here before db.create_all()
        # from .models import User
        db.create_all()

    # Define DB connections for the legacy systems
    def get_hr_db_connection():
        """Returns a connection to the SQL Server HR DB."""
        return pyodbc.connect(app.config['HR_DB_CONNECTION_STRING'])

    def get_payroll_db_connection():
        """Returns a connection to the MySQL Payroll DB."""
        return pymysql.connect(
            host=app.config['PAYROLL_DB_HOST'],
            user=app.config['PAYROLL_DB_USER'],
            password=app.config['PAYROLL_DB_PASSWORD'],
            database=app.config['PAYROLL_DB_NAME'],
            cursorclass=pymysql.cursors.DictCursor
        )

    # Attach connection functions to app for easy access in routes
    app.get_hr_db = get_hr_db_connection
    app.get_payroll_db = get_payroll_db_connection

    # Basic health check route
    @app.route('/api/health')
    def health_check():
        hr_status = "error"
        payroll_status = "error"
        
        # We can attempt connection tests here later if needed
        return jsonify({
            "status": "online",
            "message": "Dashboard API is running",
            "auth_db": "connected via SQLAlchemy",
            "hr_db_configured": bool(app.config.get('HR_DB_SERVER')),
            "payroll_db_configured": bool(app.config.get('PAYROLL_DB_HOST'))
        })

    # Register blueprints (to be created later)
    # from .routes.auth import auth_bp
    # app.register_blueprint(auth_bp, url_prefix='/api/auth')

    return app
