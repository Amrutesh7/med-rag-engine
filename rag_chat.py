from src.rag_pipeline import ask_rag

print("RAG system ready.\n")

while True:

    query = input("Ask a question (type 'exit' or 'quit'): ")

    if query.lower() in ["exit", "quit"]:
        break

    answer, metas = ask_rag(query)

    print("\nAnswer:\n")
    print(answer)

    print("\nSources:\n")

    seen = set()

    for meta in metas[:3]:  # show sources for top 3 results
        key = f"{meta['source']}-{meta['page']}"

        if key not in seen:
            print(f"{meta['source']} (page {meta['page']})")
            seen.add(key)

    print("\n" + "="*60 + "\n")