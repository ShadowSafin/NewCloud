"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";

interface VirtualizedContainerProps<T> {
  items: T[];
  viewMode: "grid" | "list";
  renderItem: (item: T) => React.ReactNode;
}

export function VirtualizedContainer<T>({
  items,
  viewMode,
  renderItem,
}: VirtualizedContainerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setContainerWidth(width || 800);
      setContainerHeight(height || 600);
    });
    resizeObserver.observe(el);

    // Initial size
    setScrollTop(el.scrollTop);
    setContainerWidth(el.clientWidth);
    setContainerHeight(el.clientHeight);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const cols = useMemo(() => {
    if (viewMode === "list") return 1;
    if (containerWidth >= 1024) return 5; // lg
    if (containerWidth >= 768) return 4;  // md
    if (containerWidth >= 640) return 3;  // sm
    return 2;
  }, [containerWidth, viewMode]);

  // Card dimensions
  const itemHeight = viewMode === "list" ? 54 : 172; // height for FileCard & FolderCard
  const gap = 12; // gap-3 in pixels
  const totalRows = Math.ceil(items.length / cols);
  const totalHeight = totalRows * itemHeight + Math.max(0, totalRows - 1) * gap;

  const { startRow, endRow } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - 2);
    const end = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + 2
    );
    return { startRow: start, endRow: end };
  }, [scrollTop, containerHeight, totalRows, itemHeight]);

  const visibleItems = useMemo(() => {
    const visible: { index: number; data: T; style: React.CSSProperties }[] = [];

    for (let r = startRow; r <= endRow; r++) {
      const top = r * (itemHeight + gap);
      for (let c = 0; c < cols; c++) {
        const itemIdx = r * cols + c;
        if (itemIdx >= items.length) break;

        if (viewMode === "list") {
          visible.push({
            index: itemIdx,
            data: items[itemIdx],
            style: {
              position: "absolute",
              top: `${top}px`,
              left: 0,
              right: 0,
              height: `${itemHeight}px`,
            },
          });
        } else {
          // Grid layout calculations with gap corrections
          const percentWidth = 100 / cols;
          const leftCorrection = (c * gap) - (c * gap * (cols - 1) / cols);
          visible.push({
            index: itemIdx,
            data: items[itemIdx],
            style: {
              position: "absolute",
              top: `${top}px`,
              left: `calc(${c * percentWidth}% + ${leftCorrection}px)`,
              width: `calc(${percentWidth}% - ${(cols - 1) * gap / cols}px)`,
              height: `${itemHeight}px`,
            },
          });
        }
      }
    }
    return visible;
  }, [startRow, endRow, items, cols, itemHeight, viewMode]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto relative pr-1"
      style={{ maxHeight: "calc(100vh - 200px)" }}
    >
      <div
        className="w-full relative"
        style={{ height: `${totalHeight}px` }}
      >
        {visibleItems.map((item) => (
          <div key={item.index} style={item.style}>
            {renderItem(item.data)}
          </div>
        ))}
      </div>
    </div>
  );
}
