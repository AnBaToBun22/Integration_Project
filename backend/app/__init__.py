import os
from flask import Flask, jsonify  # Đã sửa: bỏ import app ở đây
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import pyodbc
import pymysql
from .config import Config
from flask import current_app

# Khởi tạo extension SQLAlchemy cho database Auth (SQLite)
db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Bật CORS để React (Port 5173) có thể gọi API Python (Port 5000)
    # Đây là chìa khóa để giải quyết lỗi "Dữ liệu bị chặn"
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # 1. Khởi tạo Auth DB (SQLite)
    db.init_app(app)

    with app.app_context():
        # Tự động tạo bảng cho database Auth nếu chưa có
        db.create_all()

    # 2. Định nghĩa kết nối SQL Server (HR DB - HUMAN_2025)
    def get_hr_db():
     try:
        # Lấy chuỗi kết nối từ file .env
        connstr = os.environ.get('HR_DB_CONNECTION_STRING')
        
        # Nếu không tìm thấy trong .env thì báo lỗi rõ ràng
        if not connstr:
            raise ValueError("Chưa cấu hình HR_DB_CONNECTION_STRING trong file .env!")
            
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

    # Gắn hàm kết nối vào app để các routes (của Hiếu và Vinh) dễ dàng gọi tới
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


    # ĐĂNG KÝ CÁC BLUEPRINT (Các file Route)
    # Phần báo cáo của Phan Quang Hiếu (UC.11, 12, 13)
    from .routes.report_routes import report_bp
    app.register_blueprint(report_bp)

    # Phần quản lý nhân viên hỗ trợ Vinh (UC.5, 6, 7)
    from .routes.employee_routes import employee_bp
    app.register_blueprint(employee_bp)

    return app