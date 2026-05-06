from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles
from ..models import AuditLog
from .. import db

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
#@require_roles(['Admin', 'HR Manager']) # Tạm comment để test, sau sẽ bật lại
def add_employee():
    data = request.json # Nhận dữ liệu từ Form của React gửi lên
    
    # Kiểm tra dữ liệu bắt buộc (Từ nhánh main)
    required_fields = ['FullName', 'Email', 'DepartmentID']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"error": f"Thiếu các trường bắt buộc: {', '.join(required_fields)}"}), 400
    
    conn_sql_server = None
    
    try:
        # 1️⃣ BƯỚC 1: Lưu vào SQL Server (HR Database - HUMAN_2025)
        conn_sql_server = current_app.get_hr_db()
        cursor_sql = conn_sql_server.cursor()
        
        # ✅ KIỂM TRA EMAIL ĐÃ TỒN TẠI CHƯA (Từ nhánh main)
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
        
        # Lấy ID nhân viên vừa tạo
        cursor_sql.execute("SELECT @@IDENTITY as EmployeeID")
        employee_id = cursor_sql.fetchone()[0]
        print(f"✅ Lưu vào SQL Server thành công! Employee ID: {employee_id}")

        # ✅ THÊM LOG TỪ NHÁNH QHIEU
        try:
            log = AuditLog(username="Admin", action="THÊM MỚI", detail=f"Đã thêm nhân viên: {data.get('FullName')}")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        
        # 2️⃣ BƯỚC 2: Lưu vào MySQL (Payroll Database) - VẪN ĐANG COMMENT ĐỂ TEST
        # ... (Phần code MySQL giữ nguyên trạng thái comment từ nhánh main) ...
        
        return jsonify({
            "message": "✅ Thêm nhân viên thành công vào SQL Server!",
            "employee_id": int(employee_id),
            "full_name": data.get('FullName')
        }), 201
        
    except Exception as e:
        if conn_sql_server:
            conn_sql_server.rollback()
        print(f"❌ Lỗi khi thêm nhân viên: {str(e)}")
        return jsonify({"error": f"Lỗi: {str(e)}"}), 500
        
    finally:
        if conn_sql_server:
            conn_sql_server.close()


# UC.7: Cập nhật thông tin nhân viên
@employee_bp.route('/api/employees/<int:emp_id>', methods=['PUT'])
#@token_required
#@require_roles(['Admin', 'HR Manager'])
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

        # ✅ THÊM LOG TỪ NHÁNH QHIEU
        try:
            log = AuditLog(username="Admin", action="CẬP NHẬT", detail=f"Cập nhật thông tin nhân viên mã: {emp_id}")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)

        return jsonify({"message": "✅ Cập nhật nhân viên thành công!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# UC.8: Xóa nhân viên (chuyển trạng thái thành Đã nghỉ việc)
@employee_bp.route('/api/employees/<int:emp_id>', methods=['DELETE'])
#@token_required
#@require_roles(['Admin'])
def delete_employee(emp_id):
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        # ✅ Kiểm tra nhân viên tồn tại chưa (Từ nhánh main)
        cursor.execute("SELECT COUNT(*) FROM Employees WHERE EmployeeID = ?", (emp_id,))
        if cursor.fetchone()[0] == 0:
            return jsonify({"error": "❌ Nhân viên không tồn tại!"}), 404
        
        # Xóa (chuyển trạng thái thành Đã nghỉ việc)
        cursor.execute("UPDATE Employees SET Status = N'Đã nghỉ việc', UpdatedAt = GETDATE() WHERE EmployeeID = ?", (emp_id,))
        conn.commit() 

        # ✅ THÊM LOG TỪ NHÁNH QHIEU
        try:
            log = AuditLog(username="Admin", action="XÓA (NGHỈ VIỆC)", detail=f"Đã cho nhân viên mã {emp_id} nghỉ việc")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)

        return jsonify({"message": "✅ Xóa nhân viên thành công (chuyển trạng thái thành Đã nghỉ việc)!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()