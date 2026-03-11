# ============================================================
# VECTOR ENGINE - RAG pipeline using FAISS + sentence-transformers
# ============================================================

import os
import glob
import logging
import pickle
from typing import List, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Lazy imports — avoids crash if ML libs not installed
try:
    from sentence_transformers import SentenceTransformer
    import faiss
    import numpy as np
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning("sentence-transformers or faiss not installed. RAG will use demo mode.")

from .config import settings


class VectorEngine:
    def __init__(self):
        self.model = None
        self.index = None
        self.chunks: List[str] = []
        self.sources: List[str] = []
        self._ready = False

    # ── Initialization ────────────────────────────────────────

    async def initialize(self):
        if not ML_AVAILABLE:
            logger.warning("VectorEngine: running in demo mode (no ML libs)")
            self._ready = False
            return

        try:
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
            index_path = Path(settings.FAISS_INDEX_PATH)

            if index_path.exists():
                await self._load_index(index_path)
            else:
                await self._build_index()

            self._ready = True
            logger.info(f"VectorEngine ready. {len(self.chunks)} chunks indexed.")
        except Exception as e:
            logger.error(f"VectorEngine init failed: {e}")
            self._ready = False

    async def _build_index(self):
        docs_path = Path(settings.POLICY_DOCS_PATH)
        if not docs_path.exists():
            logger.warning(f"Policy docs path not found: {docs_path}")
            return

        txt_files = list(docs_path.glob("**/*.txt")) + list(docs_path.glob("**/*.md"))
        if not txt_files:
            logger.warning("No policy documents found to index.")
            return

        for file_path in txt_files:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            file_chunks = self._chunk_text(text, str(file_path.name))
            self.chunks.extend([c[0] for c in file_chunks])
            self.sources.extend([c[1] for c in file_chunks])

        embeddings = self.model.encode(self.chunks, show_progress_bar=False)
        embeddings = np.array(embeddings).astype("float32")

        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dim)
        self.index.add(embeddings)

        # Persist index
        index_dir = Path(settings.FAISS_INDEX_PATH)
        index_dir.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(index_dir / "index.faiss"))
        with open(index_dir / "chunks.pkl", "wb") as f:
            pickle.dump({"chunks": self.chunks, "sources": self.sources}, f)

        logger.info(f"Built FAISS index: {len(self.chunks)} chunks from {len(txt_files)} docs")

    async def _load_index(self, index_path: Path):
        self.index = faiss.read_index(str(index_path / "index.faiss"))
        with open(index_path / "chunks.pkl", "rb") as f:
            data = pickle.load(f)
            self.chunks = data["chunks"]
            self.sources = data["sources"]
        logger.info(f"Loaded FAISS index: {len(self.chunks)} chunks")

    # ── Chunking ──────────────────────────────────────────────

    def _chunk_text(self, text: str, source: str) -> List[Tuple[str, str]]:
        words = text.split()
        chunks = []
        step = settings.CHUNK_SIZE - settings.CHUNK_OVERLAP
        for i in range(0, len(words), step):
            chunk = " ".join(words[i : i + settings.CHUNK_SIZE])
            if chunk.strip():
                chunks.append((chunk, source))
        return chunks

    # ── Search ────────────────────────────────────────────────

    async def search(self, query: str) -> Tuple[str, List[str], float]:
        """Returns (answer_text, source_names, confidence_score)"""

        if not self._ready or not ML_AVAILABLE:
            return self._demo_response(query)

        query_embedding = self.model.encode([query]).astype("float32")
        distances, indices = self.index.search(query_embedding, settings.TOP_K_RESULTS)

        if len(indices[0]) == 0:
            return "No relevant policy documents found.", [], 0.0

        top_chunks = []
        top_sources = []
        for idx, dist in zip(indices[0], distances[0]):
            if idx < len(self.chunks):
                top_chunks.append(self.chunks[idx])
                if self.sources[idx] not in top_sources:
                    top_sources.append(self.sources[idx])

        context = "\n\n---\n\n".join(top_chunks)
        # Confidence: inverse of normalized distance (0–1)
        confidence = max(0.0, min(1.0, 1.0 - float(distances[0][0]) / 100.0))

        answer = f"Based on the policy documents:\n\n{context[:1500]}..."
        return answer, top_sources, round(confidence, 2)

    def _demo_response(self, query: str) -> Tuple[str, List[str], float]:
        q = query.lower()
        if "aml" in q or "suspicious" in q:
            return (
                "According to our AML Policy (Section 4.2): All transactions exceeding $10,000 must be reported to the compliance team within 24 hours. Suspicious activity indicators include: unusual transaction patterns, transactions with high-risk jurisdictions, structuring to avoid reporting thresholds, and transactions inconsistent with customer profile.",
                ["AML_Policy_v3.txt"],
                0.87,
            )
        if "kyc" in q or "customer" in q:
            return (
                "Per our KYC Policy: Customer due diligence must be completed for all new accounts. Enhanced due diligence is required for PEPs (Politically Exposed Persons) and high-risk customers.",
                ["KYC_Policy_v2.txt"],
                0.82,
            )
        return (
            "The policy documentation indicates standard compliance procedures apply. Please consult the full policy document for detailed guidance.",
            ["General_Compliance_Policy.txt"],
            0.65,
        )


# Singleton
vector_engine = VectorEngine()
