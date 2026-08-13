import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { Context } from "../store/appContext";

const ProtectedRoute = ({ children }) => {
  const { store } = useContext(Context);

  if (!store.sessionReady) {
    return <main className="page-state" aria-live="polite">Comprobando sesión…</main>;
  }
  return store.user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
