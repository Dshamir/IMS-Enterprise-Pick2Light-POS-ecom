# Vector Search Setup Guide

This application now uses a hybrid search system combining SQLite for structured data and ChromaDB for vector similarity search.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐
│    SQLite       │    │    ChromaDB     │
│                 │    │                 │
│ • Products      │    │ • Image vectors │
│ • Inventory     │    │ • Text embeddings│
│ • Transactions  │    │ • Similarity    │
│                 │    │   search        │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌─────────────────────┐
         │   Hybrid Search     │
         │                     │
         │ • Text search       │
         │ • Image search      │
         │ • Combined results  │
         └─────────────────────┘
```

## Prerequisites

1. **Python 3.8+** with pip installed
2. **Node.js 18+** with npm installed
3. **ChromaDB** Python package

## Setup Instructions

### 1. Install ChromaDB

```bash
# Install ChromaDB globally
pip3 install chromadb

# Or install in a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install chromadb
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Optional: OpenAI API Key (for better text embeddings)

Create a `.env.local` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

**Note:** If you don't have an OpenAI API key, the system will still work using ChromaDB's default embedding function.

## Running the Application

### Option 1: Run Everything Together (Recommended)

```bash
npm run dev:full
```

This starts both ChromaDB server and Next.js development server concurrently.

### Option 2: Run Services Separately

**Terminal 1 - Start ChromaDB:**
```bash
npm run chromadb
# Or manually:
python3 -m chromadb.server --host 0.0.0.0 --port 8000 --path ./data/chromadb
```

**Terminal 2 - Start Next.js:**
```bash
npm run dev
```

## How It Works

### Search Flow

1. **Text Search:**
   - First tries vector search using ChromaDB for semantic similarity
   - Falls back to SQLite LIKE queries if vector search fails
   - Combines and ranks results by relevance

2. **Image Search:**
   - Extracts features using TensorFlow.js MobileNet
   - Searches for similar images in ChromaDB vector space
   - Falls back to traditional filtering if vector search fails

3. **Hybrid Results:**
   - Combines vector and traditional search results
   - Deduplicates by product ID
   - Ranks by similarity scores

### API Endpoints

- `GET /api/products?query=search_term` - Text search (hybrid)
- `POST /api/search/image` - Image search (hybrid)
- `GET /api/vector-search/health` - Check ChromaDB status

### Search Parameters

- `?vector=false` - Disable vector search (use traditional only)
- `?category=parts` - Filter by category
- `?query=search_term` - Text search query

## Troubleshooting

### ChromaDB Connection Issues

1. **Check if ChromaDB is running:**
   ```bash
   curl http://localhost:8000/api/v1/heartbeat
   ```

2. **Check the health endpoint:**
   ```bash
   curl http://localhost:3000/api/vector-search/health
   ```

3. **View ChromaDB logs:**
   ChromaDB will output logs to the terminal where you started it.

### Vector Search Fallback

If vector search fails, the application automatically falls back to traditional SQLite search. You'll see warnings in the console but the application will continue to work.

### Data Directory

ChromaDB stores data in `./data/chromadb/`. This directory will be created automatically when you first run ChromaDB.

## Performance Notes

- **First-time indexing:** Adding products to vector search takes longer initially
- **Image processing:** Large images may take time to process for feature extraction
- **Memory usage:** TensorFlow.js and ChromaDB increase memory usage
- **Startup time:** Initial model loading adds ~10-30 seconds to first search

## Development

### Adding New Products

When you create new products via the UI or API, they are automatically added to both SQLite and ChromaDB for future searches.

### Monitoring Vector Search

- Use the health endpoint to monitor ChromaDB status
- Check browser network tab for search performance
- Watch console logs for vector search warnings/errors

### Customizing Search

Edit `/lib/vector-search.ts` to customize:
- Similarity thresholds
- Vector collection settings
- Hybrid search logic
- Fallback behavior

## Production Deployment

For production deployment:

1. Run ChromaDB as a persistent service
2. Consider using a dedicated vector database server
3. Set up proper error monitoring
4. Configure backup for ChromaDB data directory
5. Use environment variables for all configuration