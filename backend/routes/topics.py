from flask import Blueprint, jsonify, request
from models import db, Topic, Discussion, Comment, User, Resource
from routes.auth import user_required

topics_bp = Blueprint("topics", __name__)

@topics_bp.route("/topics", methods=["GET"])
def get_topics():
    topics = Topic.query.all()
    return jsonify([{"id": t.id, "name": t.name, "description": t.description} for t in topics])

@topics_bp.route("/topics/<int:topic_id>", methods=["GET"])
def get_topic(topic_id):
    topic = db.session.get(Topic, topic_id)
    if not topic:
        return jsonify({"error": "Not found"}), 404
        
    resources = [{"id": r.id, "title": r.title, "type": r.type} for r in topic.resources]
    discussion = topic.discussion
    
    comments = []
    if discussion:
        root_comments = Comment.query.filter_by(discussion_id=discussion.id, parent_id=None).order_by(Comment.created_at.desc()).all()
        for c in root_comments:
            comments.append({
                "id": c.id,
                "content": c.content,
                "user": c.user.username,
                "created_at": c.created_at.isoformat(),
                "upvotes": c.upvotes,
                "is_pinned": c.is_pinned,
                "replies": [{"id": r.id, "content": r.content, "user": r.user.username, "created_at": r.created_at.isoformat()} for r in c.replies]
            })

    return jsonify({
        "id": topic.id,
        "name": topic.name,
        "description": topic.description,
        "resources": resources,
        "discussion": {
            "id": discussion.id if discussion else None,
            "comments": comments
        }
    })

@topics_bp.route("/topics/<int:topic_id>/discussion/comments", methods=["POST"])
@user_required
def add_comment(topic_id):
    data = request.json
    content = data.get("content")
    parent_id = data.get("parent_id")
    
    token = request.headers.get("X-Auth-Token", "")
    username = "admin" if token.startswith("admin") else "student"
    user = User.query.filter_by(username=username).first()
    
    topic = db.session.get(Topic, topic_id)
    if not topic.discussion:
        topic.discussion = Discussion(topic_id=topic.id)
        db.session.add(topic.discussion)
        db.session.flush()
        
    comment = Comment(
        discussion_id=topic.discussion.id,
        user_id=user.id,
        content=content,
        parent_id=parent_id
    )
    db.session.add(comment)
    db.session.commit()
    
    return jsonify({"success": True, "comment_id": comment.id})
