import React, { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 8;

const touchDistance = (t) =>
  Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
const touchMidpoint = (t) => ({
  x: (t[0].clientX + t[1].clientX) / 2,
  y: (t[0].clientY + t[1].clientY) / 2,
});

// Full-screen image viewer with wheel/pinch zoom and drag-to-pan.
// Mounted per-image (keyed on src) so each open starts fresh at scale 1.
export default function ImageLightbox({ src, alt, onClose }) {
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [active, setActive] = useState(false); // pointer down → kill transition

  const surfaceRef = useRef(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const dragRef = useRef(null); // { startX, startY, tx, ty }
  const pinchRef = useRef(null); // { startDist, startScale }
  const movedRef = useRef(false);

  const clamp = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  // Zoom to `targetScale` while keeping the point under (clientX, clientY) fixed.
  const zoomAt = useCallback((targetScale, clientX, clientY) => {
    setView((v) => {
      const ns = clamp(targetScale);
      if (ns === v.scale) return v;
      if (ns <= 1) return { scale: 1, tx: 0, ty: 0 };
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return v;
      const px = clientX - (rect.left + rect.width / 2);
      const py = clientY - (rect.top + rect.height / 2);
      const ratio = ns / v.scale;
      return {
        scale: ns,
        tx: px * (1 - ratio) + v.tx * ratio,
        ty: py * (1 - ratio) + v.ty * ratio,
      };
    });
  }, []);

  // Native (non-passive) wheel + touchmove listeners so preventDefault works —
  // React routes these as passive, which would let the page scroll/zoom.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      zoomAt(viewRef.current.scale * factor, e.clientX, e.clientY);
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        movedRef.current = true;
        const mid = touchMidpoint(e.touches);
        const ratio = touchDistance(e.touches) / pinchRef.current.startDist;
        zoomAt(pinchRef.current.startScale * ratio, mid.x, mid.y);
      } else if (e.touches.length === 1 && dragRef.current) {
        const t = e.touches[0];
        const dx = t.clientX - dragRef.current.startX;
        const dy = t.clientY - dragRef.current.startY;
        if (Math.hypot(dx, dy) > 8) movedRef.current = true;
        if (viewRef.current.scale <= 1) return;
        e.preventDefault();
        setView((v) => ({ ...v, tx: dragRef.current.tx + dx, ty: dragRef.current.ty + dy }));
      }
    };

    const onMouseMove = (e) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.hypot(dx, dy) > 5) movedRef.current = true;
      if (viewRef.current.scale <= 1) return;
      setView((v) => ({ ...v, tx: dragRef.current.tx + dx, ty: dragRef.current.ty + dy }));
    };

    const onMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setActive(false);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomAt, onClose]);

  const onMouseDown = (e) => {
    e.preventDefault();
    movedRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      tx: viewRef.current.tx,
      ty: viewRef.current.ty,
    };
    setActive(true);
  };

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        startDist: touchDistance(e.touches),
        startScale: viewRef.current.scale,
      };
      dragRef.current = null;
    } else if (e.touches.length === 1) {
      movedRef.current = false;
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        tx: viewRef.current.tx,
        ty: viewRef.current.ty,
      };
    }
    setActive(true);
  };

  const onTouchEnd = (e) => {
    if (e.touches.length === 0) {
      dragRef.current = null;
      pinchRef.current = null;
      setActive(false);
    } else if (e.touches.length === 1) {
      pinchRef.current = null;
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        tx: viewRef.current.tx,
        ty: viewRef.current.ty,
      };
    }
  };

  // A drag/pinch ends with a click we must ignore. Otherwise: tapping the image
  // toggles zoom (in at the tapped point, or back out); tapping the void closes.
  const onClick = (e) => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    if (e.target === e.currentTarget) {
      onClose();
      return;
    }
    if (viewRef.current.scale > 1) setView({ scale: 1, tx: 0, ty: 0 });
    else zoomAt(2.5, e.clientX, e.clientY);
  };

  const zoomed = view.scale > 1;

  return (
    <div
      ref={surfaceRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onClick}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "image preview"}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/80 backdrop-blur-sm"
      style={{
        touchAction: "none",
        cursor: zoomed ? "grab" : "zoom-out",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white/80 transition-colors hover:bg-white/20 hover:text-white"
      >
        ×
      </button>

      <img
        src={src}
        alt={alt}
        draggable={false}
        className="relative"
        style={{
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          transition: active ? "none" : "transform 0.12s ease-out",
          maxWidth: "95vw",
          maxHeight: "92vh",
          userSelect: "none",
          willChange: "transform",
          cursor: zoomed ? "grab" : "zoom-in",
        }}
      />
    </div>
  );
}
