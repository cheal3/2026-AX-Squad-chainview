import { useRef } from "react";

export function ModalBackdrop({
  children,
  className = "modal-backdrop is-open",
  onClose,
}) {
  const pointerStartRef = useRef(null);
  const rememberPointerStart = (event) => {
    if (event.target !== event.currentTarget) {
      pointerStartRef.current = null;
      return;
    }
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };
  const handleBackdropClick = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) {
      return;
    }
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved <= 6) {
      onClose();
    }
  };

  return (
    <div
      className={className}
      onClick={handleBackdropClick}
      onMouseDown={rememberPointerStart}
    >
      {children}
    </div>
  );
}
