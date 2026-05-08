/**
 * TreeCanvas.jsx – Phase 4: Mock Backend + Search
 *
 * What's new:
 *  1. Fetches tree data from GET /api/tree (Express server via Vite proxy)
 *  2. Loading / error states while data arrives
 *  3. Search bar: debounced query → highlights matching nodes (gold glow) +
 *     fitView({ nodes: matches }) to zoom in automatically
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ReactFlow, MiniMap, Controls, Background, BackgroundVariant, useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { getLayoutedElements } from './useLayout';
import TreeNode from './TreeNode';

/* ── Constants ──────────────────────────────────────────────────────────── */

const nodeTypes = { treeNode: TreeNode };

const EDGE_DEFAULT   = { stroke: '#6366f1', strokeWidth: 2.5, opacity: 0.8 };
const EDGE_HIGHLIGHT = { stroke: '#fb923c', strokeWidth: 4,   opacity: 1   };
const EDGE_DIMMED    = { stroke: '#6366f1', strokeWidth: 2.5, opacity: 0.2 };

/* ── Helpers ────────────────────────────────────────────────────────────── */

function buildChildrenMap(edges) {
  const map = {};
  edges.forEach(e => { (map[e.source] ??= []).push(e.target); });
  return map;
}

function getDescendants(nodeId, childrenMap) {
  const result = new Set();
  const stack  = [...(childrenMap[nodeId] ?? [])];
  while (stack.length) {
    const id = stack.pop();
    if (result.has(id)) continue;
    result.add(id);
    (childrenMap[id] ?? []).forEach(c => stack.push(c));
  }
  return result;
}

/* ── LoadingScreen ──────────────────────────────────────────────────────── */

