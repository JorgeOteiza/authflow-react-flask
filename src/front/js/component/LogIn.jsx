import React, { useContext, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Context } from "../store/context.js";
import "../../styles/logIn.css";

const LogIn = () => {
  const { store, actions } = useContext(Context);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (store.sessionReady && store.user) return <Navigate to="/profile" replace />;

  const handleSubmit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await actions.login(email, password);
    setSubmitting(false);
    if (result.ok) navigate("/profile");
    else setError(result.message);
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-icon" aria-hidden="true">→</div>
        <p className="eyebrow">Acceso seguro</p>
        <h1 id="login-title">Inicia sesión</h1>
        <p className="auth-intro">Accede a tu perfil con tu correo y contraseña.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="login-email">Correo electrónico</label>
          <input id="login-email" type="email" autoComplete="email" placeholder="tu@correo.com" required value={email} onChange={event => setEmail(event.target.value)} />
          <label htmlFor="login-password">Contraseña</label>
          <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Ingresando…" : "Iniciar sesión"}<span aria-hidden="true">→</span></button>
        </form>
        <Link className="auth-help" to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        <p className="auth-switch">¿No tienes una cuenta? <Link to="/signup">Regístrate</Link></p>
      </section>
    </main>
  );
};

export default LogIn;
