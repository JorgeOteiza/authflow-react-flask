import React, { useContext, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Context } from "../store/context.js";
import "../../styles/logIn.css";

const Signup = () => {
  const { store, actions } = useContext(Context);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (store.sessionReady && store.user) return <Navigate to="/profile" replace />;

  const handleSubmit = async event => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    const result = await actions.signup(email, password);
    setSubmitting(false);
    if (result.ok) {
      navigate(result.data.verification_required ? "/check-email" : "/profile", {
        state: { email, message: result.data.message }
      });
    }
    else setError(result.message);
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <div className="auth-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M3.5 19c.5-3.3 2.4-5 5.5-5s5 1.7 5.5 5" />
            <path d="M18 8v6M15 11h6" />
          </svg>
        </div>
        <p className="eyebrow">Nueva cuenta</p>
        <h1 id="signup-title">Crea tu perfil</h1>
        <p className="auth-intro">Usa al menos 10 caracteres, con mayúsculas, minúsculas y números.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="signup-email">Correo electrónico</label>
          <input id="signup-email" type="email" autoComplete="email" maxLength="120" placeholder="tu@correo.com" required value={email} onChange={event => setEmail(event.target.value)} />
          <label htmlFor="signup-password">Contraseña</label>
          <input id="signup-password" type="password" autoComplete="new-password" minLength="10" maxLength="128" required value={password} onChange={event => setPassword(event.target.value)} />
          <label htmlFor="signup-confirmation">Confirma la contraseña</label>
          <input id="signup-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Creando cuenta…" : "Crear cuenta"}<span aria-hidden="true">→</span></button>
        </form>
        <p className="auth-switch">¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link></p>
      </section>
    </main>
  );
};

export default Signup;
