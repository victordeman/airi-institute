import logging
import os
import numpy as np
import google.generativeai as genai

logger = logging.getLogger(__name__)

class RAGManager:
    def __init__(self):
        self.documents = []
        self.embeddings = None

    async def _get_embedding(self, text: str) -> list[float]:
        """
        Fetch embedding via Gemini API. Fallback to dummy for Local Mode.
        """
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return None
        
        try:
            genai.configure(api_key=api_key)
            result = await genai.embed_content_async(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
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
                # Note: Batch embedding might be better but let's keep it simple for now
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
            logger.info("No GOOGLE_API_KEY found. RAG will fallback to keyword search.")
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
