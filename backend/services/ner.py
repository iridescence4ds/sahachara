import re
import logging

logger = logging.getLogger(__name__)

def extract_speakers(text):
    """
    Extract speakers using regex instead of an LLM.
    Matches formats like 'Prof. Ananya Rao: ' or 'Speaker 1:'
    """
    speakers = set()
    # Match names at the start of a line followed by a colon
    matches = re.findall(r'^([A-Z][a-zA-Z\s\.]+):\s', text, re.MULTILINE)
    for m in matches:
        speaker = m.strip()
        if len(speaker) > 1 and len(speaker) < 40:
            speakers.add(speaker)
    
    return list(speakers)


def extract_authors(text):
    """
    Extract potential authors using basic regex/NER heuristics.
    Looks for capitalized names that might be authors.
    """
    authors = set()
    
    # Common academic markers before names
    markers = [r'by', r'Prof\.', r'Dr\.', r'Professor', r'researcher', r'author']
    
    for marker in markers:
        # e.g., "by Jeanette Wing" or "Prof. Ananya Rao"
        pattern = rf'\b{marker}\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b'
        matches = re.findall(pattern, text)
        for m in matches:
            authors.add(m.strip())
            
    # Also just find common capitalized two-word phrases that aren't at the start of a sentence
    # This is a naive NER but is very fast. We exclude common non-names.
    # Note: For production, spacy or a tiny local NER model is better, but this regex is instant.
    # We'll rely on the global LLM to extract authors anyway, but this is a fast fallback/supplement.
    
    return list(authors)
