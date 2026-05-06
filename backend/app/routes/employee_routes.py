from flask import Blueprint, jsonify, request, current_app, g
from ..auth_middleware import token_required, require_roles
from .audit_routes import log_action

employee_bp = Blueprint('employee_bp', __name__)


# ============================================================
# UC.5: Xem danh sách nhân viên (từ HR Database - SQL Server)
# ============================================================
@employee_bp.route('/api/employees', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager', 'Employee'])
def get_employees():
    """Lấy danh sách tất cả nhân viên từ HR DB (SQL Server HUMAN_2025)"""
    conn = None
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()

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

        return jsonify(results), 200
    except Exception as e:
        print(f"[ERROR] Lấy danh sách nhân viên thất bại: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


# ============================================================
# UC.6: Thêm nhân viên mới (đồng bộ cả SQL Server và MySQL)
# ============================================================
@employee_bp.route('/api/employees', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def add_employee():
    """
    Thêm nhân viên mới vào HR DB (SQL Server) và đồng bộ sang Payroll DB (MySQL).
    Sử dụng 2-phase transaction: chỉ commit khi CẢ HAI thành công, rollback nếu 1 bên fail.
    """
    data = request.json

    # Kiểm tra dữ liệu bắt buộc
    required_fields = ['FullName', 'Email', 'DepartmentID']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"error": f"Thiếu các trường bắt buộc: {', '.join(required_fields)}"}), 400

    conn_hr = None
    conn_payroll = None

    try:
        # =============================================
        # BƯỚC 1: Thao tác trên SQL Server (HR Database)
        # =============================================
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()

        # Kiểm tra email đã tồn tại chưa
        cursor_hr.execute("SELECT COUNT(*) FROM Employees WHERE Email = ?", (data.get('Email', ''),))
        if cursor_hr.fetchone()[0] > 0:
            return jsonify({"error": f"Email '{data.get('Email')}' đã tồn tại trong hệ thống!"}), 400

        # Kiểm tra DepartmentID hợp lệ
        dept_id = data.get('DepartmentID')
        if dept_id:
            cursor_hr.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentID = ?", (dept_id,))
            if cursor_hr.fetchone()[0] == 0:
                return jsonify({"error": f"Phòng ban ID={dept_id} không tồn tại!"}), 400

        # Kiểm tra PositionID hợp lệ
        pos_id = data.get('PositionID')
        if pos_id:
            cursor_hr.execute("SELECT COUNT(*) FROM Positions WHERE PositionID = ?", (pos_id,))
            if cursor_hr.fetchone()[0] == 0:
                return jsonify({"error": f"Chức vụ ID={pos_id} không tồn tại!"}), 400

        # INSERT vào bảng Employees (SQL Server)
        sql_insert = """
            INSERT INTO Employees (
                FullName, DateOfBirth, Gender, PhoneNumber, 
                Email, HireDate, DepartmentID, PositionID, 
                Status, CreatedAt, UpdatedAt
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
        """

        params = (
            data.get('FullName', ''),
            data.get('DateOfBirth'),
            data.get('Gender'),
            data.get('PhoneNumber', ''),
            data.get('Email', ''),
            data.get('HireDate'),
            dept_id,
            pos_id,
            data.get('Status', 'Đang làm việc')
        )

        cursor_hr.execute(sql_insert, params)

        # Lấy ID nhân viên vừa tạo (SQL Server)
        cursor_hr.execute("SELECT @@IDENTITY as EmployeeID")
        employee_id = int(cursor_hr.fetchone()[0])
        print(f"[HR] INSERT thành công Employee ID: {employee_id}")

        # =============================================
        # BƯỚC 2: Đồng bộ sang MySQL (Payroll Database)
        # =============================================
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()

        # Kiểm tra employee đã tồn tại trong MySQL chưa
        cursor_payroll.execute(
            "SELECT EmployeeID FROM employees_payroll WHERE EmployeeID = %s",
            (employee_id,)
        )

        if not cursor_payroll.fetchone():
            mysql_insert = """
                INSERT INTO employees_payroll (
                    EmployeeID, FullName, DepartmentID, PositionID, Status, SyncedAt
                ) 
                VALUES (%s, %s, %s, %s, %s, NOW())
            """
            cursor_payroll.execute(mysql_insert, (
                employee_id,
                data.get('FullName', ''),
                dept_id,
                pos_id,
                data.get('Status', 'Đang làm việc')
            ))
            print(f"[Payroll] INSERT thành công Employee ID: {employee_id}")

        # =============================================
        # BƯỚC 3: COMMIT cả 2 database cùng lúc (2-phase commit)
        # =============================================
        conn_hr.commit()
        conn_payroll.commit()
        print(f"✅ Đồng bộ thành công Employee ID: {employee_id} trên cả 2 hệ thống")

        # Audit Log
        log_action(
            user_id=g.user['id'],
            username=g.user['username'],
            user_role=g.user['role'],
            action='CREATE',
            resource='Employees',
            resource_id=employee_id,
            details={"email": data.get('Email')}
        )

        return jsonify({
            "message": "Thêm nhân viên thành công và đã đồng bộ sang Payroll!",
            "employee_id": employee_id,
            "full_name": data.get('FullName'),
            "synced_to_payroll": True
        }), 201

    except Exception as e:
        # ROLLBACK cả 2 nếu có lỗi
        if conn_hr:
            try:
                conn_hr.rollback()
            except:
                pass
        if conn_payroll:
            try:
                conn_payroll.rollback()
            except:
                pass

        print(f"❌ Lỗi khi thêm nhân viên: {str(e)}")
        return jsonify({"error": f"Lỗi: {str(e)}"}), 500

    finally:
        if conn_hr:
            conn_hr.close()
        if conn_payroll:
            conn_payroll.close()


# ============================================================
# UC.7: Cập nhật thông tin nhân viên (đồng bộ cả 2 hệ thống)
# ============================================================
@employee_bp.route('/api/employees/<int:emp_id>', methods=['PUT'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def update_employee(emp_id):
    """
    Cập nhật nhân viên trong HR DB và đồng bộ sang Payroll DB.
    """
    data = request.json
    conn_hr = None
    conn_payroll = None

    try:
        # =============================================
        # BƯỚC 1: Cập nhật SQL Server (HR Database)
        # =============================================
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()

        # Kiểm tra nhân viên tồn tại
        cursor_hr.execute("SELECT COUNT(*) FROM Employees WHERE EmployeeID = ?", (emp_id,))
        if cursor_hr.fetchone()[0] == 0:
            return jsonify({"error": "Nhân viên không tồn tại!"}), 404

        sql = """
            UPDATE Employees 
            SET FullName = ?, Email = ?, PhoneNumber = ?, 
                Gender = ?, DateOfBirth = ?,
                DepartmentID = ?, PositionID = ?, Status = ?, 
                UpdatedAt = GETDATE()
            WHERE EmployeeID = ?
        """
        cursor_hr.execute(sql, (
            data.get('FullName'), data.get('Email'), data.get('PhoneNumber'),
            data.get('Gender'), data.get('DateOfBirth'),
            data.get('DepartmentID'), data.get('PositionID'),
            data.get('Status'), emp_id
        ))

        # =============================================
        # BƯỚC 2: Đồng bộ sang MySQL (Payroll Database)
        # =============================================
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()

        # Kiểm tra employee có trong MySQL không
        cursor_payroll.execute(
            "SELECT EmployeeID FROM employees_payroll WHERE EmployeeID = %s",
            (emp_id,)
        )
        existing = cursor_payroll.fetchone()

        if existing:
            # UPDATE nếu đã tồn tại
            mysql_update = """
                UPDATE employees_payroll 
                SET FullName = %s, DepartmentID = %s, PositionID = %s, 
                    Status = %s, SyncedAt = NOW()
                WHERE EmployeeID = %s
            """
            cursor_payroll.execute(mysql_update, (
                data.get('FullName'),
                data.get('DepartmentID'),
                data.get('PositionID'),
                data.get('Status'),
                emp_id
            ))
        else:
            # INSERT nếu chưa tồn tại (trường hợp dữ liệu lệch)
            mysql_insert = """
                INSERT INTO employees_payroll (
                    EmployeeID, FullName, DepartmentID, PositionID, Status, SyncedAt
                ) VALUES (%s, %s, %s, %s, %s, NOW())
            """
            cursor_payroll.execute(mysql_insert, (
                emp_id,
                data.get('FullName'),
                data.get('DepartmentID'),
                data.get('PositionID'),
                data.get('Status')
            ))

        # COMMIT cả 2
        conn_hr.commit()
        conn_payroll.commit()

        # Audit Log
        log_action(
            user_id=g.user['id'],
            username=g.user['username'],
            user_role=g.user['role'],
            action='UPDATE',
            resource='Employees',
            resource_id=emp_id,
            details={"status": data.get('Status')}
        )

        return jsonify({
            "message": "Cập nhật nhân viên thành công và đã đồng bộ sang Payroll!",
            "synced_to_payroll": True
        }), 200

    except Exception as e:
        if conn_hr:
            try:
                conn_hr.rollback()
            except:
                pass
        if conn_payroll:
            try:
                conn_payroll.rollback()
            except:
                pass
        print(f"❌ Lỗi khi cập nhật nhân viên: {str(e)}")
        return jsonify({"error": str(e)}), 500

    finally:
        if conn_hr:
            conn_hr.close()
        if conn_payroll:
            conn_payroll.close()


# ============================================================
# UC.8: Xóa nhân viên (soft delete - chuyển trạng thái)
# Kiểm tra ràng buộc: KHÔNG cho xóa nếu có dữ liệu lương/cổ tức
# ============================================================
@employee_bp.route('/api/employees/<int:emp_id>', methods=['DELETE'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def delete_employee(emp_id):
    """
    Xóa nhân viên = chuyển Status thành 'Đã nghỉ việc'.
    NGĂN CHẶN xóa nếu nhân viên đã có dữ liệu trong bảng Salaries (MySQL) hoặc Dividends (SQL Server).
    """
    conn_hr = None
    conn_payroll = None

    try:
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()

        # Kiểm tra nhân viên tồn tại
        cursor_hr.execute("SELECT FullName, Status FROM Employees WHERE EmployeeID = ?", (emp_id,))
        employee = cursor_hr.fetchone()
        if not employee:
            return jsonify({"error": "Nhân viên không tồn tại!"}), 404

        emp_name = employee[0]
        current_status = employee[1]

        if current_status == 'Đã nghỉ việc':
            return jsonify({"error": f"Nhân viên '{emp_name}' đã ở trạng thái nghỉ việc!"}), 400

        # =============================================
        # KIỂM TRA RÀNG BUỘC: Dividends (SQL Server)
        # =============================================
        cursor_hr.execute("SELECT COUNT(*) FROM Dividends WHERE EmployeeID = ?", (emp_id,))
        dividend_count = cursor_hr.fetchone()[0]
        if dividend_count > 0:
            return jsonify({
                "error": f"Không thể xóa nhân viên '{emp_name}'! "
                         f"Nhân viên này có {dividend_count} bản ghi cổ tức trong hệ thống. "
                         f"Vui lòng xử lý dữ liệu cổ tức trước."
            }), 400

        # =============================================
        # KIỂM TRA RÀNG BUỘC: Salaries (MySQL)
        # =============================================
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()

        cursor_payroll.execute(
            "SELECT COUNT(*) as cnt FROM salaries WHERE EmployeeID = %s",
            (emp_id,)
        )
        salary_result = cursor_payroll.fetchone()
        salary_count = salary_result['cnt'] if salary_result else 0

        if salary_count > 0:
            return jsonify({
                "error": f"Không thể xóa nhân viên '{emp_name}'! "
                         f"Nhân viên này có {salary_count} bản ghi lương trong hệ thống Payroll. "
                         f"Vui lòng xử lý dữ liệu lương trước."
            }), 400

        # =============================================
        # SOFT DELETE: Chuyển trạng thái
        # =============================================
        cursor_hr.execute(
            "UPDATE Employees SET Status = N'Đã nghỉ việc', UpdatedAt = GETDATE() WHERE EmployeeID = ?",
            (emp_id,)
        )

        # Đồng bộ status sang Payroll
        cursor_payroll.execute(
            "UPDATE employees_payroll SET Status = %s, SyncedAt = NOW() WHERE EmployeeID = %s",
            ('Đã nghỉ việc', emp_id)
        )

        # COMMIT cả 2
        conn_hr.commit()
        conn_payroll.commit()

        # Audit Log
        log_action(
            user_id=g.user['id'],
            username=g.user['username'],
            user_role=g.user['role'],
            action='DELETE',
            resource='Employees',
            resource_id=emp_id,
            details={"deleted_employee": emp_name}
        )

        return jsonify({
            "message": f"Xóa nhân viên '{emp_name}' thành công (chuyển trạng thái Đã nghỉ việc)!",
            "synced_to_payroll": True
        }), 200

    except Exception as e:
        if conn_hr:
            try:
                conn_hr.rollback()
            except:
                pass
        if conn_payroll:
            try:
                conn_payroll.rollback()
            except:
                pass
        print(f"❌ Lỗi khi xóa nhân viên: {str(e)}")
        return jsonify({"error": str(e)}), 500

    finally:
        if conn_hr:
            conn_hr.close()
        if conn_payroll:
            conn_payroll.close()


# ============================================================
# API: Tìm kiếm nhân viên
# ============================================================
@employee_bp.route('/api/employees/search', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager', 'Employee'])
def search_employees():
    """Tìm kiếm nhân viên theo tên, email, phòng ban"""
    keyword = request.args.get('q', '').strip()
    if not keyword:
        return jsonify({"error": "Vui lòng nhập từ khóa tìm kiếm"}), 400

    conn = None
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()

        query = """
            SELECT e.EmployeeID, e.FullName, e.Email, e.PhoneNumber,
                   e.DateOfBirth, e.Gender, e.HireDate,
                   e.DepartmentID, d.DepartmentName,
                   e.PositionID, p.PositionName,
                   e.Status
            FROM Employees e
            LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
            LEFT JOIN Positions p ON e.PositionID = p.PositionID
            WHERE e.FullName LIKE ? OR e.Email LIKE ? OR d.DepartmentName LIKE ?
        """
        search_param = f'%{keyword}%'
        cursor.execute(query, (search_param, search_param, search_param))

        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
