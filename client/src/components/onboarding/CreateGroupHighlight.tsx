import React from 'react';
import { createPortal } from 'react-dom';

// Simple component to highlight the Create group button in top-right corner
const CreateGroupHighlight: React.FC = () => {
  const highlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: '112px',
    right: '20px',
    width: '142px',
    height: '42px',
    borderRadius: '8px',
    border: '3px dashed #ff5500',
    boxShadow: '0 0 10px rgba(255, 85, 0, 0.7)',
    zIndex: 9001,
    pointerEvents: 'none',
    animation: 'pulse 2s infinite'
  };

  // Create a portal to render the highlight directly to the document body
  return createPortal(
    <div style={highlightStyle} />,
    document.body
  );
};

export default CreateGroupHighlight;