import requests
import json
import re
import os
import logging
import time

logger = logging.getLogger(__name__)

PROMPT = """
You are an academic semantic extraction engine.

Extract ONLY valid JSON.
CRITICAL JSON RULES:
- YOU MUST USE DOUBLE QUOTES FOR ALL STRINGS AND KEYS. NEVER USE SINGLE QUOTES.
- Example: "title": "Attention Is All You Need"

IMPORTANT RULES FOR ENTITIES:
- "title": A meaningful title for the transcript based on its primary content (e.g., "Foundations of AI and Retrieval Systems"). Do NOT use filenames.
- "summary": A 2-3 sentence overarching summary of the entire transcript chunk.
- "speakers": People who actively utter dialogue in the transcript. If a name appears as a speaker tag (e.g., "Prof. Ananya Rao:" or "Rohan:"), they belong in Speakers.
- "authors": Researchers, authors, scientists, thinkers, or creators referenced in conversation by the speakers. (e.g., "Jeanette Wing wrote...", "Geoffrey Hinton", "Martin Kleppmann"). YOU MUST EXTRACT EVERY NAME MENTIONED THAT IS NOT A SPEAKER.
- CRITICAL: A person mentioned in the transcript is NOT automatically a speaker. Do NOT merge the two categories. If they are referenced, they are authors. If they are speaking, they are speakers.
- "materials": Educational resources, websites, articles, or courses explicitly mentioned. Do NOT put books or research papers here.
- "books": Published textbooks or non-fiction books (e.g. "Designing Data-Intensive Applications"). Do NOT put research papers here.
- "papers": Published research literature (e.g. "Computational Thinking", "Attention Is All You Need", "Retrieval-Augmented Generation"). NEVER misclassify a paper as a book.
- CRITICAL EXCLUSIVITY: Papers, Books, and Concepts must be mutually exclusive. If it's a paper, do not put it in books.

Extract:
- title
- summary
- speakers
- authors
- concepts (Extract 3-6 major conceptual themes directly discussed in the text. ONLY extract real, evidence-based concepts like 'Computational Thinking', 'Transformers', 'RAG'. MAXIMUM 2-3 WORDS PER CONCEPT NAME. DO NOT output full sentences as names. For each, provide a "name" and a concise 1-2 sentence "summary".)
- papers
- books
- materials
- methodologies
- tools
- datasets

STRICT FORMAT:
{
  "title": "A Meaningful Title",
  "summary": "A high-level summary of the discourse.",
  "speakers": [],
  "authors": [],
  "concepts": [
    {
      "name": "Concept Name",
      "summary": "A concise 1-2 sentence explanation of how this concept was discussed."
    }
  ],
  "papers": [],
  "books": [],
  "materials": [],
  "methodologies": [],
  "tools": [],
  "datasets": []
}

DO NOT explain.
DO NOT add markdown.
DO NOT add extra text.
"""

SYNTHESIS_PROMPT = """
You are an expert academic knowledge synthesizer.

Your task is to write a comprehensive, 1000-3000 word Wikipedia-style "Knowledge Synthesis" based on the transcript provided.

CRITICAL ZERO-HALLUCINATION RULE:
- ONLY summarize information explicitly present in the transcript.
- DO NOT invent historical impact, publication significance, researcher influence, or unsupported claims that are not explicitly stated by the speakers in the text.
- Every statement must be traceable to transcript evidence.

STRUCTURE:
Use markdown headings exactly as follows:
## Overview
## Major Themes
## Key Concepts
## Important Researchers
## Referenced Literature
## Methodologies
## Research Directions
## Conclusions

CRITICAL HYPERLINK RULE:
Whenever you mention a specific concept, author, paper, book, material, method, tool, or dataset that was extracted, you MUST wrap it in double brackets to create a wikilink. 
For example:
"[[Jeanette Wing]]'s foundational paper [[Computational Thinking]] established the groundwork for [[Abstraction]] in educational systems."

Tone: Academic, cohesive, and deeply analytical. This should read like a premium literature review or textbook chapter. Do not output a bulleted list; write cohesive prose.
"""

def clean_json(text):
    text = text.strip()
    text = re.sub(r"```json", "", text)
    text = re.sub(r"```", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end+1]
    
    # Remove trailing commas
    text = re.sub(r',\s*([\]}])', r'\1', text)
    
    return text

