from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles
from ..models import AuditLog
from .. import db

position_bp = Blueprint('positions', __name__, url_prefix='/api/positions')


@position_bp.route('/', methods=['GET'])
@token_required
def get_all_positions(current_user_role, **kwargs):
    """Lấy danh sách tất cả chức vụ"""
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT PositionID, PositionName FROM Positions ORDER BY PositionID")
        positions = []
        
        for row in cursor.fetchall():
            positions.append({
                'id': row[0],
                'name': row[1],
            })
        
        cursor.close()
        conn.close()
        
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


@position_bp.route('/<int:pos_id>', methods=['GET'])
@token_required
def get_position(current_user_role, pos_id, **kwargs):
    """Lấy chi tiết một chức vụ"""
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT PositionID, PositionName FROM Positions WHERE PositionID = ?", (pos_id,))
        row = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not row:
            return jsonify({'success': False, 'message': 'Chức vụ không tồn tại'}), 404
        
        return jsonify({
            'success': True,
            'data': {'id': row[0], 'name': row[1]}
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500


@position_bp.route('/', methods=['POST'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def create_position(current_user_role, **kwargs):
    """Tạo chức vụ mới + Đồng bộ sang Payroll"""
    current_username = kwargs.get('current_username', 'Unknown')
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
        
        # Kiểm tra trùng
        cursor_hr.execute("SELECT COUNT(*) FROM Positions WHERE PositionName = ?", (pos_name,))
        if cursor_hr.fetchone()[0] > 0:
            return jsonify({'success': False, 'message': 'Tên chức vụ đã tồn tại'}), 400
        
        cursor_hr.execute("INSERT INTO Positions (PositionName) VALUES (?)", (pos_name,))
        cursor_hr.execute("SELECT @@IDENTITY")
        pos_id = int(cursor_hr.fetchone()[0])
        
        # Đồng bộ Payroll
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()
        cursor_payroll.execute(
            "INSERT INTO positions_payroll (PositionID, PositionName, SyncedAt) VALUES (%s, %s, NOW())",
            (pos_id, pos_name)
        )
        
        conn_hr.commit()
        conn_payroll.commit()
        
        try:
            log = AuditLog(username=current_username, action="THÊM MỚI", detail=f"Thêm chức vụ: {pos_name} (ID: {pos_id}) + Đồng bộ Payroll")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        
        return jsonify({'success': True, 'message': 'Chức vụ được tạo và đồng bộ thành công'}), 201
    
    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        if conn_payroll:
            try: conn_payroll.rollback()
            except: pass
        return jsonify({'success': False, 'message': f'Lỗi khi tạo chức vụ: {str(e)}'}), 500
    finally:
        if conn_hr: conn_hr.close()
        if conn_payroll: conn_payroll.close()


@position_bp.route('/<int:pos_id>', methods=['PUT'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def update_position(current_user_role, pos_id, **kwargs):
    """Cập nhật chức vụ + Đồng bộ Payroll"""
    current_username = kwargs.get('current_username', 'Unknown')
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
        
        cursor_hr.execute("SELECT COUNT(*) FROM Positions WHERE PositionID = ?", (pos_id,))
        if cursor_hr.fetchone()[0] == 0:
            return jsonify({'success': False, 'message': 'Chức vụ không tồn tại'}), 404
        
        cursor_hr.execute("SELECT COUNT(*) FROM Positions WHERE PositionName = ? AND PositionID != ?", (pos_name, pos_id))
        if cursor_hr.fetchone()[0] > 0:
            return jsonify({'success': False, 'message': 'Tên chức vụ này đã được sử dụng'}), 400
        
        cursor_hr.execute("UPDATE Positions SET PositionName = ?, UpdatedAt = GETDATE() WHERE PositionID = ?", (pos_name, pos_id))
        
        conn_payroll = current_app.get_payroll_db()
        cursor_payroll = conn_payroll.cursor()
        
        cursor_payroll.execute("SELECT COUNT(*) as cnt FROM positions_payroll WHERE PositionID = %s", (pos_id,))
        if cursor_payroll.fetchone()['cnt'] > 0:
            cursor_payroll.execute("UPDATE positions_payroll SET PositionName = %s, SyncedAt = NOW() WHERE PositionID = %s", (pos_name, pos_id))
        else:
            cursor_payroll.execute("INSERT INTO positions_payroll (PositionID, PositionName, SyncedAt) VALUES (%s, %s, NOW())", (pos_id, pos_name))
        
        conn_hr.commit()
        conn_payroll.commit()
        
        try:
            log = AuditLog(username=current_username, action="CẬP NHẬT", detail=f"Cập nhật chức vụ ID {pos_id}: {pos_name}")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        
        return jsonify({'success': True, 'message': 'Chức vụ được cập nhật và đồng bộ thành công'}), 200
    
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


@position_bp.route('/<int:pos_id>', methods=['DELETE'])
@token_required
@require_roles(['Admin'])
def delete_position(current_user_role, pos_id, **kwargs):
    """Xóa chức vụ (kiểm tra nhân viên trước)"""
    current_username = kwargs.get('current_username', 'Unknown')
    conn_hr = None
    conn_payroll = None
    
    try:
        conn_hr = current_app.get_hr_db()
        cursor_hr = conn_hr.cursor()
        
        cursor_hr.execute("SELECT PositionName FROM Positions WHERE PositionID = ?", (pos_id,))
        row = cursor_hr.fetchone()
        if not row:
            return jsonify({'success': False, 'message': 'Chức vụ không tồn tại'}), 404
        
        pos_name = row[0]
        
        # Kiểm tra nhân viên đang giữ chức vụ này
        cursor_hr.execute("SELECT COUNT(*) FROM Employees WHERE PositionID = ?", (pos_id,))
        emp_count = cursor_hr.fetchone()[0]
        
        if emp_count > 0:
            return jsonify({
                'success': False,
                'message': f'Không thể xóa! Chức vụ "{pos_name}" đang có {emp_count} nhân viên.'
            }), 400
        
        cursor_hr.execute("DELETE FROM Positions WHERE PositionID = ?", (pos_id,))
        
        try:
            conn_payroll = current_app.get_payroll_db()
            cursor_payroll = conn_payroll.cursor()
            cursor_payroll.execute("DELETE FROM positions_payroll WHERE PositionID = %s", (pos_id,))
            conn_payroll.commit()
        except Exception as sync_err:
            print(f"[WARNING] Sync delete payroll failed: {sync_err}")
        
        conn_hr.commit()
        
        try:
            log = AuditLog(username=current_username, action="XÓA", detail=f"Xóa chức vụ: {pos_name} (ID: {pos_id})")
            db.session.add(log)
            db.session.commit()
        except Exception as log_err:
            print("Lỗi lưu log:", log_err)
        
        return jsonify({'success': True, 'message': f'Chức vụ "{pos_name}" được xóa thành công'}), 200
    
    except Exception as e:
        if conn_hr:
            try: conn_hr.rollback()
            except: pass
        return jsonify({'success': False, 'message': f'Lỗi: {str(e)}'}), 500
    finally:
        if conn_hr: conn_hr.close()
        if conn_payroll: conn_payroll.close()
