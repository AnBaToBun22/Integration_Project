from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles
from ..models import AuditLog
from .. import db
from ..utils.db_manager import DBManager

employee_bp = Blueprint('employee_bp', __name__)

# UC.5: Xem danh sách nhân viên (JOIN tên phòng ban + chức vụ)
@employee_bp.route('/api/employees', methods=['GET'])
@token_required
def get_employees(current_user_role, **kwargs): 
    try:
        with DBManager.hr_connection() as conn:
            cursor = conn.cursor()
            
            # JOIN Departments & Positions để trả về tên thay vì chỉ mã ID
            query = """
                SELECT e.EmployeeID, e.FullName, e.Email, e.PhoneNumber, 
                       e.DateOfBirth, e.Gender, e.HireDate, 
                       e.DepartmentID, d.DepartmentName,
                       e.PositionID, p.PositionName,
                       e.Status
                FROM Employees e
                LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
                LEFT JOIN Positions p ON e.PositionID = p.PositionID
            """
            cursor.execute(query)
            
            columns = [column[0] for column in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            # Serialize date objects
            for row in results:
                for key in ['DateOfBirth', 'HireDate']:
                    if row.get(key) and hasattr(row[key], 'isoformat'):
                        row[key] = row[key].isoformat()
                
            return jsonify(results), 200
    except Exception as e:
        print("[ERROR] HR GET employees:", e)
        return jsonify({"error": str(e)}), 500

# UC.6: Thêm nhân viên mới vào cả SQL Server Và MySQL
@employee_bp.route('/api/employees', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def add_employee(current_user_role, **kwargs):
    current_username = kwargs.get('current_username', 'Unknown')
    data = request.json
    
    required_fields = ['FullName', 'Email', 'DepartmentID', 'PositionID']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"error": f"Thiếu các trường bắt buộc: {', '.join(required_fields)}"}), 400
    
    try:
        with DBManager.dual_transaction() as (conn_hr, conn_payroll):
            cursor_hr = conn_hr.cursor()
            
            # 1. HR DB logic
            cursor_hr.execute("SELECT COUNT(*) FROM Employees WHERE Email = ?", (data.get('Email', ''),))
            if cursor_hr.fetchone()[0] > 0:
                return jsonify({"error": f"Email '{data.get('Email')}' đã tồn tại trong hệ thống!"}), 400
            
            sql_insert = """
                INSERT INTO Employees (
                    FullName, DateOfBirth, Gender, PhoneNumber, 
                    Email, HireDate, DepartmentID, PositionID, 
                    Status, CreatedAt
                ) 
                OUTPUT INSERTED.EmployeeID
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
            
            cursor_hr.execute(sql_insert, params)
            
            # Lấy ID nhân viên vừa tạo
            row = cursor_hr.fetchone()
            if not row or row[0] is None:
                raise Exception("Không thể lấy ID nhân viên vừa tạo từ database.")
            employee_id = int(row[0])

            # 2. Payroll DB logic
            cursor_payroll = conn_payroll.cursor()
            sql_sync = """
                INSERT INTO employees_payroll (EmployeeID, FullName, DepartmentID, PositionID, Status, SyncedAt)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """
            cursor_payroll.execute(sql_sync, (
                employee_id,
                data.get('FullName', ''),
                data.get('DepartmentID'),
                data.get('PositionID'),
                data.get('Status', 'Đang làm việc')
            ))
            
            # AuditLog
            try:
                log = AuditLog(
                    username=current_username,
                    action="THÊM MỚI",
                    detail=f"Đã thêm nhân viên: {data.get('FullName')} (ID: {employee_id}) + Đồng bộ Payroll"
                )
                db.session.add(log)
                db.session.commit()
            except Exception as log_err:
                print("Lỗi lưu log:", log_err)
            
            return jsonify({
                "message": "Thêm nhân viên thành công và đã đồng bộ sang Payroll!",
                "employee_id": employee_id,
                "full_name": data.get('FullName'),
                "synced": True
            }), 201
            
    except Exception as e:
        print(f"[ERROR] Loi khi them nhan vien: {str(e)}")
        return jsonify({"error": f"Lỗi: {str(e)}"}), 500

# UC.7: Cập nhật thông tin nhân viên + Đồng bộ Payroll
@employee_bp.route('/api/employees/<int:emp_id>', methods=['PUT'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def update_employee(current_user_role, emp_id, **kwargs):
    current_username = kwargs.get('current_username', 'Unknown')
    data = request.json
    
    try:
        with DBManager.dual_transaction() as (conn_hr, conn_payroll):
            cursor_hr = conn_hr.cursor()
            
            # 1. Cập nhật HR DB
            sql = """
                UPDATE Employees 
                SET FullName = ?, Email = ?, PhoneNumber = ?, 
                    DepartmentID = ?, PositionID = ?, Status = ?, UpdatedAt = GETDATE()
                WHERE EmployeeID = ?
            """
            cursor_hr.execute(sql, (
                data['FullName'], data['Email'], data.get('PhoneNumber'),
                data.get('DepartmentID'), data.get('PositionID'), 
                data.get('Status'), emp_id
            ))
            
            # 2. Đồng bộ sang Payroll DB (Upsert style)
            cursor_payroll = conn_payroll.cursor()
            cursor_payroll.execute("SELECT COUNT(*) as cnt FROM employees_payroll WHERE EmployeeID = %s", (emp_id,))
            exists = cursor_payroll.fetchone()['cnt'] > 0
            
            if exists:
                sql_sync = """
                    UPDATE employees_payroll 
                    SET FullName = %s, DepartmentID = %s, PositionID = %s, Status = %s, SyncedAt = NOW()
                    WHERE EmployeeID = %s
                """
                cursor_payroll.execute(sql_sync, (
                    data['FullName'], data.get('DepartmentID'),
                    data.get('PositionID'), data.get('Status'), emp_id
                ))
            else:
                sql_sync = """
                    INSERT INTO employees_payroll (EmployeeID, FullName, DepartmentID, PositionID, Status, SyncedAt)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """
                cursor_payroll.execute(sql_sync, (
                    emp_id, data['FullName'], data.get('DepartmentID'),
                    data.get('PositionID'), data.get('Status')
                ))
            
            # AuditLog
            try:
                log = AuditLog(
                    username=current_username,
                    action="CẬP NHẬT",
                    detail=f"Cập nhật nhân viên mã: {emp_id} ({data['FullName']}) + Đồng bộ Payroll"
                )
                db.session.add(log)
                db.session.commit()
            except Exception as log_err:
                print("Lỗi lưu log:", log_err)

            return jsonify({"message": "Cập nhật nhân viên thành công và đã đồng bộ!"}), 200
    except Exception as e:
        print(f"[ERROR] Loi khi cap nhat nhan vien: {str(e)}")
        return jsonify({"error": str(e)}), 500

# UC.8: Xóa nhân viên khỏi database (Xóa cả HR và Payroll)
@employee_bp.route('/api/employees/<int:emp_id>', methods=['DELETE'])
@token_required
@require_roles(['Admin'])
def delete_employee(current_user_role, emp_id, **kwargs):
    current_username = kwargs.get('current_username', 'Unknown')
    
    try:
        with DBManager.dual_transaction() as (conn_hr, conn_payroll):
            cursor_hr = conn_hr.cursor()
            
            # 1. Kiểm tra nhân viên tồn tại
            cursor_hr.execute("SELECT FullName FROM Employees WHERE EmployeeID = ?", (emp_id,))
            emp_row = cursor_hr.fetchone()
            if not emp_row:
                return jsonify({"error": "Nhân viên không tồn tại!"}), 404
            
            emp_name = emp_row[0]
            
            # 2. KIỂM TRA: Có dữ liệu Salary trong Payroll không? (Không thể xóa nếu đã có lương)
            cursor_payroll = conn_payroll.cursor()
            cursor_payroll.execute("SELECT COUNT(*) as cnt FROM salaries WHERE EmployeeID = %s", (emp_id,))
            salary_count = cursor_payroll.fetchone()['cnt']
            
            if salary_count > 0:
                return jsonify({
                    "error": f"Không thể xóa hoàn toàn nhân viên '{emp_name}'! "
                             f"Nhân viên này đã có {salary_count} bản ghi lương. "
                             f"Để bảo toàn dữ liệu báo cáo, bạn không thể xóa nhân viên này."
                }), 400
            
            # 3. Thực hiện xóa ở HR database
            cursor_hr.execute("DELETE FROM Employees WHERE EmployeeID = ?", (emp_id,))
            
            # 4. Thực hiện xóa ở Payroll database
            cursor_payroll.execute("DELETE FROM employees_payroll WHERE EmployeeID = %s", (emp_id,))

            # 5. Ghi AuditLog
            try:
                log = AuditLog(
                    username=current_username,
                    action="XÓA VĨNH VIỄN",
                    detail=f"Đã xóa vĩnh viễn nhân viên '{emp_name}' (mã {emp_id}) khỏi hệ thống"
                )
                db.session.add(log)
                db.session.commit()
            except Exception as log_err:
                print("Lỗi lưu log:", log_err)

            return jsonify({"message": f"Đã xóa vĩnh viễn nhân viên '{emp_name}' khỏi hệ thống!"}), 200
    except Exception as e:
        print(f"[ERROR] Loi khi xoa nhan vien: {str(e)}")
        return jsonify({"error": str(e)}), 500