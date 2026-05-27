import { useRef, useCallback, useEffect } from 'react';
import { usePdfStore } from '@/store/pdfStore';

/**
 * Hook for pinch-to-zoom and two-finger pan on touch devices.
 * Uses pointer events for maximum compatibility.
 */
export function usePinchZoom(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { zoom, setZoom } = usePdfStore();
  const pointersRef = useRef<Map<number, PointerEvent>>(new Map());
  const lastDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef(zoom);

  const getDistance = (p1: PointerEvent, p2: PointerEvent): number => {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = useCallback((e: PointerEvent) => {
    pointersRef.current.set(e.pointerId, e);
    if (pointersRef.current.size === 2) {
      // Start pinch
      const [p1, p2] = Array.from(pointersRef.current.values());
      lastDistanceRef.current = getDistance(p1, p2);
      initialZoomRef.current = usePdfStore.getState().zoom;
    }
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    pointersRef.current.set(e.pointerId, e);

    if (pointersRef.current.size === 2 && lastDistanceRef.current !== null) {
      const [p1, p2] = Array.from(pointersRef.current.values());
      const currentDistance = getDistance(p1, p2);
      const scale = currentDistance / lastDistanceRef.current;
      const newZoom = initialZoomRef.current * scale;
      setZoom(newZoom);
    }
  }, [setZoom]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      lastDistanceRef.current = null;
    }
  }, []);

  // Ctrl+scroll wheel zoom (desktop)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const currentZoom = usePdfStore.getState().zoom;
      setZoom(currentZoom + delta);
    }
  }, [setZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel]);

  return { zoom };
}
