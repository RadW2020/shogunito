import React, { useState, useEffect, useRef } from 'react';

interface ScrollIndicatorProps {
  children: React.ReactNode;
  className?: string;
}

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ children, className = '' }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const checkScroll = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;

    // Show left indicator if scrolled right
    setShowLeftIndicator(scrollLeft > 10);

    // Show right indicator if there's more content to scroll
    setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    // Initial check
    checkScroll();

    // Listen to scroll events
    element.addEventListener('scroll', checkScroll);

    // Listen to resize events
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [children]); // Re-check when children change

  return (
    <div className={`relative ${className}`}>
      {/* Left Scroll Indicator */}
      {showLeftIndicator && (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10 hidden md:block"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.1), transparent)',
          }}
          aria-hidden="true"
        >
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <svg
              className="w-5 h-5 text-gray-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border-primary) transparent',
        }}
      >
        {children}
      </div>

      {/* Right Scroll Indicator */}
      {showRightIndicator && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10 hidden md:block"
          style={{
            background: 'linear-gradient(to left, rgba(0,0,0,0.1), transparent)',
          }}
          aria-hidden="true"
        >
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <svg
              className="w-5 h-5 text-gray-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Mobile Scroll Hint */}
      {showRightIndicator && (
        <div
          className="md:hidden text-center text-xs py-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
            Swipe to see more
          </span>
        </div>
      )}
    </div>
  );
};
