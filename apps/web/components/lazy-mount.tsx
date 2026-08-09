"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Defers mounting `children` until the wrapper scrolls near the viewport,
 * then keeps them mounted permanently. For anything meaningfully heavy per
 * list item - a live ReactFlow circuit preview, say - so a long list
 * doesn't mount dozens of them at once on first paint.
 */
export function LazyMount({
  children,
  fallback,
  rootMargin = "200px",
  className,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {mounted ? children : fallback}
    </div>
  );
}
