import React, { useContext, useEffect } from "react";
import { Context } from "../store/context.js";


const GlobalNotice = () => {
  const { store, actions } = useContext(Context);
  const notice = store.notice;

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(actions.clearNotice, 5000);
    return () => window.clearTimeout(timeout);
  }, [actions.clearNotice, notice]);

  if (!notice) return null;
  return (
    <div className="notice-backdrop" aria-live="polite">
      <div className="home-notice" role="status">
        <span className="home-notice-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m7 12 3.2 3.2L17.5 8" /></svg>
        </span>
        <span className="home-notice-copy"><strong>{notice.title}</strong><span>{notice.message}</span></span>
        <button type="button" aria-label="Cerrar confirmación" onClick={actions.clearNotice}>×</button>
        <span className="notice-progress" aria-hidden="true" />
      </div>
    </div>
  );
};

export default GlobalNotice;
