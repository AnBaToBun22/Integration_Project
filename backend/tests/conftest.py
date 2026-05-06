import pytest
import sys
import os

# Thêm đường dẫn backend vào sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app, db
from app.models import User

@pytest.fixture
def app():
    """Tạo app Flask test với SQLite in-memory cho Auth DB"""
    class TestConfig:
        SECRET_KEY = 'test-secret-key'
        SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        TESTING = True

        # Payroll DB config (sẽ mock)
        PAYROLL_DB_HOST = 'localhost'
        PAYROLL_DB_USER = 'root'
        PAYROLL_DB_PASSWORD = ''
        PAYROLL_DB_NAME = 'payrollnew'

    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Test client cho Flask app"""
    return app.test_client()

@pytest.fixture
def runner(app):
    return app.test_cli_runner()

@pytest.fixture
def auth_token(client):
    """Tạo user test và trả về JWT token"""
    # Tạo user Admin
    client.post('/api/auth/register', json={
        'username': 'admin_test',
        'password': 'admin123',
        'role': 'Admin'
    })

    # Đăng nhập để lấy token
    response = client.post('/api/auth/login', json={
        'username': 'admin_test',
        'password': 'admin123'
    })

    data = response.get_json()
    return data['token']

@pytest.fixture
def hr_manager_token(client):
    """Tạo user HR Manager và trả về JWT token"""
    client.post('/api/auth/register', json={
        'username': 'hr_test',
        'password': 'hr123456',
        'role': 'HR Manager'
    })

    response = client.post('/api/auth/login', json={
        'username': 'hr_test',
        'password': 'hr123456'
    })

    data = response.get_json()
    return data['token']

@pytest.fixture
def employee_token(client):
    """Tạo user Employee và trả về JWT token"""
    client.post('/api/auth/register', json={
        'username': 'emp_test',
        'password': 'emp12345',
        'role': 'Employee'
    })

    response = client.post('/api/auth/login', json={
        'username': 'emp_test',
        'password': 'emp12345'
    })

    data = response.get_json()
    return data['token']