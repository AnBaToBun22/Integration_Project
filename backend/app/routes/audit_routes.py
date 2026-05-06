from flask import Blueprint, jsonify, request
from .. import db
from ..auth_middleware import token_required, require_roles
from ..models import AuditLog
import json

audit_bp = Blueprint('audit_bp', __name__)


def log_action(user_id=None, username=None, user_role=None, 
               action='', resource='', resource_id=None, details=None):
    """
    Helper function để ghi audit log.
    Có thể gọi từ bất kỳ route nào:
    
    from ..routes.audit_routes import log_action
    log_action(user_id=1, username='admin', action='CREATE', resource='employees', resource_id='10')
    """
    try:
        log = AuditLog(
            user_id=user_id,
            username=username,
            user_role=user_role,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id else None,
            details=json.dumps(details, ensure_ascii=False) if details else None,
            ip_address=request.remote_addr if request else None
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"[AuditLog] Lỗi ghi log: {e}")
        db.session.rollback()


@audit_bp.route('/api/audit-logs', methods=['GET'])
@token_required
@require_roles(['Admin'])
def get_audit_logs():
    """Lấy danh sách audit logs (phân trang)"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    resource_filter = request.args.get('resource', None)
    action_filter = request.args.get('action', None)

    query = AuditLog.query

    if resource_filter:
        query = query.filter(AuditLog.resource == resource_filter)
    if action_filter:
        query = query.filter(AuditLog.action == action_filter)

    # Sắp xếp mới nhất trước
    query = query.order_by(AuditLog.created_at.desc())

    # Phân trang
    total = query.count()
    logs = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'success': True,
        'data': [log.to_dict() for log in logs],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    }), 200
