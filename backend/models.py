from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    role = db.Column(db.String(20), default="USER") # "ADMIN" or "USER"
    comments = db.relationship('Comment', backref='user', lazy=True)

resource_topic_link = db.Table('resource_topic',
    db.Column('resource_id', db.String(100), db.ForeignKey('resource.id'), primary_key=True),
    db.Column('topic_id', db.Integer, db.ForeignKey('topic.id'), primary_key=True)
)

class Topic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    resources = db.relationship('Resource', secondary=resource_topic_link, back_populates='topics')
    discussion = db.relationship('Discussion', backref='topic', uselist=False, lazy=True)

class Resource(db.Model):
    id = db.Column(db.String(100), primary_key=True) 
    type = db.Column(db.String(50), nullable=False, default="Transcript")
    title = db.Column(db.String(250), nullable=False)
    filename = db.Column(db.String(250), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow) 
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    uploader_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    topics = db.relationship('Topic', secondary=resource_topic_link, back_populates='resources')

class Discussion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('topic.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    comments = db.relationship('Comment', backref='discussion', lazy=True)

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    discussion_id = db.Column(db.Integer, db.ForeignKey('discussion.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('comment.id'), nullable=True) 
    upvotes = db.Column(db.Integer, default=0)
    is_pinned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]))
