/**
 * TreeNode.jsx – Phase 4
 * Adds: isSearchMatch golden pulse glow when search highlights this node
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';

const HANDLE_STYLE = {
  background: 'transparent',
  border: 'none',
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
};

export default function TreeNode({ id, data, isConnectable }) {
  const { label, hasChildren, isCollapsed, onToggle, onHoverStart, onHoverEnd, isSearchMatch } = data;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.65 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.65 }}
      transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
      style={{ position: 'relative' }}
      onMouseEnter={() => onHoverStart?.(id)}
      onMouseLeave={() => onHoverEnd?.()}
    >
      {/* Top handle */}
      <Handle id="top" type="target" position={Position.Top}
        isConnectable={isConnectable} style={{ ...HANDLE_STYLE, top: 0 }} />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          minWidth: 140,
          padding: '11px 22px',
          borderRadius: 14,
          background: isSearchMatch
            ? 'linear-gradient(135deg,#3b2a00 0%,#5c4200 100%)'
            : 'linear-gradient(135deg,#1e1b4b 0%,#2d2a6e 100%)',
          border: isSearchMatch
            ? '2px solid rgba(251,191,36,0.85)'
            : '1px solid rgba(165,180,252,0.28)',
          backdropFilter: 'blur(14px)',
          boxShadow: isSearchMatch
            ? '0 0 0 4px rgba(251,191,36,0.2), 0 8px 32px rgba(0,0,0,0.5)'
            : '0 6px 28px rgba(0,0,0,0.45)',
          color: isSearchMatch ? '#fde68a' : '#e0e7ff',
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '0.05em',
          textAlign: 'center',
          cursor: 'default',
          userSelect: 'none',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={e => {
          if (!isSearchMatch) {
            e.currentTarget.style.boxShadow = '0 10px 40px rgba(99,102,241,0.6)';
            e.currentTarget.style.borderColor = 'rgba(165,180,252,0.65)';
          }
        }}
        onMouseLeave={e => {
          if (!isSearchMatch) {
            e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.45)';
            e.currentTarget.style.borderColor = 'rgba(165,180,252,0.28)';
          }
        }}
      >
        {label}
      </div>

      {/* Bottom handle */}
      <Handle id="bottom" type="source" position={Position.Bottom}
        isConnectable={isConnectable} style={{ ...HANDLE_STYLE, bottom: 0 }} />

      {/* Toggle button */}
      {hasChildren && (
        <button
          aria-label={isCollapsed ? 'Expand children' : 'Collapse children'}
          onClick={e => { e.stopPropagation(); onToggle(id); }}
          style={{
            position: 'absolute',
            bottom: -16, left: '50%',
            transform: 'translateX(-50%)',
            width: 30, height: 30,
            borderRadius: '50%',
            background: isCollapsed
              ? 'linear-gradient(135deg,#fbbf24,#f59e0b)'
              : 'linear-gradient(135deg,#fb923c,#ef4444)',
            border: '2px solid rgba(255,255,255,0.35)',
            color: '#fff', fontWeight: 800, fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 3px 14px rgba(0,0,0,0.45)',
            zIndex: 10,
            transition: 'transform 0.15s ease, background 0.2s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1.22)';
            e.currentTarget.style.boxShadow = '0 5px 20px rgba(0,0,0,0.6)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
            e.currentTarget.style.boxShadow = '0 3px 14px rgba(0,0,0,0.45)';
          }}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      )}
    </motion.div>
  );
}
