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
            # Giải mã token để lấy thông tin user_id và role
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user_role = data.get('role')  # Lấy quyền của người dùng (Admin, HR Manager, Employee...)
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token đã hết hạn!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token không hợp lệ!'}), 401

        # Gán role vào object request để các decorator khác có thể kiểm tra
        try:
            setattr(request, 'user_role', current_user_role)
        except Exception:
            # Nếu không thể gán (vô cùng hiếm), bỏ qua và tiếp tục truyền như trước
            pass

        # Gọi hàm xử lý bên trong mà không cần truyền role như tham số đầu
        return f(*args, **kwargs)

    return decorated

def require_roles(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # KIỂM TRA QUYỀN (RBAC): Lấy role từ request.user_role nếu có
            user_role = getattr(request, 'user_role', None)
            if user_role not in allowed_roles:
                return jsonify({'message': '403 Forbidden: Bạn không có quyền truy cập báo cáo này!'}), 403
            return f(*args, **kwargs)

        return decorated_function
    return decorator