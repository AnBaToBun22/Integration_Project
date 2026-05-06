import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import pyodbc
import pymysql
from .config import Config

# Khởi tạo extension SQLAlchemy cho database Auth (SQLite)
db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Bật CORS để React (Port 5173) có thể gọi API Python (Port 5000)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # 1. Khởi tạo Auth DB (SQLite)
    db.init_app(app)

    with app.app_context():
        # Import models để SQLAlchemy biết cần tạo bảng gì
        from .models import User, AuditLog
        # Tự động tạo bảng cho database Auth nếu chưa có
        db.create_all()

    # 2. Định nghĩa kết nối SQL Server (HR DB - HUMAN_2025)
    def get_hr_db():
        try:
            # Ưu tiên lấy chuỗi kết nối từ file .env
            connstr = os.environ.get('HR_DB_CONNECTION_STRING')

            if not connstr:
                # Tự build connection string từ các biến riêng lẻ
                server = app.config.get('HR_DB_SERVER', r'(localdb)\MSSQLLocalDB')
                database = app.config.get('HR_DB_NAME', 'HUMAN_2025')
                connstr = (
                    f"Driver={{ODBC Driver 17 for SQL Server}};"
                    f"Server={server};"
                    f"Database={database};"
                    f"Trusted_Connection=yes;"
                )

            conn = pyodbc.connect(connstr)
            return conn
        except Exception as e:
            print(f"[ERROR] Không thể kết nối SQL Server (HR DB): {e}")
            raise e

    # 3. Định nghĩa kết nối MySQL (Payroll DB)
    def get_payroll_db_connection():
        return pymysql.connect(
            host=app.config['PAYROLL_DB_HOST'],
            user=app.config['PAYROLL_DB_USER'],
            password=app.config['PAYROLL_DB_PASSWORD'],
            database=app.config['PAYROLL_DB_NAME'],
            cursorclass=pymysql.cursors.DictCursor
        )

    # Gắn hàm kết nối vào app để các routes dễ dàng gọi tới
    app.get_hr_db = get_hr_db
    app.get_payroll_db = get_payroll_db_connection

    # API kiểm tra trạng thái hệ thống
    @app.route('/api/health')
    def health_check():
        return jsonify({
            "status": "online",
            "message": "Dashboard API is running",
            "hr_db_connected": test_db(app.get_hr_db),
            "payroll_db_connected": test_db(app.get_payroll_db)
        })

    def test_db(get_connection_func):
        try:
            conn = get_connection_func()
            conn.close()
            return True
        except:
            return False

    # ================================================
    # ĐĂNG KÝ CÁC BLUEPRINT (Các file Route)
    # ================================================

    # Phần xác thực đăng nhập / đăng ký
    from .routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp)

    # Phần quản lý nhân viên (UC.5, 6, 7, 8)
    from .routes.employee_routes import employee_bp
    app.register_blueprint(employee_bp)

    # Phần quản lý phòng ban
    from .routes.department_routes import department_bp
    app.register_blueprint(department_bp)

    # Phần quản lý chức vụ (MỚI)
    from .routes.position_routes import position_bp
    app.register_blueprint(position_bp)

    # Phần báo cáo (UC.11, 12, 13)
    from .routes.report_routes import report_bp
    app.register_blueprint(report_bp)

    # Phần tổng hợp dữ liệu cho Dashboard
    from .routes.dashboard_routes import dashboard_bp
    app.register_blueprint(dashboard_bp)

    # Phần cảnh báo tự động (MỚI)
    from .routes.alert_routes import alert_bp
    app.register_blueprint(alert_bp)

    # Phần nhật ký kiểm toán (MỚI)
    from .routes.audit_routes import audit_bp
    app.register_blueprint(audit_bp)

    return app