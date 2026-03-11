import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

def ingest_docs():
    # Load the policy text
    loader = TextLoader("data/policy.txt")
    documents = loader.load()
    
    # Split text into chunks
    text_splitter = CharacterTextSplitter(chunk_size=200, chunk_overlap=20)
    docs = text_splitter.split_documents(documents)
    
    # Create Vector Database (FAISS)
    embeddings = OpenAIEmbeddings()
    vector_db = FAISS.from_documents(docs, embeddings)
    
    # Save it locally
    vector_db.save_local("data/faiss_index")
    print("✅ RAG Ingestion Complete: Policy data stored in FAISS.")

if __name__ == "__main__":
    import asyncio
    ingest_docs()