# Create /data folder structure and add placeholder for PDFs

This folder is for storing policy documents and policy PDFs used by the RAG engine.

## Folder Structure

```
data/
├── README.md (this file)
├── faiss_index/ (auto-generated)
│   ├── index.faiss
│   └── index.pkl
└── your_policy_documents.pdf (add your PDFs here)
```

## Adding Policy Documents

### Step 1: Prepare PDFs
1. Create or obtain policy documents in PDF format
2. Name them clearly (e.g., `fraud_prevention_policy.pdf`, `compliance_guidelines.pdf`)
3. Place them in this `/data` folder

### Example Policy Documents
- `fraud_prevention_policy.pdf` - Company's fraud detection and prevention procedures
- `risk_management_policy.pdf` - Risk assessment and mitigation guidelines
- `compliance_guidelines.pdf` - Regulatory compliance requirements
- `transaction_limits.pdf` - Transaction authorization and limit guidelines
- `aml_procedures.pdf` - Anti-Money Laundering procedures

### Step 2: Application Startup
When the application starts, it will automatically:
1. Scan the `/data` folder for all PDF files
2. Load and extract text from PDFs
3. Split documents into chunks (configurable size)
4. Generate embeddings for each chunk
5. Build FAISS vector index
6. Save index for future use

### Step 3: Using in Queries
Users can now ask policy-related questions:
```
"What is our fraud prevention policy?"
"How should we handle compliance violations?"
"What are the transaction limits?"
```

## Configuration

Edit `.env` to customize:

```bash
# Reference folder path
DATA_FOLDER=data

# Path where FAISS index is stored
FAISS_INDEX_PATH=data/faiss_index

# Document chunking
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Search results
TOP_K_RESULTS=5
```

## FAISS Index Management

### Rebuild Index
```bash
# The index rebuilds automatically when new PDFs are added
# To force a rebuild, delete the faiss_index folder:
rm -rf data/faiss_index/

# Then restart the application
```

### Index Files
When the application runs, it creates:
- `faiss_index/index.faiss` - The vector index file
- `faiss_index/index.pkl` - Metadata for the index

## Performance Tips

1. **Optimal PDF Size**: Between 0.5MB - 5MB per document
2. **Number of Documents**: Start with 5-10, scale as needed
3. **Chunk Size**: 
   - `512-1000`: Better precision (more chunks)
   - `1000-2000`: Better recall (fewer chunks)
4. **Overlap**: Typically 200 characters for context preservation

## Troubleshooting

### Issue: "No relevant policy documents found"
- Ensure PDFs exist in `/data` folder
- Check PDFs are valid (not corrupted)
- Restart application to rebuild index

### Issue: PDFs not being loaded
- Check `DATA_FOLDER` in .env points to correct path
- Verify file permissions on PDF files
- Check application logs for PDF loading errors

### Issue: Slow search performance
- Reduce number of PDFs
- Increase `CHUNK_SIZE` to reduce total chunks
- Use `TOP_K_RESULTS=3` instead of 5

## Sample Workflow

```bash
# 1. Add your PDFs
cp /path/to/fraud_policy.pdf data/
cp /path/to/compliance_guide.pdf data/

# 2. Restart application (automatic re-indexing)
docker restart financial_genai_app

# 3. Query the policies
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is our fraud prevention policy?",
    "context": {}
  }'
```

## Advanced: Custom Index Location

To store FAISS index in a different location:

```bash
# In .env
FAISS_INDEX_PATH=/custom/path/to/faiss_index

# Create the directory
mkdir -p /custom/path/to/faiss_index

# Restart application
```

## Legal & Security Notes

- **Confidentiality**: Ensure PDFs are not exposed through the API directly
- **Access Control**: RBAC limits who can query policies
- **Audit Trail**: All policy queries are logged
- **Versioning**: Keep policy document versions for compliance

---

**Last Updated**: March 5, 2026
**Version**: 1.0.0
