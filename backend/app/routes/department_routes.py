from flask import Blueprint, jsonify, request, current_app, g
from ..auth_middleware import token_required, require_roles
from .audit_routes import log_action

department_bp = Blueprint('departments', __name__, url_prefix='/api/departments')


# ============================================================
# GET /api/departments/ - Lấy danh sách tất cả phòng ban
# ============================================================
@department_bp.route('/', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager', 'Employee'])
def get_all_departments():
    """Lấy danh sách tất cả phòng ban từ HR DB (SQL Server)"""
    conn = None
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT d.DepartmentID, d.DepartmentName,
                   (SELECT COUNT(*) FROM Employees e WHERE e.DepartmentID = d.DepartmentID) as EmployeeCount
            FROM Departments d 
            ORDER BY d.DepartmentID
        """)

        departments = []
        for row in cursor.fetchall():
            departments.append({
                'id': row[0],
                'name': row[1],
                'employee_count': row[2]
            })

        return jsonify({
            'success': True,
            'data': departments,
            'count': len(departments)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi lấy danh sách phòng ban: {str(e)}'
        }), 500
    finally:
        if conn:
            conn.close()


# ============================================================
# GET /api/departments/<id> - Lấy chi tiết một phòng ban
# ============================================================
@department_bp.route('/<int:dept_id>', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager', 'Employee'])
def get_department(dept_id):
    """Lấy chi tiết một phòng ban"""
    conn = None
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT DepartmentID, DepartmentName FROM Departments WHERE DepartmentID = ?",
            (dept_id,)
        )
        row = cursor.fetchone()

        if not row:
            return jsonify({
                'success': False,
                'message': 'Phòng ban không tồn tại'
            }), 404

        return jsonify({
            'success': True,
            'data': {
                'id': row[0],
                'name': row[1],
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi lấy thông tin phòng ban: {str(e)}'
        }), 500
    finally:
        if conn:
            conn.close()


# ============================================================
# POST /api/departments/ - Tạo phòng ban mới + Đồng bộ Payroll
# ============================================================
@department_bp.route('/', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def create_department():
    """Tạo phòng ban mới trong HR DB và đồng bộ sang departments_payroll (MySQL)"""
    conn_hr = None
    conn_payroll = None

    try:
        data = request.get_json()

        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'message': 'Tên phòng ban là bắt buộc'
            }), 400

        dept_name = data.get('name', '').strip()
        if not dept_name:
            return jsonify({
                'success': False,
                'message': 'Tên phòng ban không được để trống'
            }), 400

        # =============================================
        # BƯỚC 1: INSERT vào SQL Server (HR Database)
        # =============================================
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()

        # Kiểm tra tên phòng ban đã tồn tại chưa
        cursor_hr.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentName = ?", (dept_name,))
        if cursor_hr.fetchone()[0] > 0:
            return jsonify({
                'success': False,
                'message': 'Tên phòng ban đã tồn tại'
            }), 400

        # Insert phòng ban mới
        cursor_hr.execute("INSERT INTO Departments (DepartmentName, CreatedAt, UpdatedAt) VALUES (?, GETDATE(), GETDATE())", (dept_name,))

        # Lấy ID phòng ban vừa tạo
        cursor_hr.execute("SELECT @@IDENTITY")
        dept_id = int(cursor_hr.fetchone()[0])

        # =============================================
        # BƯỚC 2: Đồng bộ sang MySQL (Payroll Database)
        # =============================================
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()

        cursor_payroll.execute(
            "INSERT INTO departments_payroll (DepartmentID, DepartmentName, SyncedAt) VALUES (%s, %s, NOW())",
            (dept_id, dept_name)
        )

        # COMMIT cả 2
        conn_hr.commit()
        conn_payroll.commit()

        # Audit Log
        log_action(
            user_id=g.user['id'],
            username=g.user['username'],
            user_role=g.user['role'],
            action='CREATE',
            resource='Departments',
            resource_id=dept_id,
            details={"department_name": dept_name}
        )

        return jsonify({
            'success': True,
            'message': 'Phòng ban được tạo thành công và đã đồng bộ sang Payroll!',
            'data': {'id': dept_id, 'name': dept_name}
        }), 201

    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        if conn_payroll:
            try: conn_payroll.rollback()
            except: pass
        return jsonify({
            'success': False,
            'message': f'Lỗi khi tạo phòng ban: {str(e)}'
        }), 500
    finally:
        if conn_hr:
            conn_hr.close()
        if conn_payroll:
            conn_payroll.close()


# ============================================================
# PUT /api/departments/<id> - Cập nhật phòng ban + Đồng bộ
# ============================================================
@department_bp.route('/<int:dept_id>', methods=['PUT'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def update_department(dept_id):
    """Cập nhật phòng ban trong HR DB và đồng bộ sang Payroll"""
    conn_hr = None
    conn_payroll = None

    try:
        data = request.get_json()

        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'message': 'Tên phòng ban là bắt buộc'
            }), 400

        dept_name = data.get('name', '').strip()
        if not dept_name:
            return jsonify({
                'success': False,
                'message': 'Tên phòng ban không được để trống'
            }), 400

        # =============================================
        # BƯỚC 1: UPDATE trong SQL Server
        # =============================================
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()

        # Kiểm tra phòng ban tồn tại
        cursor_hr.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentID = ?", (dept_id,))
        if cursor_hr.fetchone()[0] == 0:
            return jsonify({
                'success': False,
                'message': 'Phòng ban không tồn tại'
            }), 404

        # Kiểm tra tên trùng lặp
        cursor_hr.execute(
            "SELECT COUNT(*) FROM Departments WHERE DepartmentName = ? AND DepartmentID != ?",
            (dept_name, dept_id)
        )
        if cursor_hr.fetchone()[0] > 0:
            return jsonify({
                'success': False,
                'message': 'Tên phòng ban này đã được sử dụng'
            }), 400

        # Update phòng ban
        cursor_hr.execute(
            "UPDATE Departments SET DepartmentName = ?, UpdatedAt = GETDATE() WHERE DepartmentID = ?",
            (dept_name, dept_id)
        )

        # =============================================
        # BƯỚC 2: Đồng bộ sang MySQL
        # =============================================
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()

        # Kiểm tra tồn tại trong MySQL
        cursor_payroll.execute(
            "SELECT DepartmentID FROM departments_payroll WHERE DepartmentID = %s",
            (dept_id,)
        )
        if cursor_payroll.fetchone():
            cursor_payroll.execute(
                "UPDATE departments_payroll SET DepartmentName = %s, SyncedAt = NOW() WHERE DepartmentID = %s",
                (dept_name, dept_id)
            )
        else:
            cursor_payroll.execute(
                "INSERT INTO departments_payroll (DepartmentID, DepartmentName, SyncedAt) VALUES (%s, %s, NOW())",
                (dept_id, dept_name)
            )

        # COMMIT cả 2
        conn_hr.commit()
        conn_payroll.commit()

        # Audit Log
        log_action(
            user_id=g.user['id'],
            username=g.user['username'],
            user_role=g.user['role'],
            action='UPDATE',
            resource='Departments',
            resource_id=dept_id,
            details={"department_name": dept_name}
        )

        return jsonify({
            'success': True,
            'message': 'Phòng ban được cập nhật thành công và đã đồng bộ!'
        }), 200

    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        if conn_payroll:
            try: conn_payroll.rollback()
            except: pass
        return jsonify({
            'success': False,
            'message': f'Lỗi khi cập nhật phòng ban: {str(e)}'
        }), 500
    finally:
        if conn_hr:
            conn_hr.close()
        if conn_payroll:
            conn_payroll.close()


# ============================================================
# DELETE /api/departments/<id> - Xóa phòng ban + Đồng bộ
# ============================================================
@department_bp.route('/<int:dept_id>', methods=['DELETE'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def delete_department(dept_id):
    """Xóa phòng ban (nếu không có nhân viên) và đồng bộ xóa khỏi Payroll"""
    conn_hr = None
    conn_payroll = None

    try:
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()

        # Kiểm tra phòng ban tồn tại
        cursor_hr.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentID = ?", (dept_id,))
        if cursor_hr.fetchone()[0] == 0:
            return jsonify({
                'success': False,
                'message': 'Phòng ban không tồn tại'
            }), 404

        # Kiểm tra có nhân viên trong phòng ban không
        cursor_hr.execute("SELECT COUNT(*) FROM Employees WHERE DepartmentID = ?", (dept_id,))
        employee_count = cursor_hr.fetchone()[0]
        if employee_count > 0:
            return jsonify({
                'success': False,
                'message': f'Không thể xóa! Phòng ban này còn {employee_count} nhân viên. '
                           f'Vui lòng chuyển nhân viên sang phòng ban khác trước.'
            }), 400

        # Xóa khỏi SQL Server
        cursor_hr.execute("DELETE FROM Departments WHERE DepartmentID = ?", (dept_id,))

        # Đồng bộ xóa khỏi MySQL
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()
        cursor_payroll.execute(
            "DELETE FROM departments_payroll WHERE DepartmentID = %s",
            (dept_id,)
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
            resource='Departments',
            resource_id=dept_id,
            details={"action": "Deleted department"}
        )

        return jsonify({
            'success': True,
            'message': 'Phòng ban được xóa thành công và đã đồng bộ!'
        }), 200

    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        if conn_payroll:
            try: conn_payroll.rollback()
            except: pass
        return jsonify({
            'success': False,
            'message': f'Lỗi khi xóa phòng ban: {str(e)}'
        }), 500
    finally:
        if conn_hr:
            conn_hr.close()
        if conn_payroll:
            conn_payroll.close()
