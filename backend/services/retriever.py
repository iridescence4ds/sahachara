import requests
import logging

logger = logging.getLogger(__name__)

BLOCKED_CONCEPTS = [

    "framework like langchain",
    "notes app",
    "educational operating system",
    "abstraction-first teaching",
    "chunking",
    "provenance",
    "retrieval systems",

]

MIN_LENGTH = 5


def is_valid_academic_query(concept):

    if not concept:
        return False

    concept_str = concept.get("name", "") if isinstance(concept, dict) else str(concept)
    concept_str = concept_str.strip().lower()

    if len(concept_str) < MIN_LENGTH:
        return False

    if concept_str in BLOCKED_CONCEPTS:
        return False

    return True


def search_semantic_scholar(query):

    url = (
        "https://api.semanticscholar.org/graph/v1/paper/search"
        f"?query={query}"
        "&limit=5"
        "&limit=5"
        "&fields=title,year,url,abstract,authors,externalIds,openAccessPdf"
    )

    logger.info(f"Querying Semantic Scholar for concept: {query}")
    try:
        response = requests.get(url)
    except Exception as e:
        logger.error(f"Semantic Scholar connection error: {e}")
        return []

    if response.status_code != 200:
        logger.warning(f"Semantic Scholar returned status {response.status_code} for query: {query}")
        return []

    data = response.json()
    papers = []


    for paper in data.get("data", []):

        papers.append({

            "title": paper.get("title"),

            "year": paper.get("year"),

            "abstract": paper.get("abstract"),

            "semanticScholarUrl": paper.get("url"),

            "openAccessPdf":
                paper.get("openAccessPdf", {}).get("url")
                if paper.get("openAccessPdf")
                else None,

            "doi":
                paper.get("externalIds", {}).get("DOI"),

            "arxiv":
                paper.get("externalIds", {}).get("ArXiv")

        })

    return papers


def retrieve_resources(entities):

    logger.info("Starting resource retrieval for extracted entities...")
    resources = []
    concepts = entities.get("concepts", [])

    valid_concepts = []
    for c in concepts:
        c_str = c.get("name", "") if isinstance(c, dict) else str(c)
        if is_valid_academic_query(c_str):
            valid_concepts.append(c_str)
    
    if not valid_concepts:
        return resources

    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_concept = {executor.submit(search_semantic_scholar, concept): concept for concept in valid_concepts}
        for future in concurrent.futures.as_completed(future_to_concept):
            concept = future_to_concept[future]
            try:
                papers = future.result()
                if papers:
                    resources.append({
                        "concept": concept,
                        "papers": papers
                    })
            except Exception as e:
                logger.error(f"Concurrent retrieval error for {concept}: {e}")

    logger.info(f"Retrieved {len(resources)} resources successfully.")
    return resources