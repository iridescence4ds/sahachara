from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import logging
import time
import json

from services.parser import parse_file
from services.extractor import extract_entities, generate_synthesis
from services.retriever import retrieve_resources
from services.ner import extract_speakers, extract_authors
from routes.library import save_to_library

logger = logging.getLogger(__name__)


upload_bp = Blueprint("upload", __name__)

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@upload_bp.route("/upload", methods=["POST"])
def upload_transcript():
    start_total = time.time()

    if "file" not in request.files:
        logger.warning("Upload failed: No file uploaded")
        return jsonify({"error": "No file uploaded"}), 400

    chunk_minutes_str = request.form.get("chunk_minutes", "15")
    try:
        chunk_minutes = int(chunk_minutes_str)
    except ValueError:
        chunk_minutes = 15

    file = request.files["file"]
    filename = secure_filename(file.filename)
    path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(path)

    logger.info(f"==> Pipeline Started: Transcript Upload received ({filename})")

    try:
        # 1. PARSE
        parse_start = time.time()
        chunks = parse_file(path, chunk_minutes=chunk_minutes)
        parse_time = time.time() - parse_start
        logger.info(f"[INGEST] Parse time: {parse_time:.4f}s")
        
        # Combine text for global extraction
        full_text = "\n".join([c["content"] for c in chunks])

        # 2. FAST NER (Speakers)
        speaker_start = time.time()
        global_speakers = extract_speakers(full_text)
        speaker_time = time.time() - speaker_start
        logger.info(f"[INGEST] Speaker extraction time: {speaker_time:.4f}s")

        # 3. FAST NER (Authors)
        author_start = time.time()
        ner_authors = extract_authors(full_text)
        author_time = time.time() - author_start
        logger.info(f"[INGEST] Author extraction time: {author_time:.4f}s")

        # 4. LLM ENRICHMENT (Batched)
        concept_start = time.time()
        # We wrap extract_entities in a try-except so it NEVER crashes the pipeline
        global_entities = {
            "speakers": global_speakers,
            "authors": ner_authors,
            "concepts": [],
            "papers": [],
            "books": [],
            "materials": [],
            "methodologies": [],
            "tools": [],
            "datasets": [],
            "knowledge_synthesis": ""
        }
        
        resources = []
        try:
            logger.info(f"==> Batching {len(chunks)} chunks for a single LLM enrichment call.")
            # Note: The LLM will extract topics, methodologies, etc., and may find additional authors.
            llm_entities = extract_entities(full_text)
            
            # Merge LLM results with our fast NER results
            if "error" not in llm_entities:
                global_entities["concepts"] = llm_entities.get("concepts", [])
                global_entities["papers"] = llm_entities.get("papers", [])
                global_entities["books"] = llm_entities.get("books", [])
                global_entities["materials"] = llm_entities.get("materials", [])
                global_entities["methodologies"] = llm_entities.get("methodologies", [])
                global_entities["tools"] = llm_entities.get("tools", [])
                global_entities["datasets"] = llm_entities.get("datasets", [])
                
                # Merge authors safely
                llm_authors = llm_entities.get("authors", [])
                for a in llm_authors:
                    if a not in global_entities["authors"]:
                        global_entities["authors"].append(a)
            else:
                logger.error(f"LLM Enrichment returned an error and was skipped! Error details: {llm_entities.get('error')}")
                        
            # Ensure no overlap: authors cannot be speakers (unless they are explicitly cited, but for strict separation we'll remove substring overlaps)
            filtered_authors = []
            for a in global_entities["authors"]:
                is_speaker = False
                for s in global_entities["speakers"]:
                    if a in s or s in a:
                        is_speaker = True
                        break
                if not is_speaker:
                    filtered_authors.append(a)
            global_entities["authors"] = filtered_authors

            # 4.5. GENERATE SYNTHESIS
            logger.info("==> Generating Knowledge Synthesis")
            synthesis_start = time.time()
            synthesis = generate_synthesis(full_text, global_entities)
            global_entities["knowledge_synthesis"] = synthesis
            logger.info(f"[INGEST] Synthesis generation time: {time.time() - synthesis_start:.4f}s")
            
            # 5. RETRIEVAL (Semantic Scholar)
            # Retrieve resources globally based on the single batched LLM extraction
            resources = retrieve_resources(global_entities)
            
        except Exception as e:
            logger.error(f"Failed during LLM enrichment or retrieval: {e}")
            
        concept_time = time.time() - concept_start
        logger.info(f"[INGEST] Concept extraction time (LLM + Retrieval): {concept_time:.4f}s")

        # 6. ASSEMBLE RESULTS
        processed_chunks = []
        for i, chunk in enumerate(chunks):
            # Map concepts dynamically
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
                "resources": resources if i == 0 else [] 
            })

        total_time = time.time() - start_total
        logger.info(f"[INGEST] Total processing time: {total_time:.4f}s")
        # 7. SAVE TO LIBRARY
        metrics = {
            "parse_time": parse_time,
            "speaker_time": speaker_time,
            "author_time": author_time,
            "concept_time": concept_time,
            "total_time": total_time
        }
        
        # LOG 3: STORED RESPONSE
        logger.info(f"STORED RESPONSE (Global Entities):\n{json.dumps(global_entities, indent=2)}")
        
        artifact_id = save_to_library(filename, len(chunks), processed_chunks, metrics, global_entities)

        logger.info("==> Pipeline Finished: Returning results to Frontend Display")

        api_response = {
            "artifact_id": artifact_id,
            "filename": filename,
            "chunks_processed": len(chunks),
            "results": processed_chunks,
            "metrics": metrics,
            "global_entities": global_entities
        }
        
        # LOG 4: API RESPONSE
        logger.info(f"API RESPONSE:\n{json.dumps(api_response, indent=2)}")

        return jsonify(api_response)
        
    except Exception as e:
        logger.error(f"CRITICAL ERROR in pipeline: {e}", exc_info=True)
        # Never crash: Return chunks without enrichment if everything explodes
        total_time = time.time() - start_total
        logger.info(f"[INGEST] Total processing time (FAILED): {total_time:.4f}s")
        
        # If chunks weren't even parsed yet, we can't return them.
        try:
            chunks_to_return = [{"chunk": c, "entities": {}, "resources": []} for c in chunks]
        except NameError:
            chunks_to_return = []
            
        return jsonify({
            "filename": filename,
            "chunks_processed": len(chunks_to_return),
            "results": chunks_to_return,
            "error": "Pipeline failed but survived gracefully",
            "details": str(e)
        })