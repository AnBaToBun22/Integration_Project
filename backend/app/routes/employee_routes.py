from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles

employee_bp = Blueprint('employee_bp', __name__)

# UC.5: Xem danh sách nhân viên
@employee_bp.route('/api/employees', methods=['GET'])
@token_required
def get_employees(current_user_role):
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        # Đã cập nhật đủ tất cả các cột theo ảnh sp_help bạn chụp
        query = """
            SELECT EmployeeID, FullName, DateOfBirth, Gender, PhoneNumber, 
                   Email, HireDate, DepartmentID, PositionID, Status, CreatedAt, UpdatedAt
            FROM Employees
        """
        cursor.execute(query)
        
        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            row_dict = dict(zip(columns, row))
            # Xử lý ngày tháng cho JSON
            if row_dict['DateOfBirth']: row_dict['DateOfBirth'] = row_dict['DateOfBirth'].strftime('%Y-%m-%d')
            if row_dict['HireDate']: row_dict['HireDate'] = row_dict['HireDate'].strftime('%Y-%m-%d')
            if row_dict['CreatedAt']: row_dict['CreatedAt'] = row_dict['CreatedAt'].strftime('%Y-%m-%d %H:%M:%S')
            if row_dict['UpdatedAt']: row_dict['UpdatedAt'] = row_dict['UpdatedAt'].strftime('%Y-%m-%d %H:%M:%S')
            results.append(row_dict)
            
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# UC.6: Thêm nhân viên mới
@employee_bp.route('/api/employees', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def add_employee(current_user_role):
    data = request.json
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        # Thêm các cột mặc định như Status và CreatedAt
        sql = """
            INSERT INTO Employees (FullName, DateOfBirth, Gender, PhoneNumber, Email, HireDate, DepartmentID, PositionID, Status, CreatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
        """
        cursor.execute(sql, (
            data['FullName'], data.get('DateOfBirth'), data.get('Gender'),
            data.get('PhoneNumber'), data['Email'], data.get('HireDate'), 
            data.get('DepartmentID'), data.get('PositionID'),
            data.get('Status', u'Đang làm việc')
        ))
        conn.commit()
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