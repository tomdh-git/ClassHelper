import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function InfoTip({ content, offset = 8, isDark = false }) {
  const btnRef = useRef(null);
  const tipRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const computeBase = () => {
    const el = btnRef.current;
    if (!el) return { top: 0, left: 0, btnRect: null };
    const r = el.getBoundingClientRect();
    return { top: r.bottom + offset, left: r.left + r.width / 2, btnRect: r };
  };

  const adjustToViewport = (base) => {
    const tip = tipRef.current;
    if (!tip) return;
    const margin = 8;
    const tr = tip.getBoundingClientRect();
    let top = base.top;
    let left = base.left;
    // Flip above if overflowing bottom
    if (base.btnRect && top + tr.height > window.innerHeight - margin) {
      top = base.btnRect.top - offset - tr.height;
    }
    const half = tr.width / 2;
    const minLeft = margin + half;
    const maxLeft = window.innerWidth - margin - half;
    left = Math.max(minLeft, Math.min(left, maxLeft));
    setPos({ top, left });
  };

  const updateAll = () => {
    const base = computeBase();
    setPos({ top: base.top, left: base.left });
    requestAnimationFrame(() => adjustToViewport(base));
  };

  useEffect(() => {
    if (!open) return;
    updateAll();
    const onScroll = () => updateAll();
    const onResize = () => updateAll();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const openAtButton = () => {
    const base = computeBase();
    setPos({ top: base.top, left: base.left });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        className="info-btn"
        onMouseEnter={openAtButton}
        onFocus={openAtButton}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            className={`info-tooltip portal ${isDark ? "dark" : ""}`}
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={openAtButton}
            onMouseLeave={() => setOpen(false)}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
