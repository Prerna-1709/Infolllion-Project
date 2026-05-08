# 🌳 Interactive Tree Visualizer

A professional React + React Flow tree visualization tool with expand/collapse, smooth transitions, edge highlighting, search, and a live Express API backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Tree canvas | @xyflow/react (React Flow) |
| Auto-layout | Dagre |
| Animations | Framer Motion |
| Backend | Express.js |

---

## Project Structure

```
.
├── server/                 # Express API backend
│   ├── index.js            # Server entry point (GET /api/tree)
│   ├── data.json           # Tree node & edge data (edit to change the tree)
│   └── package.json
│
├── src/
│   ├── TreeCanvas.jsx      # Main canvas: fetch, collapse, search, hover
│   ├── TreeNode.jsx        # Custom node card with toggle button
│   ├── useLayout.js        # Dagre layout hook (getLayoutedElements)
│   ├── initial-elements.js # (legacy – data now comes from API)
│   ├── App.jsx
│   └── index.css
│
├── vite.config.js          # Vite + Tailwind + API proxy config
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd server
npm install
cd ..
```

---

## Running the App

You need **two terminals** running simultaneously.

### Terminal 1 — Start the API server

```bash
cd server
npm start
```

Expected output:
```
🌳 Tree API server running on http://localhost:3001
   GET http://localhost:3001/api/tree
```

### Terminal 2 — Start the frontend

```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

> The Vite dev server automatically proxies `/api/*` requests to the Express server on port 3001 — no CORS configuration needed.

---

## Features

| Feature | How to use |
|---------|-----------|
| **Expand / Collapse** | Click the orange/amber **●** button on any parent node |
| **Edge highlighting** | Hover over any node to highlight its outgoing edges |
| **Search** | Type in the search bar — matching nodes glow gold and the viewport zooms in |
| **Reset Tree** | Click **↺ Reset Tree** (top-right) to restore the full tree |
| **Node counter** | Live badge shows `visible / total` nodes |
| **Drag nodes** | Click and drag any node to reposition it |
| **Zoom / Pan** | Scroll to zoom · drag canvas to pan · use Controls panel |

---

## Customising the Tree

Edit **`server/data.json`** and refresh the browser. No server restart needed — the file is re-read on every request.

```json
{
  "nodes": [
    { "id": "root", "data": { "label": "Root" }, "position": { "x": 0, "y": 0 } }
  ],
  "edges": [
    { "id": "root-child", "source": "root", "target": "child" }
  ]
}
```

---

## API Reference

| Endpoint | Method | Response |
|----------|--------|----------|
| `/api/tree` | GET | `{ nodes: Node[], edges: Edge[] }` |
| `/api/health` | GET | `{ status: "ok", timestamp: "..." }` |
