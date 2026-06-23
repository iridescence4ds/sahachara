import os
import logging
import re
import math

logger = logging.getLogger(__name__)

def parse_vtt_time(time_str):
    # time_str format: 00:06:15.000 or 06:15.000
    parts = time_str.split(":")
    seconds = 0
    if len(parts) == 3:
        h, m, s = parts
        seconds = int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        seconds = int(m) * 60 + float(s)
    return seconds

def format_seconds(seconds):
    m = int(seconds // 60)
    s = int(seconds % 60)
    if m >= 60:
        h = m // 60
        m = m % 60
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

def extract_speaker(line):
    # "Maya: I think abstraction..." -> "Maya"
    match = re.match(r'^([^:]+):\s*(.*)', line)
    if match:
        speaker = match.group(1).strip()
        if speaker.isdigit():
            return None
        # Avoid matching random colons in text (speakers are usually short names)
        if len(speaker) < 30 and (" " not in speaker.strip() or len(speaker.split()) <= 4):
            return speaker
    return None

def parse_txt(path, chunk_minutes=15):
    # Approximate 150 words per minute
    words_per_chunk = chunk_minutes * 150
    
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    # Split into lines to extract speakers if they exist
    lines = text.split('\n')
    chunks = []
    
    current_chunk_content = []
    current_chunk_speakers = set()
    idx = 0
    current_word_count = 0
    
    # We will simulate time based on word count (150 words/min)
    chunk_start_min = 0

    logger.info(f"Parsing .txt file: {path} with chunk_minutes={chunk_minutes} (approx {words_per_chunk} words/chunk)")

    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        sp = extract_speaker(line)
        if sp:
            current_chunk_speakers.add(sp)
            
        words = line.split()
        current_chunk_content.extend(words)
        current_word_count += len(words)
        
        if current_word_count >= words_per_chunk:
            chunk_end_min = chunk_start_min + chunk_minutes
            chunks.append({
                "chunk_index": idx,
                "startTime_str": f"{chunk_start_min:02d}:00",
                "endTime_str": f"{chunk_end_min:02d}:00",
                "speakers": list(current_chunk_speakers) if current_chunk_speakers else ["Unknown Speaker"],
                "content": " ".join(current_chunk_content),
                "concepts": []
            })
            idx += 1
            current_chunk_content = []
            current_chunk_speakers = set()
            current_word_count = 0
            chunk_start_min = chunk_end_min

    if current_chunk_content:
        chunk_end_min = chunk_start_min + max(1, int(current_word_count / 150))
        chunks.append({
            "chunk_index": idx,
            "startTime_str": f"{chunk_start_min:02d}:00",
            "endTime_str": f"{chunk_end_min:02d}:00",
            "speakers": list(current_chunk_speakers) if current_chunk_speakers else ["Unknown Speaker"],
            "content": " ".join(current_chunk_content),
            "concepts": []
        })

    logger.info(f"Successfully created {len(chunks)} chunks from .txt file")
    return chunks


def parse_vtt(path, chunk_minutes=15):
    chunk_seconds = chunk_minutes * 60
    
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    from collections import defaultdict
    chunks_map = defaultdict(lambda: {
        "content_lines": [],
        "speakers": set()
    })

    logger.info(f"Parsing .vtt file: {path} with chunk_minutes={chunk_minutes} ({chunk_seconds}s/chunk)")

    max_time = 0.0
    current_start_time = 0.0
    
    for line in lines:
        line = line.strip()
        if not line or "WEBVTT" in line or line.isdigit():
            continue
            
        if "-->" in line:
            try:
                start_str, end_str = line.split("-->")
                current_start_time = parse_vtt_time(start_str.strip())
                end_time = parse_vtt_time(end_str.strip())
                if end_time > max_time:
                    max_time = end_time
            except Exception as e:
                logger.warning(f"Failed to parse timestamp {line}: {e}")
            continue

        sp = extract_speaker(line)
        bucket_index = int(current_start_time // chunk_seconds)
        
        chunks_map[bucket_index]["content_lines"].append(line)
        if sp:
            chunks_map[bucket_index]["speakers"].add(sp)

    chunks = []
    
    logger.info("=================================")
    logger.info(f"Selected chunk size: {chunk_minutes}m")
    logger.info(f"First timestamp: {format_seconds(0.0)}")
    logger.info(f"Last timestamp: {format_seconds(max_time)}")
    logger.info(f"Parsed transcript duration: {format_seconds(max_time)}")
    logger.info("=================================")
    
    if max_time == 0.0 and len(chunks_map) == 0:
        return chunks

    num_chunks = int(max_time // chunk_seconds) + 1
    
    logger.info("Generated chunk boundaries:")
    for idx in range(num_chunks):
        start_t = idx * chunk_seconds
        end_t = (idx + 1) * chunk_seconds
        
        actual_end_t = end_t
        if idx == num_chunks - 1:
            actual_end_t = max_time

        if actual_end_t <= start_t:
            continue

        c_data = chunks_map[idx]
        
        start_str = format_seconds(start_t)
        end_str = format_seconds(actual_end_t)
        
        logger.info(f"Chunk {idx}: {start_str} -> {end_str}")

        valid_speakers = [s for s in c_data["speakers"] if s.lower() != "unknown speaker" and not s.isdigit()]
        final_speakers = list(set(valid_speakers)) if valid_speakers else ["Unknown Speaker"]

        chunks.append({
            "chunk_index": idx,
            "startTime_str": start_str,
            "endTime_str": end_str,
            "speakers": final_speakers,
            "content": " ".join(c_data["content_lines"]) if c_data["content_lines"] else "",
            "concepts": []
        })

    logger.info(f"Successfully created {len(chunks)} chunks from .vtt file")
    return chunks


def parse_file(path, chunk_minutes=15):
    ext = os.path.splitext(path)[1].lower()

    # Check if the file is actually a VTT file disguised as a .txt
    try:
        with open(path, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            if "WEBVTT" in first_line:
                ext = ".vtt"
    except Exception:
        pass

    if ext == ".txt":
        return parse_txt(path, chunk_minutes)

    if ext == ".vtt":
        return parse_vtt(path, chunk_minutes)

    raise Exception("Unsupported file type")