import chromadb

client = chromadb.PersistentClient(path="vectorstore")

def get_collection():
    return client.get_or_create_collection("diabetes_docs")