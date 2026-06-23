from flask import Blueprint, jsonify, request
from models import Topic, Comment, Resource
from sqlalchemy import or_

search_bp = Blueprint("search", __name__)

@search_bp.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "").lower()
    if not query:
        return jsonify({"topics": [], "resources": [], "comments": []})
        
    term = f"%{query}%"
    
    topics = Topic.query.filter(or_(Topic.name.ilike(term), Topic.description.ilike(term))).limit(10).all()
    resources = Resource.query.filter(or_(Resource.title.ilike(term), Resource.type.ilike(term))).limit(10).all()
    comments = Comment.query.filter(Comment.content.ilike(term)).limit(10).all()
    
    return jsonify({
        "topics": [{"id": t.id, "name": t.name} for t in topics],
        "resources": [{"id": r.id, "title": r.title, "type": r.type} for r in resources],
        "comments": [{"id": c.id, "content": c.content[:100] + "...", "topic_id": c.discussion.topic_id if c.discussion else None} for c in comments]
    })
