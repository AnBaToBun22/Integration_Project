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
        query = "SELECT EmployeeID, FullName, Email, DepartmentID, Status FROM Employees"
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

# UC.6: Thêm nhân viên mới
@employee_bp.route('/api/employees', methods=['POST'])
def add_employee(): # <-- ĐÃ XÓA current_user_role
    data = request.json 
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        sql = """
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
            data.get('PhoneNumber'), 
            data.get('Email', ''),
            data.get('HireDate'), 
            data.get('DepartmentID'), 
            data.get('PositionID'),
            data.get('Status', 'Đang làm việc') 
        )
        
        cursor.execute(sql, params)
        conn.commit() 
        try:
            log = AuditLog(username="Admin", action="THÊM MỚI", detail=f"Đã thêm nhân viên: {data.get('FullName')}")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        return jsonify({"message": "Thêm nhân viên thành công!"}), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# UC.7: Cập nhật thông tin nhân viên
@employee_bp.route('/api/employees/<int:emp_id>', methods=['PUT'])
def update_employee(emp_id): # <-- ĐÃ XÓA current_user_role, CHỈ GIỮ emp_id
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
        try:
            log = AuditLog(username="Admin", action="CẬP NHẬT", detail=f"Cập nhật thông tin nhân viên mã: {emp_id}")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        return jsonify({"message": "Cập nhật thành công!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# Xóa (Chuyển trạng thái nghỉ việc)
@employee_bp.route('/api/employees/<int:emp_id>', methods=['DELETE'])
# @token_required <-- ĐÃ COMMENT
# @require_roles(['Admin']) <-- ĐÃ COMMENT
def delete_employee(emp_id): # <-- ĐÃ XÓA current_user_role, CHỈ GIỮ emp_id
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE Employees SET Status = N'Đã nghỉ việc', UpdatedAt = GETDATE() WHERE EmployeeID = ?", (emp_id,))
        conn.commit()
        try:
            log = AuditLog(username="Admin", action="XÓA (NGHỈ VIỆC)", detail=f"Đã cho nhân viên mã {emp_id} nghỉ việc")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        return jsonify({"message": "Đã chuyển trạng thái nhân viên thành nghỉ việc"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

