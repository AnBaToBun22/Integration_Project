from flask import Blueprint, jsonify, request
from app import db
import pyodbc
import os

department_bp = Blueprint('departments', __name__, url_prefix='/api/departments')

def get_hr_db_connection():
    """Kết nối tới HR Database (SQL Server)"""
    try:
        connstr = os.environ.get('HR_DB_CONNECTION_STRING')
        if not connstr:
            raise ValueError("HR_DB_CONNECTION_STRING chưa được cấu hình")
        return pyodbc.connect(connstr)
    except Exception as e:
        print(f"[ERROR] Không thể kết nối SQL Server: {e}")
        raise e

@department_bp.route('/', methods=['GET'])
def get_all_departments():
    """Lấy danh sách tất cả phòng ban"""
    try:
        conn = get_hr_db_connection()
        cursor = conn.cursor()
        
        # Query dữ liệu từ bảng Departments
        cursor.execute("SELECT DepartmentID, DepartmentName FROM Departments ORDER BY DepartmentID")
        columns = [description[0] for description in cursor.description]
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
def get_department(dept_id):
    """Lấy chi tiết một phòng ban"""
    try:
        conn = get_hr_db_connection()
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
def create_department():
    """Tạo phòng ban mới"""
    try:
        data = request.get_json()
        
        # Validate dữ liệu
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
        
        conn = get_hr_db_connection()
        cursor = conn.cursor()
        
        # Kiểm tra tên phòng ban đã tồn tại chưa
        cursor.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentName = ?", (dept_name,))
        if cursor.fetchone()[0] > 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Tên phòng ban đã tồn tại'
            }), 400
        
        # Insert phòng ban mới
        cursor.execute("INSERT INTO Departments (DepartmentName) VALUES (?)", (dept_name,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Phòng ban được tạo thành công'
        }), 201
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi tạo phòng ban: {str(e)}'
        }), 500

@department_bp.route('/<int:dept_id>', methods=['PUT'])
def update_department(dept_id):
    """Cập nhật thông tin phòng ban"""
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
        
        conn = get_hr_db_connection()
        cursor = conn.cursor()
        
        # Kiểm tra phòng ban có tồn tại không
        cursor.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentID = ?", (dept_id,))
        if cursor.fetchone()[0] == 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Phòng ban không tồn tại'
            }), 404
        
        # Kiểm tra tên phòng ban đã được sử dụng bởi phòng ban khác chưa
        cursor.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentName = ? AND DepartmentID != ?", (dept_name, dept_id))
        if cursor.fetchone()[0] > 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Tên phòng ban này đã được sử dụng'
            }), 400
        
        # Update phòng ban
        cursor.execute("UPDATE Departments SET DepartmentName = ? WHERE DepartmentID = ?", (dept_name, dept_id))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Phòng ban được cập nhật thành công'
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi cập nhật phòng ban: {str(e)}'
        }), 500

@department_bp.route('/<int:dept_id>', methods=['DELETE'])
def delete_department(dept_id):
    """Xóa phòng ban"""
    try:
        conn = get_hr_db_connection()
        cursor = conn.cursor()
        
        # Kiểm tra phòng ban có tồn tại không
        cursor.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentID = ?", (dept_id,))
        if cursor.fetchone()[0] == 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Phòng ban không tồn tại'
            }), 404
        
        # Kiểm tra có nhân viên nào trong phòng ban này không
        cursor.execute("SELECT COUNT(*) FROM Employees WHERE DepartmentID = ?", (dept_id,))
        employee_count = cursor.fetchone()[0]
        
        if employee_count > 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': f'Không thể xóa! Phòng ban này còn {employee_count} nhân viên. Vui lòng chuyển nhân viên sang phòng ban khác trước.'
            }), 400
        
        # Xóa phòng ban (nếu không có nhân viên)
        cursor.execute("DELETE FROM Departments WHERE DepartmentID = ?", (dept_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Phòng ban được xóa thành công'
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi xóa phòng ban: {str(e)}'
        }), 500
