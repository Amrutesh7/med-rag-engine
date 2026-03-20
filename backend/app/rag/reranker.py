"""import cohere
import os

co = cohere.Client(os.getenv("COHERE_API_KEY"))

def rerank(query, docs, metas, top_n=3):

    response = co.rerank(
        query=query,
        documents=docs,
        top_n=top_n
    )

    reranked_docs = [docs[r.index] for r in response.results]
    reranked_metas = [metas[r.index] for r in response.results]

    return reranked_docs, reranked_metas"""