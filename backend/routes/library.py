from flask import Blueprint, jsonify, request
import os
import json
import logging
from datetime import datetime
from services.parser import parse_file
from models import db, Resource, Topic, Discussion

logger = logging.getLogger(__name__)

library_bp = Blueprint("library", __name__)

LIBRARY_FOLDER = "library"
os.makedirs(LIBRARY_FOLDER, exist_ok=True)

from models import Resource

@library_bp.route("/library", methods=["GET"])
def get_library():
    """List all artifacts in the library."""
    try:
        resources = Resource.query.order_by(Resource.date.desc()).all()
        artifacts = []
        for r in resources:
            artifacts.append({
                "id": r.id,
                "filename": r.filename,
                "title": r.title,
                "date": r.date.isoformat(),
                "type": r.type,
                "topics": [t.name for t in r.topics]
            })
        return jsonify(artifacts)
    except Exception as e:
        logger.error(f"Error fetching library: {e}")
        return jsonify({"error": str(e)}), 500

@library_bp.route("/library/<artifact_id>", methods=["GET"])
def get_artifact(artifact_id):
    """Get a specific artifact by ID."""
    try:
        path = os.path.join(LIBRARY_FOLDER, f"{artifact_id}.json")
        if not os.path.exists(path):
            return jsonify({"error": "Artifact not found"}), 404
            
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error fetching artifact {artifact_id}: {e}")
        return jsonify({"error": str(e)}), 500

@library_bp.route("/library/<artifact_id>/rechunk", methods=["POST"])
def rechunk_artifact(artifact_id):
    """Rechunk the original transcript for a given artifact and remap concepts."""
    try:
        path = os.path.join(LIBRARY_FOLDER, f"{artifact_id}.json")
        if not os.path.exists(path):
            return jsonify({"error": "Artifact not found"}), 404

        body = request.get_json() or {}
        chunk_minutes = int(body.get("chunk_minutes", 15))

        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        filename = data.get("filename")
        upload_path = os.path.join("uploads", filename)
        if not os.path.exists(upload_path):
            return jsonify({"error": "Original transcript not found on disk."}), 404

        # Re-parse raw file
        chunks = parse_file(upload_path, chunk_minutes=chunk_minutes)
        global_entities = data.get("global_entities", {})
        
        # Preserve old resources from the first chunk
        old_resources = []
        if data.get("results") and len(data["results"]) > 0:
            old_resources = data["results"][0].get("resources", [])

        processed_chunks = []
        for i, chunk in enumerate(chunks):
            mapped_concepts = []
            chunk_text = chunk["content"].lower()
            for c in global_entities.get("concepts", []):
                concept_name = c["name"] if isinstance(c, dict) else c
                if concept_name.lower() in chunk_text:
                    mapped_concepts.append(c)
            chunk["concepts"] = mapped_concepts

            processed_chunks.append({
                "chunk": chunk,
                "entities": global_entities,
                "resources": old_resources if i == 0 else []
            })

        data["results"] = processed_chunks
        data["chunks_processed"] = len(chunks)

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        return jsonify(data)
    except Exception as e:
        logger.error(f"Error rechunking artifact {artifact_id}: {e}")
        return jsonify({"error": str(e)}), 500
def save_to_library(filename, chunks_processed, processed_chunks, metrics, global_entities):
    """Helper to save a new extraction to the library."""
    try:
        artifact_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename.replace('.txt', '').replace('.vtt', '')}"
        path = os.path.join(LIBRARY_FOLDER, f"{artifact_id}.json")
        
        data = {
            "id": artifact_id,
            "filename": filename,
            "date": datetime.now().isoformat(),
            "chunks_processed": chunks_processed,
            "results": processed_chunks,
            "metrics": metrics,
            "global_entities": global_entities
        }
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        dt = datetime.utcnow()
        title = global_entities.get("title", filename)
        
        res = Resource(
            id=artifact_id,
            type="Transcript",
            title=title,
            filename=filename,
            date=dt
        )
        
        c_list = global_entities.get("concepts", []) or global_entities.get("topics", [])
        for c in c_list:
            name = c.get("name", c) if isinstance(c, dict) else c
            topic = Topic.query.filter_by(name=name).first()
            if not topic:
                topic = Topic(name=name)
                db.session.add(topic)
                db.session.flush()
                discussion = Discussion(topic_id=topic.id)
                db.session.add(discussion)
            res.topics.append(topic)
            
        db.session.add(res)
        db.session.commit()
            
        return artifact_id
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save to library: {e}")
        return None

@library_bp.route("/library/<artifact_id>/workspace", methods=["PUT"])
def update_workspace(artifact_id):
    """Update global_entities and workspace data for an artifact."""
    try:
        path = os.path.join(LIBRARY_FOLDER, f"{artifact_id}.json")
        if not os.path.exists(path):
            return jsonify({"error": "Artifact not found"}), 404

        body = request.get_json()
        if not body:
            return jsonify({"error": "No data provided"}), 400

        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if "global_entities" in body:
            data["global_entities"] = body["global_entities"]
            
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error updating workspace for {artifact_id}: {e}")
        return jsonify({"error": str(e)}), 500

@library_bp.route("/library/<artifact_id>/assets", methods=["POST"])
def upload_asset(artifact_id):
    """Upload a media asset for a workspace."""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
            
        assets_dir = os.path.join("uploads", "assets", artifact_id)
        os.makedirs(assets_dir, exist_ok=True)
        
        # Simple secure filename
        import re
        safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file.filename)
        file_path = os.path.join(assets_dir, safe_filename)
        
        file.save(file_path)
        
        asset_url = f"http://localhost:4000/uploads/assets/{artifact_id}/{safe_filename}"
        
        return jsonify({
            "success": True,
            "filename": safe_filename,
            "url": asset_url
        })
    except Exception as e:
        logger.error(f"Error uploading asset for {artifact_id}: {e}")
        return jsonify({"error": str(e)}), 500
