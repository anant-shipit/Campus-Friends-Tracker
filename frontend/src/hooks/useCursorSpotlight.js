import { useEffect, useRef } from 'react';

export const useCursorSpotlight = (config = {}) => {
  const {
    interpolationSpeed = 0.15, // Subtle smoothing
    activeOpacity = 1,
    inactiveOpacity = 0,
  } = config;

  const requestRef = useRef();
  const target = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const current = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const hasMoved = useRef(false);
  const isHoveringModal = useRef(false);

  useEffect(() => {
    // Check if device supports hover
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (isTouchDevice || prefersReducedMotion) return;

    const root = document.documentElement;

    const animate = () => {
      const dx = target.current.x - current.current.x;
      const dy = target.current.y - current.current.y;
      
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        current.current.x = target.current.x;
        current.current.y = target.current.y;
        root.style.setProperty('--mouse-x', `${current.current.x}px`);
        root.style.setProperty('--mouse-y', `${current.current.y}px`);
        requestRef.current = null;
        return;
      }

      // Lerp (Linear Interpolation) for smooth movement
      current.current.x += dx * interpolationSpeed;
      current.current.y += dy * interpolationSpeed;

      root.style.setProperty('--mouse-x', `${current.current.x}px`);
      root.style.setProperty('--mouse-y', `${current.current.y}px`);

      requestRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      if (!requestRef.current) {
        requestRef.current = requestAnimationFrame(animate);
      }

      if (!hasMoved.current) {
        hasMoved.current = true;
        root.style.setProperty('--spotlight-opacity', activeOpacity);
      }

      // Check if hovering a modal/form to reduce opacity
      const targetElement = e.target;
      const isModal = targetElement.closest('.premium-modal') || targetElement.closest('form');
      
      if (isModal && !isHoveringModal.current) {
        isHoveringModal.current = true;
        root.style.setProperty('--spotlight-opacity', activeOpacity * 0.3); // Reduce opacity
      } else if (!isModal && isHoveringModal.current) {
        isHoveringModal.current = false;
        root.style.setProperty('--spotlight-opacity', activeOpacity);
      }
    };

    const handleMouseLeave = () => {
      root.style.setProperty('--spotlight-opacity', inactiveOpacity);
      hasMoved.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(requestRef.current);
    };
  }, [interpolationSpeed, activeOpacity, inactiveOpacity]);
};
