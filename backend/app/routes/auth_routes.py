from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
import os

from .. import db
from ..models import User, AuditLog
from ..auth_middleware import token_required, require_roles

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
    # Bảo mật: Không cho phép tự đăng ký quyền Admin hoặc HR Manager
    # Tất cả tài khoản đăng ký mới mặc định là 'Employee'
    role = 'Employee'

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

    # Tạo JWT token (hết hạn sau 24 giờ) - Fix deprecated utcnow()
    token = jwt.encode({
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
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
        user = db.session.get(User, data['user_id'])
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


# ==========================================
# API QUẢN LÝ TÀI KHOẢN (Settings Page)
# ==========================================

@auth_bp.route('/api/auth/users', methods=['GET'])
@token_required
@require_roles(['Admin'])
def get_all_users(current_user_role, **kwargs):
    """Lấy danh sách tất cả user (chỉ Admin)"""
    users = User.query.order_by(User.created_at.desc()).all()
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "created_at": user.created_at.strftime("%d/%m/%Y %H:%M") if user.created_at else "N/A"
        })
    return jsonify(result), 200


@auth_bp.route('/api/auth/users/<int:user_id>/role', methods=['PUT'])
@token_required
@require_roles(['Admin'])
def update_user_role(current_user_role, user_id, **kwargs):
    """Cập nhật role của user (chỉ Admin)"""
    current_username = kwargs.get('current_username', 'Unknown')
    data = request.json

    if not data or 'role' not in data:
        return jsonify({"error": "Vui lòng chọn role mới!"}), 400

    new_role = data['role']
    valid_roles = ['Admin', 'HR Manager', 'Employee']
    if new_role not in valid_roles:
        return jsonify({"error": f"Role không hợp lệ! Chọn: {', '.join(valid_roles)}"}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User không tồn tại!"}), 404

    old_role = user.role
    user.role = new_role
    db.session.commit()

    # AuditLog
    try:
        log = AuditLog(
            username=current_username,
            action="CẬP NHẬT",
            detail=f"Đổi role user '{user.username}': {old_role} → {new_role}"
        )
        db.session.add(log)
        db.session.commit()
    except:
        pass

    return jsonify({"message": f"Đã đổi role của '{user.username}' thành '{new_role}'"}), 200


@auth_bp.route('/api/auth/users/<int:user_id>', methods=['DELETE'])
@token_required
@require_roles(['Admin'])
def delete_user(current_user_role, user_id, **kwargs):
    """Xóa user (chỉ Admin, không thể xóa chính mình)"""
    current_username = kwargs.get('current_username', 'Unknown')

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User không tồn tại!"}), 404

    if user.username == current_username:
        return jsonify({"error": "Không thể xóa tài khoản của chính mình!"}), 400

    deleted_name = user.username
    db.session.delete(user)
    db.session.commit()

    # AuditLog
    try:
        log = AuditLog(
            username=current_username,
            action="XÓA",
            detail=f"Xóa tài khoản user: {deleted_name}"
        )
        db.session.add(log)
        db.session.commit()
    except:
        pass

    return jsonify({"message": f"Đã xóa tài khoản '{deleted_name}'"}), 200


@auth_bp.route('/api/auth/change-password', methods=['PUT'])
@token_required
def change_password(current_user_role, **kwargs):
    """Đổi mật khẩu (user tự đổi cho chính mình)"""
    current_username = kwargs.get('current_username', 'Unknown')
    data = request.json

    if not data or not data.get('current_password') or not data.get('new_password'):
        return jsonify({"error": "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!"}), 400

    if len(data['new_password']) < 4:
        return jsonify({"error": "Mật khẩu mới phải có ít nhất 4 ký tự!"}), 400

    user = User.query.filter_by(username=current_username).first()
    if not user:
        return jsonify({"error": "User không tồn tại!"}), 404

    if not user.check_password(data['current_password']):
        return jsonify({"error": "Mật khẩu hiện tại không đúng!"}), 401

    user.set_password(data['new_password'])
    db.session.commit()

    # AuditLog
    try:
        log = AuditLog(
            username=current_username,
            action="CẬP NHẬT",
            detail=f"User '{current_username}' đã đổi mật khẩu"
        )
        db.session.add(log)
        db.session.commit()
    except:
        pass

    return jsonify({"message": "Đổi mật khẩu thành công!"}), 200


# ==========================================
# API KIỂM TRA KẾT NỐI DATABASE (Settings)
# ==========================================

@auth_bp.route('/api/system/db-status', methods=['GET'])
@token_required
def get_db_status(current_user_role, **kwargs):
    """Kiểm tra trạng thái kết nối tất cả database"""
    result = {
        "hr": {
            "name": "SQL Server — HUMAN_2025",
            "driver": os.getenv("HR_DB_DRIVER", "ODBC Driver 17 for SQL Server"),
            "server": os.getenv("HR_DB_SERVER", "N/A"),
            "database": os.getenv("HR_DB_NAME", "HUMAN_2025"),
            "status": "disconnected",
            "tables": [],
            "error": None
        },
        "payroll": {
            "name": "MySQL — Payroll",
            "host": os.getenv("PAYROLL_DB_HOST", "localhost"),
            "port": 3306,
            "database": os.getenv("PAYROLL_DB_NAME", "N/A"),
            "user": os.getenv("PAYROLL_DB_USER", "N/A"),
            "status": "disconnected",
            "tables": [],
            "error": None
        },
        "auth": {
            "name": "SQLite — Auth DB",
            "file": "auth_dashboard.db",
            "status": "connected",
            "tables": ["users", "audit_logs"],
            "user_count": User.query.count(),
            "log_count": AuditLog.query.count(),
            "error": None
        }
    }

    # Kiểm tra HR DB
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
        """)
        result["hr"]["tables"] = [row[0] for row in cursor.fetchall()]
        result["hr"]["status"] = "connected"
        conn.close()
    except Exception as e:
        result["hr"]["status"] = "disconnected"
        result["hr"]["error"] = str(e)

    # Kiểm tra Payroll DB
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES")
        result["payroll"]["tables"] = [list(row.values())[0] for row in cursor.fetchall()]
        result["payroll"]["status"] = "connected"
        conn.close()
    except Exception as e:
        result["payroll"]["status"] = "disconnected"
        result["payroll"]["error"] = str(e)

    return jsonify(result), 200
