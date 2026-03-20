import os
from fastapi import FastAPI
from oauthlib.uri_validate import query
from oauthlib.uri_validate import query
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from app.rag.rag_pipeline import ask_rag
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR,"..", "dataset")

app = FastAPI()     # Create FastAPI instance

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Query(BaseModel):
    query: str

class Response(BaseModel):
    answer: str
    sources: list

@app.get("/")
def home():
    return {"message": "MedRAG API is running"}

@app.post("/ask", response_model=Response)
def ask(request: Query):    
    try: 

        user_query = request.query             
        if not user_query.strip():
            return {
                "answer": "Please ask a valid medical question.",
                "sources": []
            }
            
        answer, sources = ask_rag(user_query)
        return {
            "answer": answer,
            "sources": sources
        }

    except Exception as e:
        return {
            "answer": "Internal server error." + str(e),
            "sources": []
        }


app.mount("/files", StaticFiles     (directory=DATASET_PATH), name="files")  # Serve PDF files from the dataset directory

