import os
from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(level=logging.INFO)

from flask import Flask
from flask_cors import CORS
from models import db
from routes.upload import upload_bp
from routes.library import library_bp
from routes.auth import auth_bp
from routes.topics import topics_bp
from routes.admin import admin_bp
from routes.search import search_bp
import os

app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'sahachara.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

provider = os.getenv("ENRICHMENT_PROVIDER", "unknown").upper()
logging.info(f"Using enrichment provider: {provider}")

if provider == "GROQ" and not os.getenv("GROQ_API_KEY"):
    logging.error("CONFIGURATION ERROR: GROQ_API_KEY is missing from environment. Failing loudly.")
    import sys
    sys.exit(1)

app.register_blueprint(upload_bp)
app.register_blueprint(library_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(topics_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(search_bp)

@app.route("/")
def home():
    return {"status": "Instructor Intelligence Engine Running"}

@app.route("/uploads/assets/<path:filename>")
def serve_assets(filename):
    from flask import send_from_directory
    import os
    assets_dir = os.path.join(app.root_path, 'uploads', 'assets')
    return send_from_directory(assets_dir, filename)

if __name__ == "__main__":
    app.run(debug=True, port=4000)