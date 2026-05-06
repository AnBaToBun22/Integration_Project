from flask import Blueprint, jsonify, request, current_app, g
from ..auth_middleware import token_required, require_roles
from .audit_routes import log_action

position_bp = Blueprint('positions', __name__, url_prefix='/api/positions')


# ============================================================
# GET /api/positions/ - Lấy danh sách tất cả chức vụ
# ============================================================
@position_bp.route('/', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager', 'Employee'])
def get_all_positions():
    """Lấy danh sách tất cả chức vụ từ HR DB (SQL Server)"""
    conn = None
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT p.PositionID, p.PositionName,
                   (SELECT COUNT(*) FROM Employees e WHERE e.PositionID = p.PositionID) as EmployeeCount
            FROM Positions p 
            ORDER BY p.PositionID
        """)

        positions = []
        for row in cursor.fetchall():
            positions.append({
                'id': row[0],
                'name': row[1],
                'employee_count': row[2]
            })

        return jsonify({
            'success': True,
            'data': positions,
            'count': len(positions)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi lấy danh sách chức vụ: {str(e)}'
        }), 500
    finally:
        if conn:
            conn.close()


# ============================================================
# POST /api/positions/ - Tạo chức vụ mới + Đồng bộ Payroll
# ============================================================
@position_bp.route('/', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def create_position():
    """Tạo chức vụ mới trong HR DB và đồng bộ sang positions_payroll (MySQL)"""
    conn_hr = None
    conn_payroll = None

    try:
        data = request.get_json()

        if not data or 'name' not in data:
            return jsonify({'success': False, 'message': 'Tên chức vụ là bắt buộc'}), 400

        pos_name = data.get('name', '').strip()
        if not pos_name:
            return jsonify({'success': False, 'message': 'Tên chức vụ không được để trống'}), 400

        # BƯỚC 1: INSERT vào SQL Server
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()

        cursor_hr.execute("SELECT COUNT(*) FROM Positions WHERE PositionName = ?", (pos_name,))
        if cursor_hr.fetchone()[0] > 0:
            return jsonify({'success': False, 'message': 'Tên chức vụ đã tồn tại'}), 400

        cursor_hr.execute(
            "INSERT INTO Positions (PositionName, CreatedAt, UpdatedAt) VALUES (?, GETDATE(), GETDATE())",
            (pos_name,)
        )

        cursor_hr.execute("SELECT @@IDENTITY")
        pos_id = int(cursor_hr.fetchone()[0])

        # BƯỚC 2: Đồng bộ sang MySQL
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()

        cursor_payroll.execute(
            "INSERT INTO positions_payroll (PositionID, PositionName, SyncedAt) VALUES (%s, %s, NOW())",
            (pos_id, pos_name)
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
            resource='Positions',
            resource_id=pos_id,
            details={"position_name": pos_name}
        )

        return jsonify({
            'success': True,
            'message': 'Chức vụ được tạo thành công và đã đồng bộ sang Payroll!',
            'data': {'id': pos_id, 'name': pos_name}
        }), 201

    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        if conn_payroll:
            try: conn_payroll.rollback()
            except: pass
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        if conn_hr: conn_hr.close()
        if conn_payroll: conn_payroll.close()


# ============================================================
# PUT /api/positions/<id> - Cập nhật chức vụ + Đồng bộ
# ============================================================
@position_bp.route('/<int:pos_id>', methods=['PUT'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def update_position(pos_id):
    """Cập nhật chức vụ trong HR DB và đồng bộ sang Payroll"""
    conn_hr = None
    conn_payroll = None

    try:
        data = request.get_json()

        if not data or 'name' not in data:
            return jsonify({'success': False, 'message': 'Tên chức vụ là bắt buộc'}), 400

        pos_name = data.get('name', '').strip()
        if not pos_name:
            return jsonify({'success': False, 'message': 'Tên chức vụ không được để trống'}), 400

        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()

        # Kiểm tra tồn tại
        cursor_hr.execute("SELECT COUNT(*) FROM Positions WHERE PositionID = ?", (pos_id,))
        if cursor_hr.fetchone()[0] == 0:
            return jsonify({'success': False, 'message': 'Chức vụ không tồn tại'}), 404

        # Kiểm tra tên trùng
        cursor_hr.execute(
            "SELECT COUNT(*) FROM Positions WHERE PositionName = ? AND PositionID != ?",
            (pos_name, pos_id)
        )
        if cursor_hr.fetchone()[0] > 0:
            return jsonify({'success': False, 'message': 'Tên chức vụ này đã được sử dụng'}), 400

        cursor_hr.execute(
            "UPDATE Positions SET PositionName = ?, UpdatedAt = GETDATE() WHERE PositionID = ?",
            (pos_name, pos_id)
        )

        # Đồng bộ MySQL
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()

        cursor_payroll.execute(
            "SELECT PositionID FROM positions_payroll WHERE PositionID = %s", (pos_id,)
        )
        if cursor_payroll.fetchone():
            cursor_payroll.execute(
                "UPDATE positions_payroll SET PositionName = %s, SyncedAt = NOW() WHERE PositionID = %s",
                (pos_name, pos_id)
            )
        else:
            cursor_payroll.execute(
                "INSERT INTO positions_payroll (PositionID, PositionName, SyncedAt) VALUES (%s, %s, NOW())",
                (pos_id, pos_name)
            )

        conn_hr.commit()
        conn_payroll.commit()

        # Audit Log
        log_action(
            user_id=g.user['id'],
            username=g.user['username'],
            user_role=g.user['role'],
            action='UPDATE',
            resource='Positions',
            resource_id=pos_id,
            details={"position_name": pos_name}
        )

        return jsonify({'success': True, 'message': 'Chức vụ được cập nhật thành công và đã đồng bộ!'}), 200

    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        if conn_payroll:
            try: conn_payroll.rollback()
            except: pass
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        if conn_hr: conn_hr.close()
        if conn_payroll: conn_payroll.close()


# ============================================================
# DELETE /api/positions/<id> - Xóa chức vụ + Đồng bộ
# ============================================================
@position_bp.route('/<int:pos_id>', methods=['DELETE'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def delete_position(pos_id):
    """Xóa chức vụ (nếu không có nhân viên) và đồng bộ xóa khỏi Payroll"""
    conn_hr = None
    conn_payroll = None

    try:
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()

        cursor_hr.execute("SELECT COUNT(*) FROM Positions WHERE PositionID = ?", (pos_id,))
        if cursor_hr.fetchone()[0] == 0:
            return jsonify({'success': False, 'message': 'Chức vụ không tồn tại'}), 404

        # Kiểm tra có nhân viên đang dùng chức vụ này
        cursor_hr.execute("SELECT COUNT(*) FROM Employees WHERE PositionID = ?", (pos_id,))
        emp_count = cursor_hr.fetchone()[0]
        if emp_count > 0:
            return jsonify({
                'success': False,
                'message': f'Không thể xóa! Chức vụ này đang được {emp_count} nhân viên sử dụng.'
            }), 400

        cursor_hr.execute("DELETE FROM Positions WHERE PositionID = ?", (pos_id,))

        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()
        cursor_payroll.execute("DELETE FROM positions_payroll WHERE PositionID = %s", (pos_id,))

        conn_hr.commit()
        conn_payroll.commit()

        # Audit Log
        log_action(
            user_id=g.user['id'],
            username=g.user['username'],
            user_role=g.user['role'],
            action='DELETE',
            resource='Positions',
            resource_id=pos_id,
            details={"action": "Deleted position"}
        )

        return jsonify({'success': True, 'message': 'Chức vụ được xóa thành công và đã đồng bộ!'}), 200

    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        if conn_payroll:
            try: conn_payroll.rollback()
            except: pass
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        if conn_hr: conn_hr.close()
        if conn_payroll: conn_payroll.close()