function LoadingScreen({ error, onRetry }) {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0b0b18',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20, fontFamily: 'Inter,system-ui,sans-serif', color: '#a5b4fc',
    }}>
      {error ? (
        <>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#f87171', margin: 0 }}>
            Could not reach API server
          </p>
          <p style={{ fontSize: 13, color: 'rgba(165,180,252,0.6)', margin: 0 }}>
            Make sure the Express server is running on port 3001
          </p>
          <button onClick={onRetry} style={{
            marginTop: 8, padding: '9px 22px', borderRadius: 24,
            background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(165,180,252,0.4)',
            color: '#e0e7ff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            ↺ Retry
          </button>
        </>
      ) : (
        <>
          <div style={{
            width: 44, height: 44, border: '4px solid rgba(165,180,252,0.2)',
            borderTop: '4px solid #6366f1', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
            Loading tree data…
          </p>
        </>
      )}
    </div>
  );
}

/* ── SearchBar ──────────────────────────────────────────────────────────── */

function SearchBar({ value, onChange, resultCount, total }) {
  const inputRef = useRef(null);
  const hasQuery  = value.length > 0;
  const noResults = hasQuery && resultCount === 0;

  return (
    <div style={{
      position: 'absolute', top: 76, left: '50%', transform: 'translateX(-50%)',
      zIndex: 20, width: 300,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.07)',
        border: `1px solid ${noResults ? 'rgba(248,113,113,0.6)' : hasQuery ? 'rgba(251,191,36,0.5)' : 'rgba(165,180,252,0.2)'}`,
        borderRadius: 28, padding: '8px 14px', backdropFilter: 'blur(14px)',
        boxShadow: hasQuery ? '0 4px 20px rgba(0,0,0,0.4)' : 'none',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>
          {noResults ? '❌' : hasQuery ? '✨' : '🔍'}
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search nodes…"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: noResults ? '#f87171' : '#e0e7ff',
            fontWeight: 600, fontSize: 13, letterSpacing: '0.03em',
            caretColor: '#fbbf24',
          }}
        />
        {hasQuery && (
          <>
            <span style={{
              fontSize: 11, fontWeight: 700, color: noResults ? '#f87171' : '#fbbf24',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {noResults ? 'no match' : `${resultCount}/${total}`}
            </span>
            <button onClick={() => { onChange(''); inputRef.current?.focus(); }} style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
              width: 20, height: 20, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#a5b4fc',
              fontSize: 12, flexShrink: 0, padding: 0,
            }}>×</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── TreeCanvas ─────────────────────────────────────────────────────────── */

export default function TreeCanvas() {
  const rfRef = useRef(null);

  /* ── Remote data state ── */
  const [rawNodes,  setRawNodes]  = useState([]);
  const [rawEdges,  setRawEdges]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [fetchTick,  setFetchTick]  = useState(0); // increment to retry

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    fetch('/api/tree')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { setRawNodes(data.nodes); setRawEdges(data.edges); setLoading(false); })
      .catch(err => { setFetchError(err.message); setLoading(false); });
  }, [fetchTick]);

  /* ── UI state ── */
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [hoveredNodeId,  setHoveredNodeId]  = useState(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  /* Debounce search input (300 ms) */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ── Stable callbacks ── */
  const childrenMap  = useMemo(() => buildChildrenMap(rawEdges), [rawEdges]);
  const onToggle     = useCallback(id => setCollapsedNodes(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  }), []);
  const onHoverStart = useCallback(id => setHoveredNodeId(id), []);
  const onHoverEnd   = useCallback(() => setHoveredNodeId(null), []);
  const onReset      = useCallback(() => { setCollapsedNodes(new Set()); setSearchQuery(''); }, []);

  /* ── Hidden node IDs (from collapsed subtrees) ── */
  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set();
    collapsedNodes.forEach(id =>
      getDescendants(id, childrenMap).forEach(d => hidden.add(d))
    );
    return hidden;
  }, [collapsedNodes, childrenMap]);

  /* ── Dagre layout (expensive – only on collapse / data change) ── */
  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    if (!rawNodes.length) return { layoutedNodes: [], layoutedEdges: [] };

    const visNodes = rawNodes
      .filter(n => !hiddenNodeIds.has(n.id))
      .map(n => ({
        ...n,
        type: 'treeNode',
        style: { transition: 'transform 0.45s cubic-bezier(0.34,1.2,0.64,1)' },
        data: {
          label: n.data.label,
          hasChildren: Boolean(childrenMap[n.id]?.length),
          isCollapsed: collapsedNodes.has(n.id),
          isSearchMatch: false, // filled in after layout
          onToggle, onHoverStart, onHoverEnd,
        },
      }));

    const visIds = new Set(visNodes.map(n => n.id));
    const visEdges = rawEdges.filter(e => visIds.has(e.source) && visIds.has(e.target));
    const { nodes: ln, edges: le } = getLayoutedElements(visNodes, visEdges, 'TB');
    return { layoutedNodes: ln, layoutedEdges: le };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes, rawEdges, hiddenNodeIds, collapsedNodes, childrenMap, onToggle]);

  /* ── Edge highlight (cheap – runs on hover, no Dagre) ── */
  const displayedEdges = useMemo(() =>
    layoutedEdges.map(edge => {
      const hi = edge.source === hoveredNodeId;
      const dim = hoveredNodeId !== null && !hi;
      const s = hi ? EDGE_HIGHLIGHT : dim ? EDGE_DIMMED : EDGE_DEFAULT;
      return {
        ...edge, animated: hi,
        style: { ...s, transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s' },
      };
    }),
  [layoutedEdges, hoveredNodeId]);

  /* ── React Flow nodes state ── */
  const [nodes, setNodes, onNodesChange] = useNodesState([]);

  /* Sync on collapse / data load */
  useEffect(() => {
    setNodes(layoutedNodes.map(n => ({
      ...n, data: { ...n.data, isSearchMatch: false },
    })));
    const t = setTimeout(() => rfRef.current?.fitView({ duration: 500, padding: 0.25 }), 40);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsedNodes, layoutedNodes]);

  /* Sync search highlights (no Dagre re-run) */
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setNodes(prev => prev.map(n => ({ ...n, data: { ...n.data, isSearchMatch: false } })));
      return;
    }
    const q = debouncedQuery.toLowerCase().trim();
    const matchIds = new Set(
      layoutedNodes
        .filter(n => n.data.label.toLowerCase().includes(q))
        .map(n => n.id)
    );
    setNodes(prev => prev.map(n => ({
      ...n, data: { ...n.data, isSearchMatch: matchIds.has(n.id) },
    })));
    if (matchIds.size > 0) {
      setTimeout(() => rfRef.current?.fitView({
        nodes: [...matchIds].map(id => ({ id })),
        duration: 600, padding: 0.6,
      }), 40);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  /* ── Derived counts ── */
  const visibleCount  = nodes.length;
  const totalCount    = rawNodes.length;
  const isFullTree    = collapsedNodes.size === 0 && !debouncedQuery;
  const searchMatchCount = debouncedQuery
    ? nodes.filter(n => n.data.isSearchMatch).length : 0;

  const onInit = useCallback(inst => {
    rfRef.current = inst;
    inst.fitView({ padding: 0.25 });
  }, []);

  /* ── Loading / error gate ── */
  if (loading || fetchError) {
    return (
      <LoadingScreen
        error={fetchError}
        onRetry={() => setFetchTick(t => t + 1)}
      />
    );
  }

  /* ── Main render ── */
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0b0b18', fontFamily: 'Inter,system-ui,sans-serif' }}>

      {/* Header hint */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(165,180,252,0.2)',
        borderRadius: 40, padding: '7px 20px', backdropFilter: 'blur(12px)',
        pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 17 }}>🌳</span>
        <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Hover to highlight · click&nbsp;<span style={{ color: '#fb923c' }}>●</span>&nbsp;to collapse
        </span>
      </div>

      {/* Search bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        resultCount={searchMatchCount}
        total={visibleCount}
      />

      {/* Control panel (top-right) */}
      <div style={{
        position: 'absolute', top: 20, right: 20, zIndex: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(165,180,252,0.2)',
          borderRadius: 24, padding: '5px 14px', backdropFilter: 'blur(10px)',
          color: '#a5b4fc', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
        }}>
          {visibleCount} / {totalCount} nodes
        </div>

        <button
          onClick={onReset}
          disabled={isFullTree}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: isFullTree ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.25)',
            border: `1px solid ${isFullTree ? 'rgba(255,255,255,0.1)' : 'rgba(165,180,252,0.45)'}`,
            borderRadius: 24, padding: '8px 18px', backdropFilter: 'blur(10px)',
            color: isFullTree ? 'rgba(165,180,252,0.35)' : '#e0e7ff',
            fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
            cursor: isFullTree ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isFullTree ? 'none' : '0 4px 20px rgba(99,102,241,0.3)',
          }}
          onMouseEnter={e => { if (!isFullTree) e.currentTarget.style.background = 'rgba(99,102,241,0.45)'; }}
          onMouseLeave={e => { if (!isFullTree) e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; }}
        >
          <span style={{ fontSize: 15 }}>↺</span> Reset Tree
        </button>
      </div>

      {/* React Flow canvas */}
      <ReactFlow
        nodes={nodes}
        edges={displayedEdges}
        onNodesChange={onNodesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        fitView fitViewOptions={{ padding: 0.25 }}
        nodesDraggable nodesConnectable={false}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.4} color="rgba(255,255,255,0.06)" />
        <Controls style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
        <MiniMap nodeColor="#4f46e5" maskColor="rgba(0,0,0,0.6)"
          style={{ background: 'rgba(11,11,24,0.88)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
      </ReactFlow>
    </div>
  );
}
