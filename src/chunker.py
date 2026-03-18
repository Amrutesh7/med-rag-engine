from langchain.schema import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def create_chunks(documents):

    docs = []

    for d in documents:

        docs.append(
            Document(
                page_content=d["text"],
                metadata={
                    "source": d["source"],
                    "page": d["page"]
                }
            )
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    chunks = splitter.split_documents(docs)

    return chunks