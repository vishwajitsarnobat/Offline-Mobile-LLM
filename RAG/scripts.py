import os
import json
import faiss
from sentence_transformers import SentenceTransformer
from unstructured.loader import DirectoryLoader
from unstructured.text_splitter import RecursiveCharacterTextSplitter

# --- Configuration ---
SOURCE_DOCS_PATH = "knowledge_source"
FAISS_INDEX_PATH = "knowledge_base.faiss"
CHUNK_MAP_PATH = "chunk_store.json"
EMBEDDING_MODEL = 'all-MiniLM-L6-v2' # A great, lightweight model for this task

print("--- Phase 1: Loading and Chunking Documents ---")

# 1. Load documents from the source directory
if not os.path.exists(SOURCE_DOCS_PATH):
    print(f"Error: Source directory not found at '{SOURCE_DOCS_PATH}'")
    exit()
    
loader = DirectoryLoader(SOURCE_DOCS_PATH, silent_errors=True)
docs = loader.load()

if not docs:
    print("No documents were loaded. Please check the directory and file types.")
    exit()

# 2. Split documents into smaller chunks
# This is crucial for RAG to find specific, relevant information.
text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=50)
chunks = text_splitter.split_documents(docs)

print(f"Loaded {len(docs)} documents and split them into {len(chunks)} chunks.")

# Extract just the text content for embedding
chunk_texts = [chunk.page_content for chunk in chunks]

print("\n--- Phase 2: Generating Text Embeddings ---")

# 3. Load the embedding model
model = SentenceTransformer(EMBEDDING_MODEL, device='cpu') # Use CPU for broad compatibility

# 4. Generate embeddings for all text chunks
# This can take a while depending on the number of chunks.
embeddings = model.encode(chunk_texts, show_progress_bar=True)
d = embeddings.shape[1] # Get the dimension of the embeddings

print(f"Generated {len(embeddings)} embeddings with dimension {d}.")

print("\n--- Phase 3: Building and Saving the FAISS Index ---")

# 5. Create a FAISS index
index = faiss.IndexFlatL2(d) # Using a simple L2 distance index
index.add(embeddings)

# 6. Save the index to disk
faiss.write_index(index, FAISS_INDEX_PATH)
print(f"FAISS index saved to: {FAISS_INDEX_PATH}")

# 7. Create and save the chunk map
# This is a critical file that maps the FAISS index ID back to the original text chunk.
# The app will use this to retrieve the actual text after getting a search result.
chunk_map = {i: text for i, text in enumerate(chunk_texts)}
with open(CHUNK_MAP_PATH, 'w', encoding='utf-8') as f:
    json.dump(chunk_map, f)

print(f"Chunk text mapping saved to: {CHUNK_MAP_PATH}")
print("\n--- RAG Knowledge Base is Ready! ---")
print("You now have two files to package with your native module:")
print(f"1. {FAISS_INDEX_PATH} (The search index)")
print(f"2. {CHUNK_MAP_PATH} (The text content)")