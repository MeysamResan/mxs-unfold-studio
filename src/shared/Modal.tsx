import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ScrollArea } from './ScrollArea';

export function Modal({
  title,
  onClose,
  children,
  dismissLabel,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  dismissLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const finishClose = useCallback(() => {
    ref.current?.close();
    onCloseRef.current();
  }, []);
  useEffect(() => {
    if (!closing) return;
    let active = true;
    // The native dialog keeps its focus trap until its exit motion has finished.
    const animations = ref.current?.getAnimations() ?? [];
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (active) finishClose();
    });
    return () => {
      active = false;
    };
  }, [closing, finishClose]);

  const requestClose = useCallback(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finishClose();
    else setClosing(true);
  }, [finishClose]);

  return (
    <dialog
      ref={ref}
      className={`modal ${closing ? 'is-closing' : ''}`}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <ScrollArea
        className="modal-scroll"
        aria-labelledby="modal-title"
        style={{ maxHeight: 'calc(90dvh - 2px)' }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2 id="modal-title">{title}</h2>
            <button className="icon-button" onClick={requestClose} aria-label="Close dialog">
              <X size={20} />
            </button>
          </div>
          {children}
          {dismissLabel && (
            <div className="modal-actions">
              <button className="button-primary" onClick={requestClose}>
                {dismissLabel}
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </dialog>
  );
}
