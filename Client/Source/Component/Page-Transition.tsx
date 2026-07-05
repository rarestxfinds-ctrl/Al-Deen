import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  // Animate only on page navigation
  useEffect(() => {
    setIsVisible(false);
    
    const timeout = setTimeout(() => {
      setDisplayChildren(children);
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  // Update content without animation when children change within same page
  useEffect(() => {
    if (isVisible) {
      setDisplayChildren(children);
    }
  }, [children]);

  return (
    <div
      className={` duration-300 ease-out ${
        isVisible 
          ? "opacity-100" 
          : "opacity-0"
      }`}
    >
      {displayChildren}
    </div>
  );
}