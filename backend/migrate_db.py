import os
import json
from datetime import datetime
from app import app
from models import db, User, Topic, Resource, Discussion

LIBRARY_FOLDER = "library"

def migrate():
    with app.app_context():
        db.create_all()
        
        # Create default users if they don't exist
        if not User.query.filter_by(username="admin").first():
            admin = User(username="admin", role="ADMIN")
            db.session.add(admin)
        if not User.query.filter_by(username="student").first():
            student = User(username="student", role="USER")
            db.session.add(student)
            
        db.session.commit()
        admin_user = User.query.filter_by(username="admin").first()

        # Migrate library files
        if os.path.exists(LIBRARY_FOLDER):
            for file in os.listdir(LIBRARY_FOLDER):
                if not file.endswith('.json'): continue
                
                resource_id = file.replace('.json', '')
                if Resource.query.get(resource_id):
                    continue
                    
                path = os.path.join(LIBRARY_FOLDER, file)
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                title = data.get("global_entities", {}).get("title", data.get("filename", "Untitled Transcript"))
                
                try:
                    date_val = data.get("date")
                    if date_val:
                        dt = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                    else:
                        dt = datetime.fromtimestamp(os.path.getmtime(path))
                except:
                    dt = datetime.utcnow()
                    
                res = Resource(
                    id=resource_id,
                    type="Transcript",
                    title=title,
                    filename=data.get("filename", "Unknown"),
                    date=dt,
                    uploader_id=admin_user.id
                )
                
                if data.get("global_entities"):
                    c_list = data["global_entities"].get("concepts", []) or data["global_entities"].get("topics", [])
                    for c in c_list:
                        name = c.get("name", c) if isinstance(c, dict) else c
                        topic = Topic.query.filter_by(name=name).first()
                        if not topic:
                            topic = Topic(name=name)
                            db.session.add(topic)
                            db.session.flush() # get topic.id
                            # Auto-create discussion for new topic
                            discussion = Discussion(topic_id=topic.id)
                            db.session.add(discussion)
                        res.topics.append(topic)
                        
                db.session.add(res)
                
        db.session.commit()
        print("Database migration complete.")

if __name__ == "__main__":
    migrate()
