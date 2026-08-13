import React, { useContext, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
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
    if (result.ok) navigate("/profile");
    else setError(result.message);
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <p className="eyebrow">Nueva cuenta</p>
        <h1 id="signup-title">Crea tu perfil</h1>
        <p className="auth-intro">Usa al menos 8 caracteres, con mayúsculas, minúsculas y números.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="signup-email">Correo electrónico</label>
          <input id="signup-email" type="email" autoComplete="email" maxLength="120" required value={email} onChange={event => setEmail(event.target.value)} />
          <label htmlFor="signup-password">Contraseña</label>
          <input id="signup-password" type="password" autoComplete="new-password" minLength="8" maxLength="128" required value={password} onChange={event => setPassword(event.target.value)} />
          <label htmlFor="signup-confirmation">Confirma la contraseña</label>
          <input id="signup-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Creando cuenta…" : "Crear cuenta"}</button>
        </form>
        <p className="auth-switch">¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link></p>
      </section>
    </main>
  );
};

export default Signup;
