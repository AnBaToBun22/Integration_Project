from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles

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
# UC.6: Thêm nhân viên mới
@employee_bp.route('/api/employees', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager']) # Chỉ Admin và HR Manager mới thấy nút này
def add_employee(current_user_role):
    data = request.json # Nhận dữ liệu từ Form của React gửi lên
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        # Câu lệnh SQL INSERT vào bảng Employees (SQL Server)
        # Sử dụng GETDATE() cho ngày tạo và mặc định trạng thái là 'Đang làm việc'
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
            data.get('Status', 'Đang làm việc') # Mặc định trạng thái tiếng Việt có dấu
        )
        
        cursor.execute(sql, params)
        conn.commit() # Quan trọng: Phải commit để lưu vào SQL Server
        
        return jsonify({"message": "Thêm nhân viên thành công!"}), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
# UC.7: Cập nhật thông tin nhân viên
@employee_bp.route('/api/employees/<int:emp_id>', methods=['PUT'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def update_employee(current_user_role, emp_id):
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
        return jsonify({"message": "Cập nhật thành công!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# Xóa (Chuyển trạng thái nghỉ việc)
@employee_bp.route('/api/employees/<int:emp_id>', methods=['DELETE'])
@token_required
@require_roles(['Admin'])
def delete_employee(current_user_role, emp_id):
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        # Đã sửa lỗi conn.app.commit() thành conn.commit()
        cursor.execute("UPDATE Employees SET Status = N'Đã nghỉ việc', UpdatedAt = GETDATE() WHERE EmployeeID = ?", (emp_id,))
        conn.commit() 
        return jsonify({"message": "Đã chuyển trạng thái nhân viên thành nghỉ việc"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

