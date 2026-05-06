from flask import current_app
from contextlib import contextmanager

class DBManager:
    @staticmethod
    @contextmanager
    def hr_connection():
        """Context manager for SQL Server (HR DB)"""
        conn = current_app.get_hr_db()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            try:
                conn.rollback()
            except:
                pass
            raise e
        finally:
            try:
                conn.close()
            except:
                pass

    @staticmethod
    @contextmanager
    def dual_transaction():
        """Context manager for both HR and Payroll DBs with transaction support"""
        conn_hr = current_app.get_hr_db()
        conn_payroll = current_app.get_payroll_db()
        try:
            yield conn_hr, conn_payroll
            conn_hr.commit()
            conn_payroll.commit()
        except Exception as e:
            try:
                conn_hr.rollback()
            except:
                pass
            try:
                conn_payroll.rollback()
            except:
                pass
            raise e
        finally:
            try:
                conn_hr.close()
            except:
                pass
            try:
                conn_payroll.close()
            except:
                pass
