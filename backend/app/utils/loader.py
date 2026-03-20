import os
import re
import fitz
from importlib_metadata import files

DATASET_PATH = "dataset"

def clean_text(text):

    text = re.sub(r'-\n', '', text)
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    text = re.sub(r'\s+', ' ', text)

    return text.strip()


def load_documents():

    documents = []

    for root, dirs, files in os.walk(DATASET_PATH):
        for file in files:

            if file.endswith(".pdf"):

                path = os.path.join(root, file)
                category = os.path.basename(root)

                doc = fitz.open(path)

                for page_number, page in enumerate(doc):

                    text = page.get_text()
                    text = clean_text(text)

                    documents.append({
                        "text": text,
                        "source": file,
                        "page": page_number + 1,
                        "category": category

                    })

    return documents