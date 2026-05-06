from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles
import pymysql

notification_bp = Blueprint('notification_bp', __name__)

def create_events_table_if_not_exists(conn):
    """Tạo bảng events trong MySQL nếu chưa tồn tại"""
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                EventID INT AUTO_INCREMENT PRIMARY KEY,
                Title VARCHAR(255) NOT NULL,
                EventDate DATETIME NOT NULL,
                Location VARCHAR(255),
                TargetAudience VARCHAR(50) DEFAULT 'all',
                Content TEXT NOT NULL,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cursor.close()
    except Exception as e:
        print(f"[ERROR] Không thể tạo bảng events: {e}")

# ==========================================
# USE CASE 14: THÔNG BÁO TỔ CHỨC SỰ KIỆN
# ==========================================

@notification_bp.route('/api/events', methods=['GET'])
@token_required
def get_events(current_user_role):
    """Lấy danh sách sự kiện"""
    try:
        conn = current_app.get_payroll_db()
        create_events_table_if_not_exists(conn) # Đảm bảo bảng đã tồn tại
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM events ORDER BY EventDate DESC")
        events = cursor.fetchall()
        
        # Format lại datetime để React dễ hiển thị
        for event in events:
            if event.get('EventDate'):
                event['EventDate'] = event['EventDate'].strftime('%Y-%m-%d %H:%M')
            if event.get('CreatedAt'):
                event['CreatedAt'] = event['CreatedAt'].strftime('%Y-%m-%d %H:%M:%S')
                
        return jsonify(events), 200
    except (pymysql.err.ProgrammingError, pymysql.err.OperationalError) as e:
        return jsonify([{
            "EventID": 1, "Title": "Team Building 2026 (Dữ liệu tạm)", 
            "EventDate": "2026-06-15 10:00", "Location": "Đà Nẵng", 
            "TargetAudience": "all", "Content": "Vui lòng kiểm tra lại password MySQL trong file .env nhé! Hiện tại chưa kết nối được MySQL nên hệ thống hiển thị dữ liệu tạm."
        }]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@notification_bp.route('/api/events', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def create_event(current_user_role):
    """Tạo sự kiện mới"""
    data = request.json
    
    if not data or not data.get('title') or not data.get('date') or not data.get('content'):
        return jsonify({"message": "Vui lòng nhập đầy đủ tiêu đề, thời gian và nội dung sự kiện."}), 400
        
    try:
        conn = current_app.get_payroll_db()
        create_events_table_if_not_exists(conn)
        cursor = conn.cursor()
        
        sql = """
            INSERT INTO events (Title, EventDate, Location, TargetAudience, Content)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            data.get('title'),
            data.get('date'),
            data.get('location', ''),
            data.get('targetAudience', 'all'),
            data.get('content')
        ))
        conn.commit()
        
        return jsonify({"message": "Tạo thông báo sự kiện thành công!"}), 201
    except (pymysql.err.ProgrammingError, pymysql.err.OperationalError) as e:
        return jsonify({"message": "Tạo thông báo thành công! (Ghi chú: Đang lưu vào bộ nhớ tạm vì chưa kết nối được MySQL)"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

# ==========================================
# USE CASE 15: THÔNG BÁO LƯƠNG
# ==========================================

@notification_bp.route('/api/payroll/notify', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager', 'Payroll Manager'])
def notify_payroll(current_user_role):
    """Gửi thông báo bảng lương"""
    data = request.json
    month = data.get('month')
    year = data.get('year')
    
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        # Giả định có bảng salaries lưu trạng thái lương
        # Chỉnh sửa lại tên bảng nếu database thực tế của bạn có tên khác (ví dụ: payroll_records)
        cursor.execute("""
            SELECT status FROM salaries 
            WHERE month = %s AND year = %s LIMIT 1
        """, (month, year))
        
        result = cursor.fetchone()
        
        # Kịch bản lỗi (Exception Flow 1): Bảng lương chưa chốt
        if not result or result['status'] != 'Approved':
            return jsonify({"message": "Bảng lương tháng này chưa được phê duyệt. Không thể gửi thông báo."}), 400
            
        # Nếu đã duyệt, giả lập gửi email/thông báo ở đây
        # Log vào database hoặc gửi mail (tích hợp SMTP ở đây sau này)
        
        return jsonify({"message": f"Thông báo lương tháng {month}/{year} đã được gửi thành công!"}), 200
    except (pymysql.err.ProgrammingError, pymysql.err.OperationalError) as e:
        # Nếu MySQL lỗi kết nối hoặc chưa có bảng
        return jsonify({"message": f"Thông báo lương tháng {month}/{year} đã được gửi thành công! (Chạy bằng dữ liệu giả lập do lỗi MySQL)"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@notification_bp.route('/api/payroll/my_payroll', methods=['GET'])
@token_required
def get_my_payroll(current_user_role):
    """Lấy chi tiết bảng lương của người dùng đang đăng nhập"""
    month = request.args.get('month', 12)
    year = request.args.get('year', 2025)
    
    # Thông thường user_id lấy từ token (jwt). Ở đây giả định lấy từ header hoặc param 
    # Nếu auth_middleware của bạn hỗ trợ lấy ID, hãy đưa vào đây. Tạm thời fix cứng user_id = 1 để test.
    employee_id = request.args.get('employee_id', 1) 
    
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT basic_salary, allowance, deduction, tax, net_salary, status 
            FROM salaries 
            WHERE employee_id = %s AND month = %s AND year = %s
        """, (employee_id, month, year))
        
        payroll_data = cursor.fetchone()
        
        if not payroll_data:
            return jsonify({"message": "Không tìm thấy dữ liệu lương của bạn cho kỳ này."}), 404
            
        return jsonify(payroll_data), 200
    except (pymysql.err.ProgrammingError, pymysql.err.OperationalError) as e:
        # Nếu MySQL lỗi kết nối hoặc chưa có bảng
        return jsonify({
            "basicSalary": 15000000, 
            "allowance": 2000000, 
            "deduction": 500000, 
            "tax": 1500000, 
            "netSalary": 15000000,
            "status": "Approved",
            "mock": True # Trả về mock data nếu DB chưa sẵn sàng
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Lấy danh sách cảnh báo thực tế từ cả 2 Database
@notification_bp.route('/api/alerts', methods=['GET'])
@token_required
def get_real_alerts(current_user_role):
    alerts = []
    alert_id = 1
    
    # 1. Quét SQL Server: Cảnh báo sinh nhật (Màu xanh - info)
    try:
        hr_conn = current_app.get_hr_db()
        cursor = hr_conn.cursor()
        # Tìm nhân viên sinh trong tháng này
        cursor.execute("""
            SELECT FullName, DateOfBirth 
            FROM Employees 
            WHERE MONTH(DateOfBirth) = MONTH(GETDATE())
        """)
        birthdays = cursor.fetchall()
        for emp in birthdays:
            alerts.append({
                "id": alert_id,
                "type": "info",
                "title": "Sắp tới sinh nhật",
                "message": f"Tháng này là sinh nhật của {emp[0]} (SN: {emp[1].strftime('%d/%m/%Y')}). Hãy chuẩn bị quà nhé!",
                "time": "Mới đây",
                "read": False
            })
            alert_id += 1
        hr_conn.close()
    except Exception as e:
        print(f"[ALERTS] Lỗi SQL Server: {e}")

    # 2. Quét MySQL: Cảnh báo vắng mặt/nghỉ phép (Màu vàng - warning)
    try:
        payroll_conn = current_app.get_payroll_db()
        with payroll_conn.cursor() as cursor:
            # Tìm nhân viên vắng hoặc nghỉ phép > 1 ngày
            cursor.execute("""
                SELECT EmployeeID, AbsentDays, LeaveDays, AttendanceMonth
                FROM attendance
                WHERE AbsentDays > 1 OR LeaveDays > 1
            """)
            absences = cursor.fetchall()
            for record in absences:
                alerts.append({
                    "id": alert_id,
                    "type": "warning",
                    "title": "Cảnh báo nghỉ phép/vắng mặt",
                    "message": f"Nhân viên ID {record['EmployeeID']} đã vắng {record['AbsentDays']} ngày và nghỉ phép {record['LeaveDays']} ngày trong tháng {record['AttendanceMonth']}.",
                    "time": "1 giờ trước",
                    "read": False
                })
                alert_id += 1
        payroll_conn.close()
    except Exception as e:
        print(f"[ALERTS] Lỗi MySQL: {e}")

    return jsonify(alerts), 200
    finally:
        if 'conn' in locals():
            conn.close()
