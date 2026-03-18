import os
import re
import fitz

DATASET_PATH = "dataset"

def clean_text(text):

    text = re.sub(r'-\n', '', text)
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    text = re.sub(r'\s+', ' ', text)

    return text.strip()


def load_documents():

    documents = []

    for file in os.listdir(DATASET_PATH):

        if file.endswith(".pdf"):

            path = os.path.join(DATASET_PATH, file)

            doc = fitz.open(path)

            for page_number, page in enumerate(doc):

                text = page.get_text()
                text = clean_text(text)

                documents.append({
                    "text": text,
                    "source": file,
                    "page": page_number + 1
                })

    return documents