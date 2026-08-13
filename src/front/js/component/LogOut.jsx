import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/context.js";

const Logout = () => {
  const { actions } = useContext(Context);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setSubmitting(true);
    await actions.logout();
    navigate("/login");
  };

  return <button type="button" className="button-secondary" disabled={submitting} onClick={handleLogout}>{submitting ? "Cerrando…" : "Cerrar sesión"}</button>;
};

export default Logout;
