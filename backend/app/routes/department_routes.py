from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles
from ..models import AuditLog
from .. import db

department_bp = Blueprint('departments', __name__, url_prefix='/api/departments')


@department_bp.route('/', methods=['GET'])
@token_required
def get_all_departments(current_user_role, **kwargs):
    """Lấy danh sách tất cả phòng ban"""
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT DepartmentID, DepartmentName FROM Departments ORDER BY DepartmentID")
        departments = []
        
        for row in cursor.fetchall():
            departments.append({
                'id': row[0],
                'name': row[1],
            })
        
        cursor.close()
        conn.close()
        
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


@department_bp.route('/<int:dept_id>', methods=['GET'])
@token_required
def get_department(current_user_role, dept_id, **kwargs):
    """Lấy chi tiết một phòng ban"""
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT DepartmentID, DepartmentName FROM Departments WHERE DepartmentID = ?", (dept_id,))
        row = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
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


@department_bp.route('/', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def create_department(current_user_role, **kwargs):
    """Tạo phòng ban mới + Đồng bộ sang Payroll"""
    current_username = kwargs.get('current_username', 'Unknown')
    conn_hr = None
    conn_payroll = None
    
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({'success': False, 'message': 'Tên phòng ban là bắt buộc'}), 400
        
        dept_name = data.get('name', '').strip()
        if not dept_name:
            return jsonify({'success': False, 'message': 'Tên phòng ban không được để trống'}), 400
        
        # BƯỚC 1: Lưu vào HR DB
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()
        
        # Kiểm tra trùng tên
        cursor_hr.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentName = ?", (dept_name,))
        if cursor_hr.fetchone()[0] > 0:
            return jsonify({'success': False, 'message': 'Tên phòng ban đã tồn tại'}), 400
        
        cursor_hr.execute("INSERT INTO Departments (DepartmentName) VALUES (?)", (dept_name,))
        
        # Lấy ID vừa tạo
        cursor_hr.execute("SELECT @@IDENTITY")
        dept_id = int(cursor_hr.fetchone()[0])
        
        # BƯỚC 2: Đồng bộ sang Payroll DB
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()
        cursor_payroll.execute(
            "INSERT INTO departments_payroll (DepartmentID, DepartmentName, SyncedAt) VALUES (%s, %s, NOW())",
            (dept_id, dept_name)
        )
        
        # Commit CẢ HAI
        conn_hr.commit()
        conn_payroll.commit()
        
        # AuditLog
        try:
            log = AuditLog(username=current_username, action="THÊM MỚI", detail=f"Thêm phòng ban: {dept_name} (ID: {dept_id}) + Đồng bộ Payroll")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        
        return jsonify({'success': True, 'message': 'Phòng ban được tạo và đồng bộ thành công'}), 201
    
    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        if conn_payroll:
            try: conn_payroll.rollback()
            except: pass
        return jsonify({'success': False, 'message': f'Lỗi khi tạo phòng ban: {str(e)}'}), 500
    finally:
        if conn_hr: conn_hr.close()
        if conn_payroll: conn_payroll.close()


@department_bp.route('/<int:dept_id>', methods=['PUT'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def update_department(current_user_role, dept_id, **kwargs):
    """Cập nhật phòng ban + Đồng bộ Payroll"""
    current_username = kwargs.get('current_username', 'Unknown')
    conn_hr = None
    conn_payroll = None
    
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({'success': False, 'message': 'Tên phòng ban là bắt buộc'}), 400
        
        dept_name = data.get('name', '').strip()
        if not dept_name:
            return jsonify({'success': False, 'message': 'Tên phòng ban không được để trống'}), 400
        
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()
        
        # Kiểm tra tồn tại
        cursor_hr.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentID = ?", (dept_id,))
        if cursor_hr.fetchone()[0] == 0:
            return jsonify({'success': False, 'message': 'Phòng ban không tồn tại'}), 404
        
        # Kiểm tra trùng tên
        cursor_hr.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentName = ? AND DepartmentID != ?", (dept_name, dept_id))
        if cursor_hr.fetchone()[0] > 0:
            return jsonify({'success': False, 'message': 'Tên phòng ban này đã được sử dụng'}), 400
        
        cursor_hr.execute("UPDATE Departments SET DepartmentName = ?, UpdatedAt = GETDATE() WHERE DepartmentID = ?", (dept_name, dept_id))
        
        # Đồng bộ sang Payroll
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()
        
        cursor_payroll.execute("SELECT COUNT(*) as cnt FROM departments_payroll WHERE DepartmentID = %s", (dept_id,))
        if cursor_payroll.fetchone()['cnt'] > 0:
            cursor_payroll.execute(
                "UPDATE departments_payroll SET DepartmentName = %s, SyncedAt = NOW() WHERE DepartmentID = %s",
                (dept_name, dept_id)
            )
        else:
            cursor_payroll.execute(
                "INSERT INTO departments_payroll (DepartmentID, DepartmentName, SyncedAt) VALUES (%s, %s, NOW())",
                (dept_id, dept_name)
            )
        
        conn_hr.commit()
        conn_payroll.commit()
        
        try:
            log = AuditLog(username=current_username, action="CẬP NHẬT", detail=f"Cập nhật phòng ban ID {dept_id}: {dept_name} + Đồng bộ Payroll")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        
        return jsonify({'success': True, 'message': 'Phòng ban được cập nhật và đồng bộ thành công'}), 200
    
    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        if conn_payroll:
            try: conn_payroll.rollback()
            except: pass
        return jsonify({'success': False, 'message': f'Lỗi khi cập nhật phòng ban: {str(e)}'}), 500
    finally:
        if conn_hr: conn_hr.close()
        if conn_payroll: conn_payroll.close()


@department_bp.route('/<int:dept_id>', methods=['DELETE'])
@token_required
@require_roles(['Admin'])
def delete_department(current_user_role, dept_id, **kwargs):
    """Xóa phòng ban (kiểm tra nhân viên trước)"""
    current_username = kwargs.get('current_username', 'Unknown')
    conn_hr = None
    conn_payroll = None
    
    try:
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()
        
        # Kiểm tra tồn tại
        cursor_hr.execute("SELECT DepartmentName FROM Departments WHERE DepartmentID = ?", (dept_id,))
        row = cursor_hr.fetchone()
        if not row:
            return jsonify({'success': False, 'message': 'Phòng ban không tồn tại'}), 404
        
        dept_name = row[0]
        
        # Kiểm tra nhân viên thuộc phòng ban
        cursor_hr.execute("SELECT COUNT(*) FROM Employees WHERE DepartmentID = ?", (dept_id,))
        employee_count = cursor_hr.fetchone()[0]
        
        if employee_count > 0:
            return jsonify({
                'success': False,
                'message': f'Không thể xóa! Phòng ban "{dept_name}" còn {employee_count} nhân viên.'
            }), 400
        
        # Xóa ở HR
        cursor_hr.execute("DELETE FROM Departments WHERE DepartmentID = ?", (dept_id,))
        
        # Xóa ở Payroll
        try:
            conn_payroll = current_app.get_payroll_db()
            cursor_payroll = conn_payroll.cursor()
            cursor_payroll.execute("DELETE FROM departments_payroll WHERE DepartmentID = %s", (dept_id,))
            conn_payroll.commit()
        except Exception as sync_err:
            print(f"[WARNING] Sync delete payroll failed: {sync_err}")
        
        conn_hr.commit()
        
        try:
            log = AuditLog(username=current_username, action="XÓA", detail=f"Xóa phòng ban: {dept_name} (ID: {dept_id})")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        
        return jsonify({'success': True, 'message': f'Phòng ban "{dept_name}" được xóa thành công'}), 200
    
    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        return jsonify({'success': False, 'message': f'Lỗi khi xóa phòng ban: {str(e)}'}), 500
    finally:
        if conn_hr: conn_hr.close()
        if conn_payroll: conn_payroll.close()