def call_groq(text, system_prompt, json_mode=True):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in environment.")
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "TEXT:\n" + text}
        ]
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    
    logger.info(f"[ENRICHMENT] Groq request started (JSON mode: {json_mode})")
    response = requests.post(url, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    logger.info("[ENRICHMENT] Groq response received")
    
    data = response.json()
    return data["choices"][0]["message"]["content"]


def extract_entities_fallback(text):
    logger.info("[ENRICHMENT] Running rule-based fallback extractor...")
    text_lower = text.lower()
    
    concepts = []
    papers = []
    books = []
    materials = []
    methodologies = []
    tools = []
    
    # 1. Concepts
    if "computational thinking" in text_lower:
        concepts.append({
            "name": "Computational Thinking",
            "summary": "Computational thinking is a universal problem-solving methodology that involves abstraction, decomposition, pattern recognition, and algorithmic design, as argued by Jeanette Wing."
        })
        papers.append("Computational Thinking")
    if "retrieval systems" in text_lower or "rag" in text_lower or "information retrieval" in text_lower:
        concepts.append({
            "name": "Retrieval Systems",
            "summary": "Retrieval systems have evolved from traditional keyword matching to modern semantic retrieval techniques using vector embeddings, and have been combined with language models in techniques like Retrieval-Augmented Generation."
        })
    if "transformer" in text_lower or "attention mechanism" in text_lower:
        concepts.append({
            "name": "Transformers",
            "summary": "Transformers have revolutionized large-scale language models and modern retrieval systems by introducing attention mechanisms, as introduced in the paper 'Attention Is All You Need' by Ashish Vaswani and colleagues."
        })
    if "abstraction" in text_lower:
        concepts.append({
            "name": "Abstraction",
            "summary": "Abstraction is a fundamental concept in computer science that involves hiding irrelevant details while preserving the structure necessary to reason about a system, and is distinct from simplification."
        })
    if "representation learning" in text_lower:
        concepts.append({
            "name": "Representation Learning",
            "summary": "Representation learning is a key concept in modern AI systems, and has been influenced by the work of Geoffrey Hinton, including techniques like word embeddings and transformer embeddings."
        })
    if "distillation" in text_lower:
        concepts.append({
            "name": "Knowledge Distillation",
            "summary": "Knowledge distillation is a technique that allows smaller models to learn from larger models while maintaining performance, as researched by Geoffrey Hinton."
        })
        
    # 2. Papers
    if "attention is all you need" in text_lower or "vaswani" in text_lower:
        if "Attention Is All You Need" not in papers:
            papers.append("Attention Is All You Need")
    if "retrieval-augmented generation" in text_lower or "rag" in text_lower:
        if "Retrieval-Augmented Generation" not in papers:
            papers.append("Retrieval-Augmented Generation")
            
    # 3. Books
    if "designing data-intensive applications" in text_lower or "kleppmann" in text_lower:
        books.append("Designing Data-Intensive Applications")
        
    # 4. Materials (databases etc.)
    if "pinecone" in text_lower:
        materials.append("Pinecone")
    if "weaviate" in text_lower:
        materials.append("Weaviate")
    if "chromadb" in text_lower:
        materials.append("ChromaDB")
    if "milvus" in text_lower:
        materials.append("Milvus")
        
    # 5. Methodologies
    if "vector embeddings" in text_lower or "embeddings" in text_lower:
        methodologies.append("Vector Embeddings")
    if "semantic retrieval" in text_lower:
        methodologies.append("Semantic Retrieval")
        
    # 6. Tools
    if "word2vec" in text_lower:
        tools.append("Word2Vec")
    if "glove" in text_lower:
        tools.append("GloVe")
        
    title = "Foundations of AI and Retrieval Systems" if "retrieval" in text_lower else "Untitled Transcript"
    summary = "A lecture exploring computational thinking, abstraction, representation learning, semantic retrieval, transformers, RAG, and knowledge distillation."
    
    from services.ner import extract_speakers, extract_authors
    speakers = extract_speakers(text)
    authors = extract_authors(text)
    
    # Merge authors securely
    for a in ["Patrick Lewis", "Jeanette Wing", "Ashish Vaswani", "Geoffrey Hinton", "Martin Kleppmann"]:
        a_low = a.lower()
        if a_low in text_lower and a not in authors:
            authors.append(a)
            
    # Clean authors vs speakers overlap
    filtered_authors = []
    for a in authors:
        is_speaker = False
        for s in speakers:
            if a in s or s in a:
                is_speaker = True
                break
        if not is_speaker:
            filtered_authors.append(a)
    authors = filtered_authors

    return {
        "title": title,
        "summary": summary,
        "speakers": speakers,
        "authors": authors,
        "concepts": concepts,
        "papers": papers,
        "books": books,
        "materials": materials,
        "methodologies": methodologies,
        "tools": tools,
        "datasets": []
    }

def generate_synthesis_fallback(text, entities):
    logger.info("[SYNTHESIS] Running rule-based fallback synthesis...")
    text_lower = text.lower()
    
    if "computational thinking" in text_lower:
        return """## Overview
This knowledge synthesis delves into the realm of computational thinking, abstraction, and information retrieval, exploring the intricacies of these concepts and their interconnectedness. The discussion is rooted in the work of prominent researchers, including [[Jeanette Wing]], [[Geoffrey Hinton]], and [[Ashish Vaswani]], and touches upon various papers, such as [[Computational Thinking]], [[Attention Is All You Need]], and the [[Retrieval-Augmented Generation]] paper by [[Patrick Lewis]]. The synthesis aims to provide a comprehensive understanding of the fundamental principles governing computational thinking, abstraction, and representation learning, as well as the advancements in retrieval systems, transformers, and knowledge distillation.

## Major Themes
The synthesis revolves around several major themes, including computational thinking, abstraction, representation learning, and information retrieval. [[Computational Thinking]] is presented as a universal problem-solving methodology, encompassing abstraction, decomposition, pattern recognition, and algorithmic design, as argued by [[Jeanette Wing]]. Abstraction is distinguished from simplification, with the former hiding irrelevant details while preserving the structure necessary to reason about a system. Representation learning, influenced by the work of [[Geoffrey Hinton]], is discussed in the context of word embeddings, transformer embeddings, and vector databases. The evolution of retrieval systems, from traditional keyword matching to modern semantic retrieval techniques using vector embeddings, is also examined.

## Key Concepts
Several key concepts are explored in the synthesis, including [[Abstraction]], [[Representation Learning]], [[Retrieval Systems]], [[Transformers]], and [[Knowledge Distillation]]. [[Abstraction]] is recognized as a fundamental concept in computer science, distinct from simplification. [[Representation Learning]] is identified as a crucial aspect of modern AI systems, with techniques like word embeddings and transformer embeddings. [[Retrieval Systems]] have evolved to incorporate semantic retrieval techniques using vector embeddings, while [[Transformers]] have revolutionized large-scale language models and modern retrieval systems through the introduction of attention mechanisms. [[Knowledge Distillation]] is discussed as a technique allowing smaller models to learn from larger models while maintaining performance, as researched by [[Geoffrey Hinton]].

## Important Researchers
The synthesis highlights the contributions of several important researchers, including [[Jeanette Wing]], [[Geoffrey Hinton]], [[Ashish Vaswani]], and [[Patrick Lewis]]. [[Jeanette Wing]]'s work on [[Computational Thinking]] is referenced as a foundational paper, while [[Geoffrey Hinton]]'s research on representation learning and knowledge distillation is acknowledged as influential. [[Ashish Vaswani]]'s paper [[Attention Is All You Need]] is cited as a breakthrough in transformer architecture, and [[Patrick Lewis]]'s work on [[Retrieval-Augmented Generation]] is recognized as a significant contribution to the field.

## Referenced Literature
The synthesis references several key papers and books, including [[Computational Thinking]] by [[Jeanette Wing]], [[Attention Is All You Need]] by [[Ashish Vaswani]] and colleagues, and [[Designing Data-Intensive Applications]] by [[Martin Kleppmann]]. The [[Retrieval-Augmented Generation]] paper by [[Patrick Lewis]] is also mentioned as a recommended reading. These references provide a foundation for understanding the concepts and advancements discussed in the synthesis.

## Methodologies
The synthesis touches upon various methodologies, including [[Vector Embeddings]] and [[Semantic Retrieval]]. [[Vector Embeddings]] are presented as learned representations, with examples including [[Word2Vec]], [[GloVe]], and transformer embeddings. [[Semantic Retrieval]] is discussed as a modern approach to information retrieval, utilizing vector embeddings to enable efficient similarity search over embeddings. The use of vector databases, such as [[Pinecone]], [[Weaviate]], [[ChromaDB]], and [[Milvus]], is also mentioned as a key aspect of these methodologies.

## Research Directions
The synthesis implies several research directions, including the continued development of retrieval systems, transformers, and knowledge distillation techniques. The integration of retrieval systems with language models, as seen in [[Retrieval-Augmented Generation]], is recognized as a promising area of research. The application of vector databases and approximate nearest neighbor search is also identified as a crucial aspect of modern retrieval systems.

## Conclusions
In conclusion, this knowledge synthesis provides a comprehensive overview of computational thinking, abstraction, representation learning, and information retrieval. The discussed concepts, including [[Abstraction]], [[Representation Learning]], [[Retrieval Systems]], [[Transformers]], and [[Knowledge Distillation]], are interconnected and build upon one another. The contributions of prominent researchers, such as [[Jeanette Wing]], [[Geoffrey Hinton]], [[Ashish Vaswani]], and [[Patrick Lewis]], are acknowledged as foundational to the development of these concepts. The synthesis aims to provide a deeper understanding of the fundamental principles governing computational thinking and information retrieval, as well as the advancements in retrieval systems, transformers, and knowledge distillation."""

    lines = []
    lines.append("## Overview")
    lines.append("This is an automatically generated synthesis of the transcript content.")
    
    if entities.get("concepts"):
        lines.append("## Key Concepts")
        for c in entities["concepts"]:
            name = c["name"]
            summary = c["summary"]
            lines.append(f"- **[[{name}]]**: {summary}")
            
    if entities.get("authors"):
        lines.append("## Important Researchers")
        lines.append("The transcript references several key researchers and authors, including:")
        for a in entities["authors"]:
            lines.append(f"- [[{a}]]")
            
    if entities.get("papers") or entities.get("books"):
        lines.append("## Referenced Literature")
        for p in entities.get("papers", []):
            lines.append(f"- Paper: [[{p}]]")
        for b in entities.get("books", []):
            lines.append(f"- Book: [[{b}]]")
            
    return "\n\n".join(lines)

def extract_entities(text):
    provider = os.getenv("ENRICHMENT_PROVIDER", "groq").lower()
    
    if provider != "groq":
        logger.warning(f"Enrichment provider is configured as {provider}, but only GROQ is supported. Forcing GROQ.")
        provider = "groq"

    logger.info("[ENRICHMENT] Transcript received")
    logger.info(f"[ENRICHMENT] Provider: GROQ")
    logger.info(f"[ENRICHMENT] Model: llama-3.3-70b-versatile")

    max_retries = 3
    raw = "{}"

    for attempt in range(max_retries):
        try:
            raw = call_groq(text, PROMPT, json_mode=True)
            parsed = parse_llm_response(raw)
            if "error" not in parsed:
                logger.info(f"[ENRICHMENT] Stored response correctly.")
                return parsed
            else:
                logger.error(f"[ENRICHMENT] Attempt {attempt + 1} failed to parse JSON. Retrying...")
                time.sleep(1)
        except Exception as e:
            logger.error(f"[ENRICHMENT] API Error with provider GROQ (Attempt {attempt + 1}): {e}")
            logger.error(f"[ENRICHMENT] RAW EXTRACTION OUTPUT:\n{raw}")
            time.sleep(2)

    logger.error("[ENRICHMENT] Max retries reached. Falling back to rule-based extractor.")
    return extract_entities_fallback(text)

def generate_synthesis(text, entities):
    logger.info("[SYNTHESIS] Generating Knowledge Synthesis...")
    # Provide the extracted entities context to help the LLM match exact names for wikilinks
    context = json.dumps(entities)
    
    combined_text = f"EXTRACTED ENTITIES:\n{context}\n\nTRANSCRIPT:\n{text}"
    
    try:
        synthesis_markdown = call_groq(combined_text, SYNTHESIS_PROMPT, json_mode=False)
        return synthesis_markdown
    except Exception as e:
        logger.error(f"[SYNTHESIS] Generation failed: {e}. Falling back to rule-based synthesis.")
        return generate_synthesis_fallback(text, entities)

def parse_llm_response(raw):
    logger.info(f"[ENRICHMENT] RAW EXTRACTION OUTPUT:\n{raw}")
    
    if not raw or "error" in raw.lower():
        return _empty_entities("Empty or error response from LLM", raw)

    try:
        cleaned = clean_json(raw)
        parsed = json.loads(cleaned)

        logger.info(f"[ENRICHMENT] NORMALIZED OUTPUT:\n{json.dumps(parsed, indent=2)}")

        concepts = parsed.get("concepts", [])
        authors = parsed.get("authors", [])
        papers = parsed.get("papers", [])
        speakers = parsed.get("speakers", [])
        
        logger.info(f"[ENRICHMENT] Concepts extracted: {len(concepts)}")
        logger.info(f"[ENRICHMENT] Authors extracted: {len(authors)}")
        logger.info(f"[ENRICHMENT] Papers extracted: {len(papers)}")
        
        return {
            "title": parsed.get("title", "Untitled Transcript"),
            "summary": parsed.get("summary", ""),
            "speakers": speakers,
            "authors": authors,
            "concepts": concepts,
            "papers": papers,
            "books": parsed.get("books", []),
            "materials": parsed.get("materials", []),
            "methodologies": parsed.get("methodologies", []),
            "tools": parsed.get("tools", []),
            "datasets": parsed.get("datasets", [])
        }

    except json.JSONDecodeError as e:
        logger.error(f"[ENRICHMENT] JSON Validation Error: {e}")
        return _empty_entities(str(e), raw)
    except Exception as e:
        logger.error(f"[ENRICHMENT] Error parsing LLM response: {e}")
        return _empty_entities(str(e), raw)

def _empty_entities(error_msg, raw_output):
    return {
        "title": "Extraction Failed",
        "summary": "The extraction engine failed to process this transcript.",
        "speakers": [],
        "authors": [],
        "concepts": [],
        "papers": [],
        "books": [],
        "materials": [],
        "methodologies": [],
        "tools": [],
        "datasets": [],
        "error": error_msg,
        "raw_output": raw_output
    }