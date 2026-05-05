import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'super-secret-default-key-for-dev'
    
    # 1. Internal Auth/RBAC Database (SQLite for local, could be Postgres)
    SQLALCHEMY_DATABASE_URI = os.environ.get('AUTH_DATABASE_URL') or 'sqlite:///auth_dashboard.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # 2. HR Database (SQL Server - HUMAN_2025)
    HR_DB_SERVER = os.environ.get('HR_DB_SERVER', 'localhost')
    HR_DB_NAME = os.environ.get('HR_DB_NAME', 'HUMAN_2025')
    HR_DB_USER = os.environ.get('HR_DB_USER', 'sa')
    HR_DB_PASSWORD = os.environ.get('HR_DB_PASSWORD', 'your_password')
    
    # pyodbc connection string builder
    HR_DB_CONNECTION_STRING = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={HR_DB_SERVER};"
        f"DATABASE={HR_DB_NAME};"
        f"UID={HR_DB_USER};"
        f"PWD={HR_DB_PASSWORD}"
    )

    # 3. Payroll Database (MySQL - payroll)
    PAYROLL_DB_HOST = os.environ.get('PAYROLL_DB_HOST', 'localhost')
    PAYROLL_DB_USER = os.environ.get('PAYROLL_DB_USER', 'root')
    PAYROLL_DB_PASSWORD = os.environ.get('PAYROLL_DB_PASSWORD', '123456')
    PAYROLL_DB_NAME = os.environ.get('PAYROLL_DB_NAME', 'payroll')
