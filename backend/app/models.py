from . import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(db.Model):
    """
    Bảng User cho chức năng Đăng nhập / Đăng ký.
    Dùng SQLite (auth_dashboard.db) - tách biệt hoàn toàn với HR (SQL Server) và Payroll (MySQL).
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # Role cho RBAC: khớp với auth_middleware.py (Admin, HR Manager, Employee)
    role = db.Column(db.String(50), nullable=False, default='Employee')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        """Mã hóa mật khẩu trước khi lưu (không bao giờ lưu mật khẩu thô)"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """So sánh mật khẩu nhập vào với hash đã lưu"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username} - {self.role}>'


class AuditLog(db.Model):
    """Lưu lịch sử hoạt động hệ thống (thêm/sửa/xóa) cho mục đích audit."""
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    action = db.Column(db.String(50), nullable=False)  # create/update/delete
    entity = db.Column(db.String(100), nullable=False)  # e.g., Employee
    entity_id = db.Column(db.String(64), nullable=True)
    user_role = db.Column(db.String(80), nullable=True)
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<AuditLog {self.action} {self.entity}:{self.entity_id} by {self.user_role}>'

    def to_dict(self):
        return {
            'id': self.id,
            'action': self.action,
            'entity': self.entity,
            'entity_id': self.entity_id,
            'user_role': self.user_role,
            'details': self.details,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
