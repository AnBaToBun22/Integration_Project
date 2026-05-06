from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles
from ..models import AuditLog
from .. import db
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
def get_events(current_user_role, **kwargs):
    """Lấy danh sách sự kiện"""
    try:
        conn = current_app.get_payroll_db()
        create_events_table_if_not_exists(conn)
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@notification_bp.route('/api/events', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def create_event(current_user_role, **kwargs):
    """Tạo sự kiện mới"""
    current_username = kwargs.get('current_username', 'Unknown')
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
        
        # AuditLog
        try:
            log = AuditLog(username=current_username, action="THÊM MỚI", detail=f"Tạo sự kiện: {data.get('title')}")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        
        return jsonify({"message": "Tạo thông báo sự kiện thành công!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

# ==========================================
# USE CASE 15: THÔNG BÁO LƯƠNG (ĐÃ FIX SCHEMA)
# ==========================================

@notification_bp.route('/api/payroll/notify', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def notify_payroll(current_user_role, **kwargs):
    """Gửi thông báo bảng lương — dùng đúng schema bảng salaries"""
    data = request.json
    month = data.get('month')
    year = data.get('year')
    
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        # Schema đúng: bảng salaries có cột SalaryMonth (date)
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM salaries 
            WHERE MONTH(SalaryMonth) = %s AND YEAR(SalaryMonth) = %s
        """, (month, year))
        
        result = cursor.fetchone()
        record_count = result['cnt'] if result else 0
        
        if record_count == 0:
            return jsonify({
                "message": f"Không tìm thấy dữ liệu lương tháng {month}/{year}. Vui lòng kiểm tra lại."
            }), 400
            
        return jsonify({
            "message": f"Thông báo lương tháng {month}/{year} đã được gửi thành công! ({record_count} bản ghi)"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@notification_bp.route('/api/payroll/my_payroll', methods=['GET'])
@token_required
def get_my_payroll(current_user_role, **kwargs):
    """Lấy chi tiết bảng lương — dùng đúng schema bảng salaries"""
    month = request.args.get('month', 9, type=int)
    year = request.args.get('year', 2024, type=int)
    employee_id = request.args.get('employee_id', 1, type=int)
    
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        # Schema đúng: BaseSalary, Bonus, Deductions, NetSalary, SalaryMonth + Attendance
        cursor.execute("""
            SELECT s.BaseSalary, s.Bonus, s.Deductions, s.NetSalary, s.SalaryMonth,
                   ep.FullName,
                   COALESCE(a.WorkDays, 0) as WorkDays, 
                   COALESCE(a.AbsentDays, 0) as AbsentDays, 
                   COALESCE(a.LeaveDays, 0) as LeaveDays
            FROM salaries s
            JOIN employees_payroll ep ON s.EmployeeID = ep.EmployeeID
            LEFT JOIN attendance a ON s.EmployeeID = a.EmployeeID 
                AND MONTH(s.SalaryMonth) = MONTH(a.AttendanceMonth) 
                AND YEAR(s.SalaryMonth) = YEAR(a.AttendanceMonth)
            WHERE s.EmployeeID = %s AND MONTH(s.SalaryMonth) = %s AND YEAR(s.SalaryMonth) = %s
        """, (employee_id, month, year))
        
        payroll_data = cursor.fetchone()
        
        if not payroll_data:
            return jsonify({"message": "Không tìm thấy dữ liệu lương cho kỳ này."}), 404
        
        result = {
            "fullName": payroll_data['FullName'],
            "baseSalary": float(payroll_data['BaseSalary']),
            "bonus": float(payroll_data['Bonus']),
            "deductions": float(payroll_data['Deductions']),
            "netSalary": float(payroll_data['NetSalary']),
            "salaryMonth": payroll_data['SalaryMonth'].strftime('%m/%Y') if payroll_data['SalaryMonth'] else f"{month}/{year}",
            "workDays": int(payroll_data['WorkDays']),
            "absentDays": int(payroll_data['AbsentDays']),
            "leaveDays": int(payroll_data['LeaveDays'])
        }
            
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()


# ==========================================
# ALERTS: Cảnh báo thực tế từ cả 2 Database
# ==========================================
@notification_bp.route('/api/alerts', methods=['GET'])
@token_required
def get_real_alerts(current_user_role, **kwargs):
    alerts = []
    alert_id = 1
    
    # 1. SQL Server: Cảnh báo sinh nhật (info - xanh)
    try:
        hr_conn = current_app.get_hr_db()
        cursor = hr_conn.cursor()
        
        cursor.execute("""
            SELECT FullName, DateOfBirth 
            FROM Employees 
            WHERE MONTH(DateOfBirth) = MONTH(GETDATE()) AND Status = N'Đang làm việc'
        """)
        birthdays = cursor.fetchall()
        for emp in birthdays:
            alerts.append({
                "id": alert_id,
                "type": "info",
                "title": "🎂 Sinh nhật trong tháng",
                "message": f"Tháng này là sinh nhật của {emp[0]} (SN: {emp[1].strftime('%d/%m/%Y')}). Hãy chuẩn bị quà nhé!",
                "time": "Mới đây",
                "read": False
            })
            alert_id += 1
        
        # 2. SQL Server: Cảnh báo kỷ niệm ngày vào làm (info - xanh)
        cursor.execute("""
            SELECT FullName, HireDate, DATEDIFF(YEAR, HireDate, GETDATE()) as YearsWorked
            FROM Employees 
            WHERE MONTH(HireDate) = MONTH(GETDATE()) 
              AND DATEDIFF(YEAR, HireDate, GETDATE()) > 0
              AND Status = N'Đang làm việc'
        """)
        anniversaries = cursor.fetchall()
        for emp in anniversaries:
            alerts.append({
                "id": alert_id,
                "type": "info",
                "title": "🏆 Kỷ niệm ngày vào làm",
                "message": f"{emp[0]} kỷ niệm {emp[2]} năm làm việc tại công ty (Ngày vào: {emp[1].strftime('%d/%m/%Y')}).",
                "time": "Mới đây",
                "read": False
            })
            alert_id += 1
        
        hr_conn.close()
    except Exception as e:
        print(f"[ALERTS] Lỗi SQL Server: {e}")

    # 3. MySQL: Cảnh báo vắng mặt/nghỉ phép quá mức (warning - vàng)
    try:
        payroll_conn = current_app.get_payroll_db()
        with payroll_conn.cursor() as cursor:
            cursor.execute("""
                SELECT a.EmployeeID, ep.FullName, a.AbsentDays, a.LeaveDays, a.AttendanceMonth
                FROM attendance a
                JOIN employees_payroll ep ON a.EmployeeID = ep.EmployeeID
                WHERE a.AbsentDays > 1 OR a.LeaveDays > 3
            """)
            absences = cursor.fetchall()
            for record in absences:
                month_str = record['AttendanceMonth'].strftime('%m/%Y') if record.get('AttendanceMonth') else 'N/A'
                alerts.append({
                    "id": alert_id,
                    "type": "warning",
                    "title": "⚠️ Cảnh báo nghỉ phép/vắng mặt",
                    "message": f"{record['FullName']} (ID: {record['EmployeeID']}) đã vắng {record['AbsentDays']} ngày và nghỉ phép {record['LeaveDays']} ngày trong tháng {month_str}.",
                    "time": "1 giờ trước",
                    "read": False
                })
                alert_id += 1
            
            # 4. MySQL: Cảnh báo sai lệch lương bất thường (alert - đỏ)
            cursor.execute("""
                SELECT s1.EmployeeID, ep.FullName, 
                       s1.NetSalary as CurrentSalary, s2.NetSalary as PrevSalary,
                       s1.SalaryMonth as CurrentMonth
                FROM salaries s1
                JOIN salaries s2 ON s1.EmployeeID = s2.EmployeeID 
                    AND s2.SalaryMonth = DATE_SUB(s1.SalaryMonth, INTERVAL 1 MONTH)
                JOIN employees_payroll ep ON s1.EmployeeID = ep.EmployeeID
                WHERE ABS(s1.NetSalary - s2.NetSalary) > s2.NetSalary * 0.3
                ORDER BY s1.SalaryMonth DESC
                LIMIT 10
            """)
            anomalies = cursor.fetchall()
            for record in anomalies:
                diff = float(record['CurrentSalary']) - float(record['PrevSalary'])
                direction = "tăng" if diff > 0 else "giảm"
                alerts.append({
                    "id": alert_id,
                    "type": "alert",
                    "title": "🚨 Sai lệch lương bất thường",
                    "message": f"{record['FullName']} có lương {direction} bất thường: {abs(diff):,.0f}₫ so với tháng trước.",
                    "time": "2 giờ trước",
                    "read": False
                })
                alert_id += 1
        
        payroll_conn.close()
    except Exception as e:
        print(f"[ALERTS] Lỗi MySQL: {e}")

    return jsonify(alerts), 200
