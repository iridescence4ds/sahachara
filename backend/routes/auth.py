from flask import Blueprint, jsonify, request
from models import User
from functools import wraps

auth_bp = Blueprint("auth", __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get("X-Auth-Token")
        if not token or token != "admin-mock-token":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function

def user_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get("X-Auth-Token")
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username")
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    token = f"{user.role.lower()}-mock-token"
    return jsonify({
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    })
