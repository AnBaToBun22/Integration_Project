from flask import Blueprint, request, jsonify
import jwt
import datetime
import os

from .. import db
from ..models import User

auth_bp = Blueprint('auth_bp', __name__)

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-dev-key-12345")

# ========================
# API ĐĂNG KÝ (Register)
# ========================
@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json

    # Validate input
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"error": "Vui lòng nhập đầy đủ username và password!"}), 400

    username = data['username'].strip()
    password = data['password']
    role = data.get('role', 'Employee')  # Mặc định là Employee

    # Kiểm tra role hợp lệ (khớp với auth_middleware.py)
    valid_roles = ['Admin', 'HR Manager', 'Employee']
    if role not in valid_roles:
        return jsonify({"error": f"Role không hợp lệ! Chọn: {', '.join(valid_roles)}"}), 400

    # Kiểm tra username đã tồn tại chưa
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username đã tồn tại!"}), 409

    # Tạo user mới với mật khẩu đã mã hóa
    new_user = User(username=username, role=role)
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "Đăng ký thành công!",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role
        }
    }), 201


# ==========================
# API ĐĂNG NHẬP (Login)
# ==========================
@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"error": "Vui lòng nhập đầy đủ username và password!"}), 400

    username = data['username'].strip()
    password = data['password']

    # Tìm user trong database
    user = User.query.filter_by(username=username).first()

    # Kiểm tra user tồn tại VÀ mật khẩu đúng
    if not user or not user.check_password(password):
        return jsonify({"error": "Sai tên đăng nhập hoặc mật khẩu!"}), 401

    # Tạo JWT token (hết hạn sau 24 giờ)
    token = jwt.encode({
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({
        "message": "Đăng nhập thành công!",
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }), 200


# ============================
# API lấy thông tin user hiện tại
# ============================
@auth_bp.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """Dùng token để lấy thông tin user đang đăng nhập"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Chưa đăng nhập!"}), 401

    token = auth_header.split(' ')[1]
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({"error": "User không tồn tại!"}), 404

        return jsonify({
            "id": user.id,
            "username": user.username,
            "role": user.role
        }), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token đã hết hạn!"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Token không hợp lệ!"}), 401
