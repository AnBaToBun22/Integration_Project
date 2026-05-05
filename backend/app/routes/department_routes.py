from flask import Blueprint, jsonify, request
from app import db
import pyodbc
import pymysql
import os

department_bp = Blueprint('departments', __name__, url_prefix='/api/departments')

def get_hr_db_connection():
    """Connect to HR Database (SQL Server)"""
    try:
        connstr = os.environ.get('HR_DB_CONNECTION_STRING')
        if not connstr:
            raise ValueError("HR_DB_CONNECTION_STRING not configured")
        return pyodbc.connect(connstr)
    except Exception as e:
        print(f"[ERROR] Cannot connect to SQL Server: {e}")
        raise e

def get_payroll_db_connection():
    """Connect to Payroll Database (MySQL)"""
    try:
        from app.config import Config
        return pymysql.connect(
            host=Config.PAYROLL_DB_HOST,
            user=Config.PAYROLL_DB_USER,
            password=Config.PAYROLL_DB_PASSWORD,
            database=Config.PAYROLL_DB_NAME,
            charset='utf8mb4'
        )
    except Exception as e:
        print(f"[ERROR] Cannot connect to MySQL Payroll Database: {e}")
        raise e

@department_bp.route('/', methods=['GET'])
def get_all_departments():
    """Get all departments"""
    try:
        conn = get_hr_db_connection()
        cursor = conn.cursor()
        
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
            'message': f'Error getting departments: {str(e)}'
        }), 500

@department_bp.route('/<int:dept_id>', methods=['GET'])
def get_department(dept_id):
    """Get department details"""
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
                'message': 'Department not found'
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
            'message': f'Error getting department: {str(e)}'
        }), 500

@department_bp.route('/', methods=['POST'])
def create_department():
    """Create new department - Save to both SQL Server (HUMANnew) and MySQL (payroll_2026)"""
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'message': 'Department name is required'
            }), 400
        
        dept_name = data.get('name', '').strip()
        
        if not dept_name:
            return jsonify({
                'success': False,
                'message': 'Department name cannot be empty'
            }), 400
        
        # Check and insert in SQL Server (HUMANnew)
        conn_sql = get_hr_db_connection()
        cursor_sql = conn_sql.cursor()
        
        cursor_sql.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentName = ?", (dept_name,))
        if cursor_sql.fetchone()[0] > 0:
            cursor_sql.close()
            conn_sql.close()
            return jsonify({
                'success': False,
                'message': 'Department name already exists'
            }), 400
        
        # Check and insert in MySQL (payroll_2026)
        conn_mysql = get_payroll_db_connection()
        cursor_mysql = conn_mysql.cursor()
        
        cursor_mysql.execute("SELECT COUNT(*) FROM departments_payroll WHERE DepartmentName = %s", (dept_name,))
        if cursor_mysql.fetchone()[0] > 0:
            cursor_mysql.close()
            conn_mysql.close()
            cursor_sql.close()
            conn_sql.close()
            return jsonify({
                'success': False,
                'message': 'Department name already exists'
            }), 400
        
        try:
            # Insert into SQL Server
            cursor_sql.execute("INSERT INTO Departments (DepartmentName) VALUES (?)", (dept_name,))
            conn_sql.commit()
            
            # Get the new DepartmentID from SQL Server
            cursor_sql.execute("SELECT @@IDENTITY")
            dept_id = cursor_sql.fetchone()[0]
            
            # Insert into MySQL with same ID
            cursor_mysql.execute("INSERT INTO departments_payroll (DepartmentID, DepartmentName) VALUES (%s, %s)", 
                               (int(dept_id), dept_name))
            conn_mysql.commit()
            
            cursor_sql.close()
            conn_sql.close()
            cursor_mysql.close()
            conn_mysql.close()
            
            return jsonify({
                'success': True,
                'message': 'Thêm thành công'
            }), 201
        except Exception as e:
            conn_sql.rollback()
            conn_mysql.rollback()
            cursor_sql.close()
            conn_sql.close()
            cursor_mysql.close()
            conn_mysql.close()
            raise e
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error creating department: {str(e)}'
        }), 500

@department_bp.route('/<int:dept_id>', methods=['PUT'])
def update_department(dept_id):
    """Update department info - Update in both HUMANnew and payroll_2026"""
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'message': 'Department name is required'
            }), 400
        
        dept_name = data.get('name', '').strip()
        
        if not dept_name:
            return jsonify({
                'success': False,
                'message': 'Department name cannot be empty'
            }), 400
        
        conn = get_hr_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentID = ?", (dept_id,))
        if cursor.fetchone()[0] == 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Department not found'
            }), 404
        
        cursor.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentName = ? AND DepartmentID != ?", (dept_name, dept_id))
        if cursor.fetchone()[0] > 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Department name already used'
            }), 400
        
        try:
            # Update in SQL Server
            cursor.execute("UPDATE Departments SET DepartmentName = ? WHERE DepartmentID = ?", (dept_name, dept_id))
            conn.commit()
            
            # Update in MySQL
            conn_mysql = get_payroll_db_connection()
            cursor_mysql = conn_mysql.cursor()
            cursor_mysql.execute("UPDATE departments_payroll SET DepartmentName = %s WHERE DepartmentID = %s", 
                               (dept_name, dept_id))
            conn_mysql.commit()
            cursor_mysql.close()
            conn_mysql.close()
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Cập nhật thành công'
            }), 200
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            raise e
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error updating department: {str(e)}'
        }), 500

@department_bp.route('/<int:dept_id>', methods=['DELETE'])
def delete_department(dept_id):
    """Delete department from both HUMANnew and payroll_2026"""
    try:
        conn = get_hr_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM Departments WHERE DepartmentID = ?", (dept_id,))
        if cursor.fetchone()[0] == 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Department not found'
            }), 404
        
        cursor.execute("SELECT COUNT(*) FROM Employees WHERE DepartmentID = ?", (dept_id,))
        employee_count = cursor.fetchone()[0]
        
        if employee_count > 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': f'Cannot delete! Department has {employee_count} employees. Move employees to another department first.'
            }), 400
        
        # Get department name to delete from MySQL
        cursor.execute("SELECT DepartmentName FROM Departments WHERE DepartmentID = ?", (dept_id,))
        dept_name = cursor.fetchone()[0]
        
        try:
            # Delete from SQL Server
            cursor.execute("DELETE FROM Departments WHERE DepartmentID = ?", (dept_id,))
            conn.commit()
            
            # Delete from MySQL
            conn_mysql = get_payroll_db_connection()
            cursor_mysql = conn_mysql.cursor()
            cursor_mysql.execute("DELETE FROM departments_payroll WHERE DepartmentID = %s", (dept_id,))
            conn_mysql.commit()
            cursor_mysql.close()
            conn_mysql.close()
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Xóa thành công'
            }), 200
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            raise e
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error deleting department: {str(e)}'
        }), 500
