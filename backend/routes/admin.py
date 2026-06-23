from flask import Blueprint, jsonify, request
from models import db, Resource, Topic
from routes.auth import admin_required
from datetime import datetime

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/admin/resources", methods=["GET"])
@admin_required
def get_resources():
    resources = Resource.query.order_by(Resource.date.desc()).all()
    return jsonify([{
        "id": r.id,
        "title": r.title,
        "filename": r.filename,
        "type": r.type,
        "date": r.date.isoformat(),
        "topics": [{"id": t.id, "name": t.name} for t in r.topics]
    } for r in resources])

@admin_bp.route("/admin/resources/<resource_id>", methods=["PUT"])
@admin_required
def update_resource(resource_id):
    resource = db.session.get(Resource, resource_id)
    if not resource:
        return jsonify({"error": "Not found"}), 404
        
    data = request.json
    if "title" in data:
        resource.title = data["title"]
    if "date" in data:
        try:
            dt = datetime.fromisoformat(data["date"].replace('Z', '+00:00'))
            resource.date = dt
        except Exception as e:
            pass
            
    if "topics" in data:
        topic_ids = data["topics"]
        resource.topics = Topic.query.filter(Topic.id.in_(topic_ids)).all()
        
    db.session.commit()
    return jsonify({"success": True})

@admin_bp.route("/admin/resources/<resource_id>", methods=["DELETE"])
@admin_required
def delete_resource(resource_id):
    resource = db.session.get(Resource, resource_id)
    if not resource:
        return jsonify({"error": "Not found"}), 404
    
    db.session.delete(resource)
    db.session.commit()
    return jsonify({"success": True})

@admin_bp.route("/admin/topics", methods=["POST"])
@admin_required
def create_topic():
    data = request.json
    name = data.get("name")
    desc = data.get("description", "")
    
    if not name:
        return jsonify({"error": "Name is required"}), 400
        
    topic = Topic(name=name, description=desc)
    db.session.add(topic)
    db.session.commit()
    
    return jsonify({"success": True, "topic_id": topic.id})

@admin_bp.route("/admin/stats", methods=["GET"])
@admin_required
def get_stats():
    from models import Discussion, User
    total_resources = Resource.query.count()
    total_topics = Topic.query.count()
    total_discussions = Discussion.query.count()
    total_users = User.query.count()
    
    return jsonify({
        "total_resources": total_resources,
        "total_topics": total_topics,
        "total_discussions": total_discussions,
        "total_users": total_users
    })
