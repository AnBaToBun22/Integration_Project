from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles
from app import db
from ..models import AuditLog
import json

employee_bp = Blueprint('employee_bp', __name__)

# UC.5: Xem danh sách nhân viên
@employee_bp.route('/api/employees', methods=['GET'])
#@token_required
def get_employees(): 
    try:
        # 1. SỬA LẠI THÀNH get_hr_db() ĐỂ KẾT NỐI SQL SERVER
        conn = current_app.get_hr_db() 
        cursor = conn.cursor()
        
        # 2. LẤY TỪ BẢNG 'Employees' CHUẨN CỦA ÔNG (Có đầy đủ Email)
        query = "SELECT EmployeeID, FullName, Email, PhoneNumber, DateOfBirth, Gender, HireDate, DepartmentID, PositionID, Status FROM Employees"
        cursor.execute(query)
        
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
        return jsonify(results), 200
    except Exception as e:
        print("LỖI TẠI HR:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): 
            conn.close()

# UC.6: Thêm nhân viên mới vào cả SQL Server và MySQL
@employee_bp.route('/api/employees', methods=['POST'])
#@token_required
@require_roles(['Admin', 'HR Manager'])
def add_employee():
    data = request.json # Nhận dữ liệu từ Form của React gửi lên
    
    # Kiểm tra dữ liệu bắt buộc
    required_fields = ['FullName', 'Email', 'DepartmentID']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"error": f"Thiếu các trường bắt buộc: {', '.join(required_fields)}"}), 400
    
    conn_sql_server = None
    conn_mysql = None
    
    try:
        # 1️⃣ BƯỚC 1: Lưu vào SQL Server (HR Database - HUMANnew)
        conn_sql_server = current_app.get_hr_db()
        cursor_sql = conn_sql_server.cursor()
        
        # ✅ KIỂM TRA EMAIL ĐÃ TỒN TẠI CHƯA
        check_email = "SELECT COUNT(*) FROM Employees WHERE Email = ?"
        cursor_sql.execute(check_email, (data.get('Email', ''),))
        email_exists = cursor_sql.fetchone()[0]
        
        if email_exists > 0:
            return jsonify({"error": f"❌ Email '{data.get('Email')}' đã tồn tại trong hệ thống!"}), 400
        
        sql_insert = """
            INSERT INTO Employees (
                FullName, DateOfBirth, Gender, PhoneNumber, 
                Email, HireDate, DepartmentID, PositionID, 
                Status, CreatedAt
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
        """
        
        params = (
            data.get('FullName', ''),
            data.get('DateOfBirth'), 
            data.get('Gender'),
            data.get('PhoneNumber', ''),
            data.get('Email', ''),
            data.get('HireDate'), 
            data.get('DepartmentID'), 
            data.get('PositionID'),
            data.get('Status', 'Đang làm việc')
        )
        
        cursor_sql.execute(sql_insert, params)
        conn_sql_server.commit()
        
        # Lấy ID nhân viên vừa tạo (SQL Server)
        cursor_sql.execute("SELECT @@IDENTITY as EmployeeID")
        employee_id = cursor_sql.fetchone()[0]
        print(f"✅ Lưu vào SQL Server thành công! Employee ID: {employee_id}")

        # Ghi AuditLog vào Auth DB (SQLite) bằng SQLAlchemy
        try:
            log = AuditLog(
                action='create',
                entity='Employee',
                entity_id=str(employee_id),
                user_role=getattr(request, 'user_role', None),
                details=json.dumps({
                    'new': data
                }, default=str)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as _log_exc:
            # Không để việc ghi log làm hỏng luồng chính
            print(f"[AuditLog] Lỗi khi lưu log: {_log_exc}")
        
        # 2️⃣ BƯỚC 2: Lưu vào MySQL (Payroll Database - payroll_2026) - TẠM COMMENT
        # conn_mysql = current_app.get_payroll_db()
        # cursor_mysql = conn_mysql.cursor()
        
        # # Kiểm tra xem employee đã tồn tại trong MySQL chưa
        # check_query = "SELECT EmployeeID FROM employees WHERE EmployeeID = %s"
        # cursor_mysql.execute(check_query, (employee_id,))
        # existing_employee = cursor_mysql.fetchone()
        
        # if not existing_employee:
        #     # INSERT vào bảng employees của MySQL
        #     mysql_insert = """
        #         INSERT INTO employees (
        #             EmployeeID, Name, Email, Department, Position, 
        #             Phone, HireDate, Status, CreatedAt
        #         ) 
        #         VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        #     """
            
        #     mysql_params = (
        #         int(employee_id),
        #         data.get('FullName', ''),
        #         data.get('Email', ''),
        #         data.get('DepartmentID', ''),
        #         data.get('PositionID', ''),
        #         data.get('PhoneNumber', ''),
        #         data.get('HireDate'),
        #         data.get('Status', 'Đang làm việc')
        #     )
            
        #     cursor_mysql.execute(mysql_insert, mysql_params)
        #     conn_mysql.commit()
        #     print(f"✅ Lưu vào MySQL thành công! Employee ID: {employee_id}")
        
        return jsonify({
            "message": "✅ Thêm nhân viên thành công vào SQL Server!",
            "employee_id": int(employee_id),
            "full_name": data.get('FullName')
        }), 201
        
    except Exception as e:
        # Rollback nếu có lỗi
        if conn_sql_server:
            conn_sql_server.rollback()
        # if conn_mysql:
        #     conn_mysql.rollback()
        
        print(f"❌ Lỗi khi thêm nhân viên: {str(e)}")
        return jsonify({"error": f"Lỗi: {str(e)}"}), 500
        
    finally:
        # Đóng kết nối
        if conn_sql_server:
            conn_sql_server.close()
        # if conn_mysql:
        #     conn_mysql.close()
# UC.7: Cập nhật thông tin nhân viên
@employee_bp.route('/api/employees/<int:emp_id>', methods=['PUT'])
#@token_required
@require_roles(['Admin', 'HR Manager'])
def update_employee(emp_id):
    data = request.json
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        sql = """
            UPDATE Employees 
            SET FullName = ?, Email = ?, PhoneNumber = ?, 
                DepartmentID = ?, PositionID = ?, Status = ?, UpdatedAt = GETDATE()
            WHERE EmployeeID = ?
        """
        cursor.execute(sql, (
            data['FullName'], data['Email'], data.get('PhoneNumber'),
            data.get('DepartmentID'), data.get('PositionID'), 
            data.get('Status'), emp_id
        ))
        
        conn.commit()

        # Audit: cập nhật
        try:
            log = AuditLog(
                action='update',
                entity='Employee',
                entity_id=str(emp_id),
                user_role=getattr(request, 'user_role', None),
                details=json.dumps({'updated': data}, default=str)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as _log_exc:
            print(f"[AuditLog] Lỗi khi lưu log cập nhật: {_log_exc}")

        return jsonify({"message": "✅ Cập nhật nhân viên thành công!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# UC.8: Xóa nhân viên (chuyển trạng thái thành Đã nghỉ việc)
@employee_bp.route('/api/employees/<int:emp_id>', methods=['DELETE'])
#@token_required
@require_roles(['Admin'])
def delete_employee(emp_id):
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        # Kiểm tra nhân viên tồn tại chưa
        cursor.execute("SELECT COUNT(*) FROM Employees WHERE EmployeeID = ?", (emp_id,))
        if cursor.fetchone()[0] == 0:
            return jsonify({"error": "❌ Nhân viên không tồn tại!"}), 404
        
        # Xóa (chuyển trạng thái thành Đã nghỉ việc)
        cursor.execute("UPDATE Employees SET Status = ?, UpdatedAt = GETDATE() WHERE EmployeeID = ?", ('Đã nghỉ việc', emp_id))
        conn.commit()

        # Audit: xóa (thực ra là chuyển trạng thái)
        try:
            log = AuditLog(
                action='delete',
                entity='Employee',
                entity_id=str(emp_id),
                user_role=getattr(request, 'user_role', None),
                details=json.dumps({'note': 'soft-delete - set Status to Đã nghỉ việc'}, default=str)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as _log_exc:
            print(f"[AuditLog] Lỗi khi lưu log xóa: {_log_exc}")

        return jsonify({"message": "✅ Xóa nhân viên thành công (chuyển trạng thái thành Đã nghỉ việc)!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
    
@employee_bp.route('/api/audit-logs', methods=['GET'])
@token_required
@require_roles(['Admin'])
def get_audit_logs():
    try:
        logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(200).all()
        return jsonify([l.to_dict() for l in logs]), 200
    except Exception as e:
        print(f"[AuditLog] Lỗi khi lấy logs: {e}")
        return jsonify({'error': str(e)}), 500

