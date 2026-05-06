"""
Bộ Test tự động cho Integration Dashboard Backend
Chạy: cd backend && pytest tests/ -v

Test được chia theo module:
- test_auth: Kiểm tra đăng ký, đăng nhập, token
- test_employees: Kiểm tra CRUD + đồng bộ
- test_departments: Kiểm tra CRUD + đồng bộ
- test_positions: Kiểm tra CRUD + đồng bộ
- test_alerts: Kiểm tra hệ thống cảnh báo
"""
import pytest
import json
from app import create_app, db
from app.models import User


@pytest.fixture(scope='module')
def app():
    """Tạo Flask app cho testing"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test_auth.db'
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture(scope='module')
def client(app):
    """Tạo test client"""
    return app.test_client()


@pytest.fixture(scope='module')
def auth_token(client):
    """Tạo user và lấy token để test các API yêu cầu xác thực"""
    # Đăng ký user test
    client.post('/api/auth/register', json={
        'username': 'testadmin',
        'password': 'TestPass123',
        'role': 'Admin'
    })
    
    # Đăng nhập để lấy token
    response = client.post('/api/auth/login', json={
        'username': 'testadmin',
        'password': 'TestPass123'
    })
    data = json.loads(response.data)
    return data.get('token', '')


# ============================================================
# TEST AUTH MODULE
# ============================================================
class TestAuth:
    """Test xác thực: đăng ký, đăng nhập, token"""

    def test_register_success(self, client):
        """TC-01: Đăng ký thành công"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser',
            'password': 'Pass123',
            'role': 'Employee'
        })
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['user']['username'] == 'newuser'
        assert data['user']['role'] == 'Employee'

    def test_register_duplicate(self, client):
        """TC-02: Đăng ký trùng username → 409"""
        # Đăng ký lần 1
        client.post('/api/auth/register', json={
            'username': 'dupuser',
            'password': 'Pass123',
            'role': 'Employee'
        })
        # Đăng ký lần 2 (trùng)
        response = client.post('/api/auth/register', json={
            'username': 'dupuser',
            'password': 'Pass456',
            'role': 'Employee'
        })
        assert response.status_code == 409

    def test_register_missing_fields(self, client):
        """TC-03: Đăng ký thiếu trường → 400"""
        response = client.post('/api/auth/register', json={
            'username': '',
            'password': ''
        })
        assert response.status_code == 400

    def test_register_invalid_role(self, client):
        """TC-04: Đăng ký role không hợp lệ → 400"""
        response = client.post('/api/auth/register', json={
            'username': 'roletest',
            'password': 'Pass123',
            'role': 'SuperAdmin'
        })
        assert response.status_code == 400

    def test_login_success(self, client):
        """TC-05: Đăng nhập thành công → trả về token"""
        # Đảm bảo user tồn tại
        client.post('/api/auth/register', json={
            'username': 'loginuser',
            'password': 'Pass123',
            'role': 'Employee'
        })
        
        response = client.post('/api/auth/login', json={
            'username': 'loginuser',
            'password': 'Pass123'
        })
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'token' in data
        assert data['user']['username'] == 'loginuser'

    def test_login_wrong_password(self, client):
        """TC-06: Đăng nhập sai mật khẩu → 401"""
        response = client.post('/api/auth/login', json={
            'username': 'loginuser',
            'password': 'WrongPass'
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        """TC-07: Đăng nhập user không tồn tại → 401"""
        response = client.post('/api/auth/login', json={
            'username': 'ghostuser',
            'password': 'Pass123'
        })
        assert response.status_code == 401


# ============================================================
# TEST EMPLOYEE MODULE
# ============================================================
class TestEmployees:
    """Test CRUD nhân viên + đồng bộ"""

    def test_get_employees(self, client, auth_token):
        """TC-10: Lấy danh sách nhân viên"""
        response = client.get('/api/employees', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)

    def test_add_employee_missing_fields(self, client, auth_token):
        """TC-11: Thêm nhân viên thiếu trường bắt buộc → 400"""
        response = client.post('/api/employees', json={
            'FullName': 'Test User'
            # Thiếu Email và DepartmentID
        }, headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 400

    def test_search_employees_no_query(self, client, auth_token):
        """TC-12: Tìm kiếm nhân viên không có từ khóa → 400"""
        response = client.get('/api/employees/search', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 400

    def test_search_employees(self, client, auth_token):
        """TC-13: Tìm kiếm nhân viên"""
        response = client.get('/api/employees/search?q=Nguyen', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200


# ============================================================
# TEST DEPARTMENT MODULE
# ============================================================
class TestDepartments:
    """Test CRUD phòng ban + đồng bộ"""

    def test_get_departments(self, client, auth_token):
        """TC-20: Lấy danh sách phòng ban"""
        response = client.get('/api/departments/', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

    def test_create_department_missing_name(self, client, auth_token):
        """TC-21: Tạo phòng ban thiếu tên → 400"""
        response = client.post('/api/departments/', json={}, headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 400

    def test_create_department_empty_name(self, client, auth_token):
        """TC-22: Tạo phòng ban tên rỗng → 400"""
        response = client.post('/api/departments/', json={'name': '  '}, headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 400

    def test_get_department_not_found(self, client, auth_token):
        """TC-23: Lấy phòng ban không tồn tại → 404"""
        response = client.get('/api/departments/99999', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 404

    def test_delete_department_not_found(self, client, auth_token):
        """TC-24: Xóa phòng ban không tồn tại → 404"""
        response = client.delete('/api/departments/99999', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 404


# ============================================================
# TEST POSITION MODULE
# ============================================================
class TestPositions:
    """Test CRUD chức vụ + đồng bộ"""

    def test_get_positions(self, client, auth_token):
        """TC-30: Lấy danh sách chức vụ"""
        response = client.get('/api/positions/', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

    def test_create_position_missing_name(self, client, auth_token):
        """TC-31: Tạo chức vụ thiếu tên → 400"""
        response = client.post('/api/positions/', json={}, headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 400

    def test_delete_position_not_found(self, client, auth_token):
        """TC-32: Xóa chức vụ không tồn tại → 404"""
        response = client.delete('/api/positions/99999', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 404


# ============================================================
# TEST ALERT MODULE
# ============================================================
class TestAlerts:
    """Test hệ thống cảnh báo"""

    def test_get_alerts(self, client, auth_token):
        """TC-40: Lấy danh sách cảnh báo"""
        response = client.get('/api/alerts', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'alerts' in data
        assert 'total' in data
        assert 'generated_at' in data

    def test_get_alerts_with_threshold(self, client, auth_token):
        """TC-41: Lấy cảnh báo với ngưỡng nghỉ phép custom"""
        response = client.get('/api/alerts?leave_threshold=5', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200


# ============================================================
# TEST DASHBOARD MODULE
# ============================================================
class TestDashboard:
    """Test dashboard stats"""

    def test_get_stats(self, client, auth_token):
        """TC-50: Lấy thống kê dashboard"""
        response = client.get('/api/dashboard/stats', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'hr_total_employees' in data
        assert 'payroll_total_salary' in data
        assert 'hr_connected' in data
        assert 'payroll_connected' in data

    def test_health_check(self, client):
        """TC-51: Kiểm tra health endpoint (không yêu cầu token)"""
        response = client.get('/api/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'online'


# ============================================================
# TEST AUDIT LOG MODULE
# ============================================================
class TestAuditLogs:
    """Test nhật ký kiểm toán"""

    def test_get_audit_logs(self, client, auth_token):
        """TC-60: Lấy danh sách audit logs"""
        response = client.get('/api/audit-logs', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'data' in data
        assert 'total' in data

    def test_get_audit_logs_with_filter(self, client, auth_token):
        """TC-61: Lấy audit logs với filter"""
        response = client.get('/api/audit-logs?resource=employees&action=CREATE', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200


# ============================================================
# TEST REPORT MODULE
# ============================================================
class TestReports:
    """Test báo cáo"""

    def test_get_payroll_months(self, client, auth_token):
        """TC-70: Lấy danh sách tháng có dữ liệu lương"""
        response = client.get('/api/payroll/months', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200

    def test_get_payroll_details(self, client, auth_token):
        """TC-71: Lấy chi tiết lương theo tháng"""
        response = client.get('/api/payroll/details?month=9&year=2024', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200

    def test_get_payroll_list(self, client, auth_token):
        """TC-72: Lấy bảng lương"""
        response = client.get('/api/reports/payroll_list?month=9&year=2024', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200

    def test_get_attendance_report(self, client, auth_token):
        """TC-73: Lấy báo cáo chấm công"""
        response = client.get('/api/reports/attendance?month=9&year=2024', headers={'Authorization': f'Bearer {auth_token}'})
        assert response.status_code == 200
