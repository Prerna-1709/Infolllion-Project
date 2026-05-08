/**
 * useLayout.js
 *
 * Custom hook that accepts React Flow nodes + edges and returns new nodes
 * with positions computed by Dagre (top-to-bottom layout).
 *
 * Node dimensions must be provided so Dagre can avoid overlaps.
 */

import { useMemo } from 'react';
import dagre from 'dagre';

const NODE_WIDTH  = 140;
const NODE_HEIGHT = 64;   // extra height absorbs the toggle-button overhang (16 px)

/**
 * getLayoutedElements – pure function so it can also be called outside React.
 *
 * @param {import('@xyflow/react').Node[]} nodes
 * @param {import('@xyflow/react').Edge[]} edges
 * @param {'TB'|'LR'|'BT'|'RL'} direction  – default 'TB' (top-to-bottom)
 * @returns {{ nodes, edges }}
 */
export function getLayoutedElements(nodes, edges, direction = 'TB') {
  const dagreGraph = new dagre.graphlib.Graph();

  // Global graph settings
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,   // TB = top-to-bottom
    nodesep: 70,          // horizontal gap between sibling nodes
    ranksep: 90,          // vertical gap between levels (accounts for button overhang)
  });

  // Register every node with its dimensions so Dagre can centre parents
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Register every edge
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Let Dagre compute the layout
  dagre.layout(dagreGraph);

  // Map computed positions back to React Flow nodes.
  // Dagre positions are centre-based; React Flow uses top-left origin.
  const layoutedNodes = nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: x - NODE_WIDTH  / 2,
        y: y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * useLayout – memoised wrapper so components only recompute when
 * the nodes/edges arrays change.
 */
export default function useLayout(nodes, edges, direction = 'TB') {
  return useMemo(
    () => getLayoutedElements(nodes, edges, direction),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes.length, edges.length, direction]
  );
}
