from functools import wraps
from flask import request, jsonify
import jwt
import os
from dotenv import load_dotenv

# Tải các biến môi trường từ file .env lên hệ thống
load_dotenv()

# Đọc khóa bí mật từ file .env.
# Nếu file .env chưa có, nó sẽ tự lùi về khóa dự phòng bên phải để code không bị sập
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-dev-key-12345")

def token_required(f):
    """
    Decorator bắt buộc yêu cầu JWT token.
    Truyền cả current_user_role VÀ current_username vào hàm xử lý.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Kiểm tra token trong Header của Request
        auth_header = request.headers.get('Authorization', '')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'message': 'Thiếu Token! Vui lòng đăng nhập.'}), 401
            
        try:
            # Giải mã token để lấy thông tin user_id và role
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user_role = data.get('role', 'Employee')
            current_username = data.get('username', 'Unknown')
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token đã hết hạn!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token không hợp lệ!'}), 401
        
        # Trả role VÀ username về cho hàm xử lý bên trong
        return f(current_user_role, *args, current_username=current_username, **kwargs)
    return decorated

def require_roles(allowed_roles):
    """
    Decorator kiểm tra quyền RBAC.
    Phải dùng SAU @token_required.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user_role, *args, **kwargs):
            # KIỂM TRA QUYỀN (RBAC): Trả về 403 nếu role không nằm trong danh sách được phép
            if current_user_role not in allowed_roles:
                return jsonify({'message': '403 Forbidden: Bạn không có quyền truy cập chức năng này!'}), 403
            return f(current_user_role, *args, **kwargs)
        return decorated_function
    return decorator