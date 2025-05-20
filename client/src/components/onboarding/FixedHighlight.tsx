import { createPortal } from "react-dom";

// Component to highlight the Create Group button in the top right corner
const FixedHighlight = () => {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '115px',
        right: '25px',
        width: '135px',
        height: '40px',
        borderRadius: '8px',
        border: '3px dashed #ff5500',
        boxShadow: '0 0 10px rgba(255, 85, 0, 0.7)',
        zIndex: 9001,
        pointerEvents: 'none',
        animation: 'pulse 2s infinite'
      }}
    />,
    document.body
  );
};

export default FixedHighlight;