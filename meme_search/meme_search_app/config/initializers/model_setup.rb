require "informers"

$embedding_model = Informers.pipeline("embedding", "sentence-transformers/all-MiniLM-L6-v2")
