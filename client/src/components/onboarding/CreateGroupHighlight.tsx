import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';

// Position options for testing different locations
const positions = [
  {
    label: "Top Right (Original)",
    style: {
      position: 'fixed',
      top: '112px',
      right: '20px',
      width: '142px',
      height: '42px',
    }
  },
  {
    label: "Middle of Screen",
    style: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '142px',
      height: '42px',
    }
  },
  {
    label: "Top of Screen",
    style: {
      position: 'fixed',
      top: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '142px',
      height: '42px',
    }
  },
  {
    label: "Precise Position",
    style: {
      position: 'fixed',
      top: '110px',  // Adjusted to match Create Group button
      right: '20px',
      width: '150px',
      height: '45px',
    }
  }
];

// Simple component to highlight the Create group button with test positions
const CreateGroupHighlight: React.FC = () => {
  const [positionIndex, setPositionIndex] = useState(3); // Default to Precise Position
  
  const baseStyle: React.CSSProperties = {
    borderRadius: '8px',
    border: '3px dashed #ff5500',
    boxShadow: '0 0 10px rgba(255, 85, 0, 0.7)',
    zIndex: 9001,
    pointerEvents: 'none',
    animation: 'pulse 2s infinite',
    backgroundColor: 'transparent'
  };
  
  // Combine base style with the selected position style
  const highlightStyle = { ...baseStyle, ...positions[positionIndex].style };
  
  // Control panel for switching positions
  const positionControls = (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: '20px', 
        left: '20px', 
        zIndex: 9002,
        background: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}
    >
      <div className="mb-2 font-bold">Test Positions:</div>
      <div className="flex flex-col gap-2">
        {positions.map((pos, index) => (
          <Button
            key={index}
            size="sm"
            variant={positionIndex === index ? "default" : "outline"}
            onClick={() => setPositionIndex(index)}
          >
            {pos.label}
          </Button>
        ))}
      </div>
    </div>
  );

  // Create a portal to render both the highlight and controls directly to the document body
  return createPortal(
    <>
      <div style={highlightStyle} />
      {positionControls}
    </>,
    document.body
  );
};

export default CreateGroupHighlight;