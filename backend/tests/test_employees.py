"""
Test cases cho Employee API — RBAC & Access Control
(DB integration tests cần SQL Server & MySQL nên chỉ test auth/RBAC ở đây)
"""

class TestEmployeeRBAC:
    """Kiểm tra phân quyền truy cập API Employees"""
    
    def test_get_employees_requires_token(self, client):
        """GET /api/employees yêu cầu token"""
        response = client.get('/api/employees')
        assert response.status_code == 401
    
    def test_create_employee_requires_admin_or_hr(self, client, employee_token):
        """POST /api/employees chỉ cho Admin/HR Manager, Employee bị 403"""
        response = client.post('/api/employees', 
            json={'FullName': 'Test', 'Email': 'test@test.com', 'DepartmentID': 1},
            headers={'Authorization': f'Bearer {employee_token}'}
        )
        assert response.status_code == 403
    
    def test_delete_employee_requires_admin(self, client, hr_manager_token):
        """DELETE /api/employees chỉ cho Admin, HR Manager bị 403"""
        response = client.delete('/api/employees/1',
            headers={'Authorization': f'Bearer {hr_manager_token}'}
        )
        assert response.status_code == 403
    
    def test_update_employee_requires_admin_or_hr(self, client, employee_token):
        """PUT /api/employees chỉ cho Admin/HR Manager"""
        response = client.put('/api/employees/1',
            json={'FullName': 'Updated', 'Email': 'updated@test.com'},
            headers={'Authorization': f'Bearer {employee_token}'}
        )
        assert response.status_code == 403
    
    def test_create_employee_missing_required_fields(self, client, auth_token):
        """POST /api/employees thất bại khi thiếu trường bắt buộc"""
        response = client.post('/api/employees',
            json={'FullName': 'Test'},  # Thiếu Email, DepartmentID
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 400


class TestDepartmentRBAC:
    """Kiểm tra phân quyền API Departments"""
    
    def test_get_departments_requires_token(self, client):
        """GET /api/departments/ yêu cầu token"""
        response = client.get('/api/departments/')
        assert response.status_code == 401
    
    def test_create_department_employee_forbidden(self, client, employee_token):
        """POST /api/departments/ bị chặn cho Employee"""
        response = client.post('/api/departments/',
            json={'name': 'Test Dept'},
            headers={'Authorization': f'Bearer {employee_token}'}
        )
        assert response.status_code == 403
    
    def test_delete_department_requires_admin(self, client, hr_manager_token):
        """DELETE /api/departments/ chỉ cho Admin"""
        response = client.delete('/api/departments/1',
            headers={'Authorization': f'Bearer {hr_manager_token}'}
        )
        assert response.status_code == 403


class TestPositionRBAC:
    """Kiểm tra phân quyền API Positions"""
    
    def test_get_positions_requires_token(self, client):
        """GET /api/positions/ yêu cầu token"""
        response = client.get('/api/positions/')
        assert response.status_code == 401
    
    def test_create_position_employee_forbidden(self, client, employee_token):
        """POST /api/positions/ bị chặn cho Employee"""
        response = client.post('/api/positions/',
            json={'name': 'Test Position'},
            headers={'Authorization': f'Bearer {employee_token}'}
        )
        assert response.status_code == 403
    
    def test_delete_position_requires_admin(self, client, hr_manager_token):
        """DELETE /api/positions/ chỉ cho Admin"""
        response = client.delete('/api/positions/1',
            headers={'Authorization': f'Bearer {hr_manager_token}'}
        )
        assert response.status_code == 403


class TestDashboardRBAC:
    """Kiểm tra phân quyền API Dashboard"""
    
    def test_dashboard_stats_requires_token(self, client):
        """GET /api/dashboard/stats yêu cầu token"""
        response = client.get('/api/dashboard/stats')
        assert response.status_code == 401
    
    def test_audit_logs_requires_token(self, client):
        """GET /api/logs yêu cầu token"""
        response = client.get('/api/logs')
        assert response.status_code == 401
    
    def test_alerts_requires_token(self, client):
        """GET /api/alerts yêu cầu token"""
        response = client.get('/api/alerts')
        assert response.status_code == 401
