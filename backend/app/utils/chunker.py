##from langchain.schema import Document
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def create_chunks(documents):

    docs = []

    for d in documents:

        docs.append(
            Document(
                page_content=d["text"],
                metadata={
                    "source": d["source"],
                    "page": d["page"],
                    "category": d["category"]

                }
            )
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=120,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    chunks = splitter.split_documents(docs)

    return chunks