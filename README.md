# Sahachara

> Transform transcripts, lectures, discussions, and long-form educational content into an explorable knowledge experience.

Sahachara is an AI-powered Knowledge Explorer that converts raw transcripts into structured knowledge. Instead of scrolling through hours of conversation, users can discover concepts, topics, entities, resources, and discussions through an interactive exploration workflow.

---

## Vision

Educational content is often trapped inside recordings, transcripts, PDFs, and discussions.

Sahachara aims to make knowledge discoverable by automatically extracting structure from unstructured content and presenting it through searchable topics, entities, resources, and contextual exploration tools.

---

## Core Features

### Transcript Ingestion

* Upload transcript files (`.vtt`, `.txt`)
* Automatic parsing and chunking
* Session-aware knowledge organization
* Library auto-updates after ingestion

### Knowledge Extraction

* Concept extraction
* Topic identification
* Entity recognition
* Resource linking
* Structured metadata generation

### Search & Discovery

* Semantic search
* Entity search
* Topic-based navigation
* Resource exploration
* Context-aware retrieval

### Knowledge Workspace

* Explore transcript chunks
* Navigate related concepts
* Discover linked resources
* Follow topic relationships
* Review extracted entities

### Library Management

* Centralized knowledge repository
* Session-based organization
* Searchable content archive
* Resource indexing

### Admin Dashboard

* Content management
* Upload workflows
* Session administration
* Knowledge curation

---

## Platform Architecture

```text
Transcript Upload
        │
        ▼
 Transcript Parser
        │
        ▼
 Knowledge Extraction
        │
 ┌──────┼──────┐
 ▼      ▼      ▼
Topics Entities Resources
 │       │       │
 └───────┼───────┘
         ▼
 Knowledge Store
         │
 ┌───────┼────────┐
 ▼       ▼        ▼
Search  Library  Explorer
```

---

## Technology Stack

### Frontend

* React
* Vite
* Context API
* Modern Component Architecture

### Backend

* Flask
* Python
* REST APIs

### AI & Knowledge Layer

* Groq
* NLP Pipelines
* Entity Extraction
* Semantic Retrieval

### Storage

* Structured Knowledge Store
* Transcript Repository
* Resource Indexing

---

## Project Structure

```text
sahachara/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── app.py
│   ├── models.py
│   └── migrate_db.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── pages/
│   └── vite.config.js
│
├── package.json
└── README.md
```

---

## Current Capabilities (V2.0)

* Transcript upload pipeline
* Knowledge extraction workflow
* Topic exploration
* Entity discovery
* Semantic search
* Resource workspace
* Knowledge library
* Administrative dashboard
* Multi-view content exploration

---

## Getting Started

### Clone Repository

```bash
git clone https://github.com/iridescence4ds/sahachara.git
cd sahachara
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Roadmap

### V2.0

* Knowledge explorer
* Transcript ingestion
* Entity extraction
* Topic navigation
* Semantic retrieval
* Resource workspace

### V3.0

* Docker support
* Docker Compose
* Improved retrieval pipeline
* Enhanced knowledge graphing
* Better workspace experiences

### V4.0

* CI/CD pipelines
* Nginx deployment
* Kubernetes support
* Scalable production architecture

---

## Mission

Sahachara is built around a simple idea:

> Knowledge should be explored, not searched for.
>
> Every transcript, lecture, discussion, and document should become a living knowledge space rather than a static block of text.
