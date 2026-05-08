/**
 * server/index.js
 * Express API that serves tree data from data.json
 * Endpoint: GET /api/tree
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// GET /api/tree → return full node + edge dataset
app.get('/api/tree', (req, res) => {
  try {
    // Always read fresh from disk (no caching) so edits to data.json are instant
    const data = require(path.join(__dirname, 'data.json'));
    // Clear require cache so hot-edits to data.json are picked up on next request
    delete require.cache[require.resolve(path.join(__dirname, 'data.json'))];
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read tree data', details: err.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`\n🌳 Tree API server running on http://localhost:${PORT}`);
  console.log(`   GET http://localhost:${PORT}/api/tree\n`);
});
