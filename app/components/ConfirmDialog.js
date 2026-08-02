"use client";

import { useCallback, useRef, useState } from "react";

// Herbruikbare vervanging voor de browser-standaard confirm() — retourneert
// net als confirm() een Promise<boolean>, maar met een eigen, mooi gestylede
// modal i.p.v. de kale systeempopup. Gebruik:
//
//   const { confirm, ConfirmDialog } = useConfirmDialog();
//   ...
//   if (!(await confirm("Weet je het zeker?"))) return;
//   ...
//   return <div>{ConfirmDialog}...</div>;
export function useConfirmDialog() {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        message,
        danger: opts.danger !== false,
        confirmLabel: opts.confirmLabel || "Verwijderen",
        cancelLabel: opts.cancelLabel || "Annuleren",
      });
    });
  }, []);

  function handle(result) {
    setState(null);
    resolveRef.current?.(result);
  }

  const ConfirmDialog = state ? (
    <div className="confirm-overlay" onClick={() => handle(false)}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{state.message}</p>
        <div className="confirm-actions">
          <button onClick={() => handle(false)}>{state.cancelLabel}</button>
          <button onClick={() => handle(true)} className={state.danger ? "danger" : "primary"}>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
