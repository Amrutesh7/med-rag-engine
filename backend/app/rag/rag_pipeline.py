from app.rag.embedder import embed
from app.db.vectordb import get_collection
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file
client_llm = Groq(api_key=os.getenv("GROQ_API_KEY"))
collection = get_collection()


def ask_rag(query):

    # Step 1: Embed
    query_embedding = embed(query)

    def is_valid_query(query):
        if len(query.split()) < 3:
            return False
        
        weak_words = {"hi", "hello", "hey", "test" }

        if query.lower().strip() in weak_words:
            return False

        return True

    if not is_valid_query(query):
        return "Please ask a meaningful medical question.", []

    # Step 2: Retrieve
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=4
    )

    docs = results["documents"][0]
    metas = results["metadatas"][0]

    if not docs:
        return "No relevant data found.", []

    # Step 3: Clean + limit context
    cleaned_docs = []

    for doc in docs:
        clean = doc.strip().replace("\n", " ")
        cleaned_docs.append(clean[:800])   # LIMIT

    context = "\n\n".join(cleaned_docs[:2]) # LIMIT to top 2 results

    # Step 4: Prompt (UNCHANGED)
    prompt = f"""
You are a medical AI assistant.

You MUST follow these rules strictly:

SAFETY RULES:
- Use ONLY the provided context
- Do NOT add external knowledge
- Do NOT give general advice unless explicitly present in context
- If the context does NOT fully answer the question, say:
  "The provided context does not contain sufficient information to fully answer this question."
- Do NOT assume or infer missing details
-If partial info exists → answer what is available + mention limitation briefly

QUALITY RULES:
- Start with a simple definition (1 sentence if applicable)
- Then explain clearly using simple language
- Keep the answer structured (short paragraphs or bullet points)
- Avoid repeating the same idea
- Do NOT copy sentences directly; rephrase in your own words

Context:
{context}

Question:
{query + " medical definition explanation causes symptoms"}

Answer:
"""

    # Step 5: LLM
    response = client_llm.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )

    answer = response.choices[0].message.content

    return answer, metas