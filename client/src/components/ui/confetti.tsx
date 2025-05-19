import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  duration?: number;
  particleCount?: number;
  spread?: number;
  origin?: {
    x?: number;
    y?: number;
  };
  colors?: string[];
  trigger?: boolean;
}

export const Confetti: React.FC<ConfettiProps> = ({
  duration = 3000,
  particleCount = 50,
  spread = 70,
  origin = { y: 0.6 },
  colors = ['#FFD700', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6'],
  trigger = true,
}) => {
  useEffect(() => {
    if (!trigger) return;
    
    const animationEnd = Date.now() + duration;
    
    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };
    
    const makeConfetti = () => {
      if (Date.now() < animationEnd) {
        confetti({
          particleCount: particleCount / 10,
          angle: randomInRange(55, 125),
          spread,
          origin,
          colors,
        });
        
        requestAnimationFrame(makeConfetti);
      }
    };
    
    makeConfetti();
  }, [duration, particleCount, spread, origin, colors, trigger]);

  return null;
};

export const celebrateSuccess = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  
  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };
  
  const makeConfetti = () => {
    if (Date.now() < animationEnd) {
      confetti({
        particleCount: 2,
        angle: randomInRange(55, 125),
        spread: randomInRange(50, 70),
        origin: { y: 0.6 },
        colors: ['#FFD700', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6']
      });
      
      requestAnimationFrame(makeConfetti);
    }
  };
  
  makeConfetti();
};

export default Confetti;