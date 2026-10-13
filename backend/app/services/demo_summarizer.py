import math
import re
from collections import Counter
from typing import List, Tuple
from app.models.schemas import SummaryFormat, SummaryLength

# Common English stopwords
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
    "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had",
    "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
    "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll",
    "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me",
    "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
    "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's",
    "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
    "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who",
    "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll",
    "you're", "you've", "your", "yours", "yourself", "yourselves", "also", "thus", "therefore",
    "however", "moreover", "furthermore", "including", "overall", "using", "used", "document", "text"
}


def tokenize_sentences(text: str) -> List[str]:
    """
    Splits text into coherent sentences using punctuation heuristics.
    Preserves original sentence structures without executing contained commands.
    """
    # Normalize double linebreaks to space or paragraph boundary
    cleaned = re.sub(r"\n+", " ", text)
    # Split on sentence terminals followed by whitespace and capital letter
    sentence_candidates = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(\[])", cleaned)
    
    sentences = []
    for cand in sentence_candidates:
        cand = cand.strip()
        # Filter out extremely short sentence fragments or symbols
        if len(cand) >= 15 and re.search(r"[a-zA-Z]", cand):
            sentences.append(cand)
            
    # Fallback if text lacked standard punctuation
    if not sentences and text.strip():
        lines = [line.strip() for line in text.split("\n") if len(line.strip()) >= 15]
        if lines:
            sentences = lines
        else:
            sentences = [text.strip()]
            
    return sentences


def extract_keywords(text: str, top_n: int = 6) -> List[str]:
    """
    Extracts high-salience keywords based on term frequency and non-stopword filtering.
    """
    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    filtered_words = [w for w in words if w not in STOPWORDS]
    counts = Counter(filtered_words)
    return [word.capitalize() for word, _ in counts.most_common(top_n)]


def score_sentences(sentences: List[str]) -> List[Tuple[int, str, float]]:
    """
    Scores each sentence by calculating term frequency-inverse document salience,
    positional weighting, and length penalty.
    Returns list of (index, sentence, score).
    """
    all_words = []
    for sent in sentences:
        words = re.findall(r"\b[a-zA-Z]{3,}\b", sent.lower())
        all_words.extend([w for w in words if w not in STOPWORDS])
        
    word_freq = Counter(all_words)
    max_freq = max(word_freq.values()) if word_freq else 1

    scored = []
    total_sentences = len(sentences)

    for i, sent in enumerate(sentences):
        words = re.findall(r"\b[a-zA-Z]{3,}\b", sent.lower())
        meaningful_words = [w for w in words if w not in STOPWORDS]

        if not meaningful_words:
            scored.append((i, sent, 0.0))
            continue

        # Word frequency salience
        freq_score = sum(word_freq[w] / max_freq for w in meaningful_words) / len(meaningful_words)

        # Positional boost (lead bias: early and closing sentences typically carry high information density)
        pos_boost = 1.0
        if i == 0:
            pos_boost = 1.5
        elif i < 3:
            pos_boost = 1.2
        elif i >= total_sentences - 2:
            pos_boost = 1.15

        # Length penalty: optimal sentence length between 12 and 40 words
        word_count = len(words)
        if 12 <= word_count <= 40:
            len_mult = 1.0
        elif word_count < 10:
            len_mult = 0.6
        else:
            len_mult = 0.85

        final_score = freq_score * pos_boost * len_mult
        scored.append((i, sent, final_score))

    return scored


def generate_demo_summary(
    text: str,
    length: SummaryLength = SummaryLength.MEDIUM,
    format_type: SummaryFormat = SummaryFormat.PARAGRAPH,
) -> Tuple[str, List[str], List[str]]:
    """
    Generates a localized, extractive summary adhering to the requested length and format.
    Returns: (summary_text, key_points, keywords)
    """
    sentences = tokenize_sentences(text)
    keywords = extract_keywords(text)

    if not sentences:
        return text, [text], keywords

    total_sents = len(sentences)

    # Determine sentence budget based on requested length
    if length == SummaryLength.SHORT:
        target_count = max(1, min(3, math.ceil(total_sents * 0.2)))
    elif length == SummaryLength.MEDIUM:
        target_count = max(2, min(6, math.ceil(total_sents * 0.35)))
    else:  # DETAILED
        target_count = max(4, min(10, math.ceil(total_sents * 0.55)))

    # Ensure target_count doesn't exceed available sentences
    target_count = min(target_count, total_sents)

    # Score sentences and choose the top-scoring sentences
    scored = score_sentences(sentences)
    top_scored = sorted(scored, key=lambda x: x[2], reverse=True)[:target_count]
    
    # Sort chosen sentences back in original chronological order to preserve flow
    chronological = sorted(top_scored, key=lambda x: x[0])
    selected_sentences = [item[1] for item in chronological]

    # Generate key points for display badges / cards
    key_points = [
        re.sub(r"^[•\-\*0-9.]+\s*", "", s).strip()
        for s in selected_sentences[:min(5, len(selected_sentences))]
    ]

    # Format output according to requested style
    if format_type == SummaryFormat.PARAGRAPH:
        # Group sentences into paragraphs of 2-3 sentences each
        paragraphs = []
        chunk = []
        for s in selected_sentences:
            chunk.append(s)
            if len(chunk) >= 3:
                paragraphs.append(" ".join(chunk))
                chunk = []
        if chunk:
            paragraphs.append(" ".join(chunk))
        summary_text = "\n\n".join(paragraphs)

    elif format_type == SummaryFormat.BULLET_POINTS:
        # Structured bullet points
        bullet_lines = []
        for s in selected_sentences:
            clean_s = re.sub(r"^[•\-\*0-9.]+\s*", "", s).strip()
            bullet_lines.append(f"• {clean_s}")
        summary_text = "\n".join(bullet_lines)

    elif format_type == SummaryFormat.KEY_TAKEAWAYS:
        # Numbered executive takeaways with focus headers
        takeaway_lines = []
        for idx, s in enumerate(selected_sentences, 1):
            clean_s = re.sub(r"^[•\-\*0-9.]+\s*", "", s).strip()
            takeaway_lines.append(f"{idx}. {clean_s}")
        summary_text = "\n\n".join(takeaway_lines)
    else:
        summary_text = " ".join(selected_sentences)

    return summary_text, key_points, keywords
