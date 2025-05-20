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
}

const ArrowIndicator = ({
  targetElementSelector,
  position = "right",
  top = "115px",
  right = "180px", // Positioned to the left of the Create Group button
  bottom,
  left,
  color = "#ff5500"
}: ArrowIndicatorProps) => {
  const [offset, setOffset] = useState(0);
  
  // Animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev === 0 ? 10 : 0));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const getArrowStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9001,
      width: '40px',
      height: '40px',
      transition: 'transform 0.3s ease-in-out',
      filter: `drop-shadow(0 0 3px rgba(0, 0, 0, 0.5))`,
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

  // SVG arrow
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

  return createPortal(arrow, document.body);
};

export default ArrowIndicator;