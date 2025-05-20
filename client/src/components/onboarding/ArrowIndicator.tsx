import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface ArrowIndicatorProps {
  targetElementSelector?: string;
  position?: "top" | "right" | "bottom" | "left";
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  color?: string;
  showTooltip?: boolean;
  tooltipText?: string;
}

const ArrowIndicator = ({
  targetElementSelector,
  position = "right",
  top = "115px",
  right = "180px", // Positioned to the left of the Create Group button
  bottom,
  left,
  color = "#32846b",
  showTooltip = true,
  tooltipText = "Click here"
}: ArrowIndicatorProps) => {
  const [offset, setOffset] = useState(0);
  const [tooltipVisible, setTooltipVisible] = useState(true);
  
  // Animation effect - smoother, more gentle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev === 0 ? 8 : 0));
    }, 800); // Slightly slower animation for smoother feel
    return () => clearInterval(interval);
  }, []);

  // Periodically hide/show tooltip for attention
  useEffect(() => {
    const interval = setInterval(() => {
      setTooltipVisible(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getArrowStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9001,
      width: '40px',
      height: '40px',
      transition: 'transform 0.5s ease-in-out',
      filter: `drop-shadow(0 0 4px rgba(50, 132, 107, 0.7))`,
    };

    // Set the position
    if (top) baseStyle.top = top;
    if (right) baseStyle.right = right;
    if (bottom) baseStyle.bottom = bottom;
    if (left) baseStyle.left = left;

    // Apply animation based on position
    switch (position) {
      case "right":
        baseStyle.transform = `translateX(${offset}px)`;
        break;
      case "left":
        baseStyle.transform = `translateX(-${offset}px)`;
        break;
      case "top":
        baseStyle.transform = `translateY(-${offset}px)`;
        break;
      case "bottom":
        baseStyle.transform = `translateY(${offset}px)`;
        break;
    }

    return baseStyle;
  };

  const getTooltipStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9002,
      backgroundColor: color,
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 500,
      opacity: tooltipVisible ? 1 : 0,
      transition: 'opacity 0.3s ease-in-out',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)'
    };

    // Position the tooltip next to the arrow based on its direction
    switch (position) {
      case "right":
        baseStyle.top = typeof top === 'string' ? `calc(${top} - 30px)` : undefined;
        baseStyle.right = typeof right === 'string' ? `calc(${right} + 50px)` : undefined;
        break;
      case "left":
        baseStyle.top = typeof top === 'string' ? `calc(${top} - 30px)` : undefined;
        baseStyle.left = typeof left === 'string' ? `calc(${left} + 50px)` : undefined;
        break;
      case "top":
        baseStyle.top = typeof top === 'string' ? `calc(${top} - 50px)` : undefined;
        baseStyle.right = typeof right === 'string' ? `calc(${right} - 20px)` : undefined;
        break;
      case "bottom":
        baseStyle.bottom = typeof bottom === 'string' ? `calc(${bottom} - 50px)` : undefined;
        baseStyle.right = typeof right === 'string' ? `calc(${right} - 20px)` : undefined;
        break;
    }

    return baseStyle;
  };

  // SVG arrow with improved styling
  const arrow = (
    <div style={getArrowStyle()}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {position === "right" && (
          <>
            <path
              d="M10 20H30"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M20 10L30 20L20 30"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        
        {position === "left" && (
          <>
            <path
              d="M30 20H10"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M20 10L10 20L20 30"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        
        {position === "top" && (
          <>
            <path
              d="M20 30V10"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M10 20L20 10L30 20"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        
        {position === "bottom" && (
          <>
            <path
              d="M20 10V30"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M10 20L20 30L30 20"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </div>
  );

  return createPortal(
    <>
      {arrow}
      {showTooltip && <div style={getTooltipStyle()}>{tooltipText}</div>}
    </>,
    document.body
  );
};

export default ArrowIndicator;