'use client';

import { useEffect, useRef, useState } from 'react';

export function useProjectShowcase(itemKey: string) {
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ index: 0, atStart: true, atEnd: false });
  function updatePosition() {
    const element = track.current;
    if (!element) return;
    const slides = Array.from(element.children) as HTMLElement[];
    const atEnd = element.scrollLeft >= element.scrollWidth - element.clientWidth - 2;
    const firstOffset = slides[0]?.offsetLeft ?? 0;
    const index = atEnd
      ? Math.max(0, slides.length - 1)
      : slides.reduce(
          (closest, slide, current) =>
            Math.abs(slide.offsetLeft - firstOffset - element.scrollLeft) <
            Math.abs(slides[closest].offsetLeft - firstOffset - element.scrollLeft)
              ? current
              : closest,
          0,
        );
    setPosition({ index, atStart: element.scrollLeft <= 2, atEnd });
  }
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    element.scrollLeft = 0;
    const observer = new ResizeObserver(updatePosition);
    observer.observe(element);
    return () => observer.disconnect();
  }, [itemKey]);
  function goTo(index: number) {
    const element = track.current;
    const slide = element?.children[index] as HTMLElement | undefined;
    const first = element?.children[0] as HTMLElement | undefined;
    if (!element || !slide || !first) return;
    element.scrollTo({
      left: slide.offsetLeft - first.offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  return { track, ...position, updatePosition, goTo };
}
