import logging
import os
import numpy as np
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class RAGManager:
    def __init__(self):
        self.documents = []
        self.embeddings = None
        self._client = None

    def _get_client(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return None
        if not self._client:
            self._client = genai.Client(api_key=api_key)
        return self._client

    async def _get_embedding(self, text: str) -> list[float]:
        """
        Fetch embedding via Gemini API. Fallback to dummy for Local Mode.
        """
        client = self._get_client()
        if not client:
            return None
        
        try:
            # Using the new google-genai SDK (async via aio)
            result = await client.aio.models.embed_content(
                model="text-embedding-004",
                contents=text,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
            )
            return result.embeddings[0].values
        except Exception as e:
            logger.error(f"Error fetching Gemini embedding: {e}")
            return None

    async def build_index(self, data: list[str]):
        """
        Builds a simple numpy-based vector index.
        """
        if not data:
            logger.warning("No data provided to build RAG index.")
            return

        self.documents = data
        
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            try:
                logger.info(f"Generating embeddings for {len(data)} documents via Gemini...")
                # Fetch embeddings for all documents
                all_embeddings = []
                for doc in data:
                    emb = await self._get_embedding(doc)
                    if emb:
                        all_embeddings.append(emb)
                    else:
                        # Fallback for failed embedding: zero vector
                        all_embeddings.append([0.0] * 768)
                
                self.embeddings = np.array(all_embeddings).astype('float32')
                logger.info("RAG index built with Gemini embeddings.")
            except Exception as e:
                logger.error(f"Failed to build Gemini-based RAG index: {e}")
                self.embeddings = None
        else:
            # ISSUE 3: Robust warning for missing API key
            logger.warning("CRITICAL: No GOOGLE_API_KEY found in environment variables.")
            logger.warning("RAG system will fallback to basic keyword search.")
            logger.warning("To enable Gemini embeddings, set GOOGLE_API_KEY in your environment.")
            logger.warning("For production (Vercel), add it in Dashboard -> Settings -> Environment Variables.")
            # GOOGLE_API_KEY must be set in Vercel Dashboard → Settings → Environment Variables
            # for the RAG to function in production.
            self.embeddings = None

    async def query(self, query_text: str, top_k: int = 3) -> list[str]:
        """
        Queries the index using cosine similarity if embeddings are available, 
        otherwise falls back to keyword matching.
        """
        if not self.documents:
            return []

        query_emb = await self._get_embedding(query_text)
        
        if query_emb and self.embeddings is not None:
            # Cosine similarity using numpy
            q = np.array(query_emb).astype('float32')
            # Normalize embeddings for cosine similarity
            norm_q = q / np.linalg.norm(q)
            norm_embs = self.embeddings / np.linalg.norm(self.embeddings, axis=1, keepdims=True)
            
            similarities = np.dot(norm_embs, norm_q)
            top_indices = np.argsort(similarities)[::-1][:top_k]
            
            return [self.documents[i] for i in top_indices]
        
        # Keyword-based fallback (very simple)
        logger.info("Falling back to keyword-based search for RAG query.")
        words = query_text.lower().split()
        scores = []
        for doc in self.documents:
            score = sum(1 for word in words if word in doc.lower())
            scores.append(score)
        
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [self.documents[i] for i in top_indices if scores[i] > 0]

# Singleton instance
rag_manager = RAGManager()
