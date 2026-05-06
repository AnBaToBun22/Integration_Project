from functools import wraps
from flask import request, jsonify, g
import jwt
import os
from dotenv import load_dotenv

# Tải các biến môi trường từ file .env lên hệ thống
load_dotenv()

# Đọc khóa bí mật từ file .env.
# Nếu file .env chưa có, nó sẽ tự lùi về khóa dự phòng bên phải để code không bị sập
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-dev-key-12345")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Kiểm tra token trong Header của Request
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'message': 'Thiếu Token! Vui lòng đăng nhập.'}), 401
            
        try:
            # Giải mã token để lấy thông tin
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            # Lưu thông tin user vào flask.g để các route có thể sử dụng (cho RBAC và Logging)
            g.user = {
                'id': data.get('user_id'),
                'username': data.get('username'),
                'role': data.get('role')
            }
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token đã hết hạn!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token không hợp lệ!'}), 401
        
        # Gọi hàm xử lý bên trong (không truyền tham số nữa để giữ nguyên signature)
        return f(*args, **kwargs)
    return decorated

def require_roles(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Lấy role từ flask.g (đã được lưu ở token_required)
            current_user_role = getattr(g, 'user', {}).get('role')
            
            # KIỂM TRA QUYỀN (RBAC)
            if current_user_role not in allowed_roles:
                return jsonify({'message': f'403 Forbidden: Yêu cầu quyền {allowed_roles}. Bạn không có quyền truy cập!'}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator