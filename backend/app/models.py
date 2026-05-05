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
    
    created_at = db.Column(db.DateTime, default=datetime.now)

    def set_password(self, password):
        """Mã hóa mật khẩu trước khi lưu (không bao giờ lưu mật khẩu thô)"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """So sánh mật khẩu nhập vào với hash đã lưu"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username} - {self.role}>'
class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False, default="Admin")
    action = db.Column(db.String(50), nullable=False)
    detail = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "action": self.action,
            "detail": self.detail,
            "timestamp": self.timestamp.strftime("%d/%m/%Y %H:%M:%S") 
        }