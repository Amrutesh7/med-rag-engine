from src.loader import load_documents
from src.chunker import create_chunks
from src.embedder import embed
from src.vectordb import get_collection


def is_valid_chunk(text):

    if len([c for c in text if c.isdigit()]) > 50:
        return False

    if len(text.split()) < 10:
        return False
    
    if "[" in text and "]" in text and len(text) < 200:
        return False
    
    if "REVIEW ARTICLE" in text.upper():
        return False

    return True


documents = load_documents()
chunks = create_chunks(documents)

print("Chunks ready:", len(chunks))

collection = get_collection()

stored_count = 0

for i, chunk in enumerate(chunks):

    text = chunk.page_content

    if not is_valid_chunk(text):
        continue

    embedding = embed(text)

    collection.add(
        ids=[f"{chunk.metadata['source']}_{i}"],
        embeddings=[embedding],
        documents=[text],
        metadatas=[chunk.metadata]
    )

    stored_count += 1


print("\nVector database created.")
print("Total stored vectors:", stored_count)