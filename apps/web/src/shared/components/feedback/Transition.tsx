import React, { useEffect, useState, useRef } from 'react';

interface TransitionProps {
  show: boolean;
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
  appear?: boolean;
  children: React.ReactNode;
  className?: string;
  unmount?: boolean;
}

export const Transition: React.FC<TransitionProps> = ({
  show,
  enter = 'transition-smooth',
  enterFrom = 'opacity-0',
  enterTo = 'opacity-100',
  leave = 'transition-smooth',
  leaveFrom = 'opacity-100',
  leaveTo = 'opacity-0',
  // appear prop intentionally not destructured as it's not used yet
  children,
  className = '',
  unmount = true,
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [currentClasses, setCurrentClasses] = useState(show ? `${enter} ${enterFrom}` : '');
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Start with enter-from state
      setCurrentClasses(`${enter} ${enterFrom}`);

      // Trigger enter-to state after a frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCurrentClasses(`${enter} ${enterTo}`);
        });
      });
    } else if (shouldRender) {
      // Start leave transition
      setCurrentClasses(`${leave} ${leaveFrom}`);

      // Trigger leave-to state after a frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCurrentClasses(`${leave} ${leaveTo}`);
        });
      });

      // Wait for transition to complete before unmounting
      const timer = setTimeout(() => {
        if (unmount) {
          setShouldRender(false);
        }
      }, 300); // Should match transition duration

      return () => clearTimeout(timer);
    }
  }, [show, enter, enterFrom, enterTo, leave, leaveFrom, leaveTo, unmount, shouldRender]);

  if (!shouldRender && unmount) {
    return null;
  }

  return (
    <div ref={nodeRef} className={`${currentClasses} ${className}`}>
      {children}
    </div>
  );
};

// Preset transitions
export const FadeTransition: React.FC<
  Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>
> = (props) => (
  <Transition
    {...props}
    enter="transition-opacity duration-300"
    enterFrom="opacity-0"
    enterTo="opacity-100"
    leave="transition-opacity duration-300"
    leaveFrom="opacity-100"
    leaveTo="opacity-0"
  />
);

export const SlideUpTransition: React.FC<
  Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>
> = (props) => (
  <Transition
    {...props}
    enter="transition-all duration-300"
    enterFrom="opacity-0 translate-y-4"
    enterTo="opacity-100 translate-y-0"
    leave="transition-all duration-300"
    leaveFrom="opacity-100 translate-y-0"
    leaveTo="opacity-0 translate-y-4"
  />
);

export const SlideDownTransition: React.FC<
  Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>
> = (props) => (
  <Transition
    {...props}
    enter="transition-all duration-300"
    enterFrom="opacity-0 -translate-y-4"
    enterTo="opacity-100 translate-y-0"
    leave="transition-all duration-300"
    leaveFrom="opacity-100 translate-y-0"
    leaveTo="opacity-0 -translate-y-4"
  />
);

export const ScaleTransition: React.FC<
  Omit<TransitionProps, 'enter' | 'enterFrom' | 'enterTo' | 'leave' | 'leaveFrom' | 'leaveTo'>
> = (props) => (
  <Transition
    {...props}
    enter="transition-all duration-200"
    enterFrom="opacity-0 scale-95"
    enterTo="opacity-100 scale-100"
    leave="transition-all duration-200"
    leaveFrom="opacity-100 scale-100"
    leaveTo="opacity-0 scale-95"
  />
);
