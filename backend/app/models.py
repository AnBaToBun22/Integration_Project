from . import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone


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
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        """Mã hóa mật khẩu trước khi lưu (không bao giờ lưu mật khẩu thô)"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """So sánh mật khẩu nhập vào với hash đã lưu"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username} - {self.role}>'


class AuditLog(db.Model):
    """
    Bảng Audit Log ghi lại mọi thao tác của người dùng.
    Lưu trong SQLite (auth_dashboard.db) để đảm bảo tuân thủ bảo mật.
    """
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Thông tin người thực hiện
    user_id = db.Column(db.Integer, nullable=True)  # NULL nếu chưa đăng nhập
    username = db.Column(db.String(80), nullable=True)
    user_role = db.Column(db.String(50), nullable=True)
    
    # Thông tin thao tác
    action = db.Column(db.String(50), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    resource = db.Column(db.String(100), nullable=False)  # employees, departments, positions...
    resource_id = db.Column(db.String(50), nullable=True)  # ID bản ghi bị thao tác
    
    # Chi tiết thay đổi
    details = db.Column(db.Text, nullable=True)  # JSON string mô tả chi tiết
    ip_address = db.Column(db.String(45), nullable=True)
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f'<AuditLog {self.action} {self.resource} by {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'user_role': self.user_role,
            'action': self.action,
            'resource': self.resource,
            'resource_id': self.resource_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
