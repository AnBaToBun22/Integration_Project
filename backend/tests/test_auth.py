"""
Test cases cho Auth API (Register, Login, Get Me)
"""

class TestRegister:
    """UC: Đăng ký tài khoản"""
    
    def test_register_success(self, client):
        """Đăng ký thành công với thông tin hợp lệ"""
        response = client.post('/api/auth/register', json={
            'username': 'new_user',
            'password': 'password123',
            'role': 'Employee'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['user']['username'] == 'new_user'
        assert data['user']['role'] == 'Employee'
    
    def test_register_duplicate_username(self, client):
        """Đăng ký thất bại khi username đã tồn tại"""
        client.post('/api/auth/register', json={
            'username': 'duplicate_user',
            'password': 'password123',
            'role': 'Employee'
        })
        
        response = client.post('/api/auth/register', json={
            'username': 'duplicate_user',
            'password': 'password456',
            'role': 'Admin'
        })
        assert response.status_code == 409
    
    def test_register_missing_fields(self, client):
        """Đăng ký thất bại khi thiếu thông tin"""
        response = client.post('/api/auth/register', json={
            'username': 'test_user'
            # Thiếu password
        })
        assert response.status_code == 400
    
    def test_register_invalid_role(self, client):
        """Đăng ký thất bại khi role không hợp lệ"""
        response = client.post('/api/auth/register', json={
            'username': 'test_invalid',
            'password': 'password123',
            'role': 'SuperAdmin'  # Không hợp lệ
        })
        assert response.status_code == 400
    
    def test_register_default_role(self, client):
        """Đăng ký mặc định role = Employee"""
        response = client.post('/api/auth/register', json={
            'username': 'default_role_user',
            'password': 'password123'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['user']['role'] == 'Employee'


class TestLogin:
    """UC: Đăng nhập"""
    
    def test_login_success(self, client):
        """Đăng nhập thành công"""
        # Tạo tài khoản trước
        client.post('/api/auth/register', json={
            'username': 'login_user',
            'password': 'password123',
            'role': 'Admin'
        })
        
        response = client.post('/api/auth/login', json={
            'username': 'login_user',
            'password': 'password123'
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'token' in data
        assert data['user']['role'] == 'Admin'
    
    def test_login_wrong_password(self, client):
        """Đăng nhập thất bại khi sai mật khẩu"""
        client.post('/api/auth/register', json={
            'username': 'wrong_pass_user',
            'password': 'password123',
            'role': 'Employee'
        })
        
        response = client.post('/api/auth/login', json={
            'username': 'wrong_pass_user',
            'password': 'wrong_password'
        })
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, client):
        """Đăng nhập thất bại khi user không tồn tại"""
        response = client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'password123'
        })
        assert response.status_code == 401
    
    def test_login_missing_fields(self, client):
        """Đăng nhập thất bại khi thiếu thông tin"""
        response = client.post('/api/auth/login', json={
            'username': 'test'
        })
        assert response.status_code == 400


class TestGetMe:
    """UC: Lấy thông tin user hiện tại"""
    
    def test_get_me_success(self, client, auth_token):
        """Lấy thông tin thành công với token hợp lệ"""
        response = client.get('/api/auth/me', headers={
            'Authorization': f'Bearer {auth_token}'
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data['username'] == 'admin_test'
        assert data['role'] == 'Admin'
    
    def test_get_me_no_token(self, client):
        """Lấy thông tin thất bại khi không có token"""
        response = client.get('/api/auth/me')
        assert response.status_code == 401
    
    def test_get_me_invalid_token(self, client):
        """Lấy thông tin thất bại khi token không hợp lệ"""
        response = client.get('/api/auth/me', headers={
            'Authorization': 'Bearer invalid-token-here'
        })
        assert response.status_code == 401
