import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Context } from "../store/context.js";
import "../../styles/logIn.css";

const AuthShell = ({ eyebrow, title, children }) => (
  <main className="auth-page"><section className="auth-card"><div className="auth-icon" aria-hidden="true">✦</div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</section></main>
);

export const CheckEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pendingEmail = location.state?.email || "";

  useEffect(() => {
    const completeVerification = verifiedEmail => {
      if (pendingEmail && verifiedEmail && pendingEmail !== verifiedEmail) return;
      navigate("/login", {
        replace: true,
        state: { email: verifiedEmail || pendingEmail, verified: true }
      });
    };
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("authflow-auth") : null;
    const onMessage = event => {
      if (event.data?.type === "email-verified") completeVerification(event.data.email);
    };
    const onStorage = event => {
      if (event.key !== "authflow-email-verified" || !event.newValue) return;
      completeVerification(JSON.parse(event.newValue).email);
    };
    if (channel) channel.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [navigate, pendingEmail]);

  return <AuthShell eyebrow="Un paso más" title="Revisa tu correo"><p className="auth-intro">{location.state?.message || "Te enviamos un enlace para continuar."}</p>{pendingEmail && <p className="email-highlight">{pendingEmail}</p>}<p className="waiting-note"><span aria-hidden="true" /> Esta pantalla se actualizará automáticamente</p><p className="auth-switch"><Link to="/login" state={{ email: pendingEmail }}>Volver al inicio de sesión</Link></p></AuthShell>;
};

export const VerifyEmail = () => {
  const { actions } = useContext(Context);
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState({ loading: true, error: "", verifiedEmail: "" });
  useEffect(() => {
    let active = true;
    const verify = async () => {
      const result = await actions.verifyEmail(token);
      if (!active) return;
      if (result.ok) {
        const email = result.data.user?.email || "";
        const payload = { type: "email-verified", email };
        if ("BroadcastChannel" in window) {
          const channel = new BroadcastChannel("authflow-auth");
          channel.postMessage(payload);
          channel.close();
        }
        localStorage.setItem("authflow-email-verified", JSON.stringify({ email, at: Date.now() }));
        setStatus({ loading: false, error: "", verifiedEmail: email });
      }
      else setStatus({ loading: false, error: result.message });
    };
    verify();
    return () => { active = false; };
  }, [actions, token]);

  if (status.verifiedEmail) {
    return <AuthShell eyebrow="Verificación completada" title="Correo confirmado"><div className="verification-success" role="status"><span aria-hidden="true">✓</span><p><strong>Tu cuenta ya está verificada.</strong>Vuelve a la pestaña anterior para iniciar sesión. Ya puedes cerrar esta pestaña.</p></div><p className="email-highlight">{status.verifiedEmail}</p><p className="auth-switch"><Link to="/login" state={{ email: status.verifiedEmail, verified: true }}>Iniciar sesión en esta pestaña</Link></p></AuthShell>;
  }

  return <AuthShell eyebrow="Verificación" title={status.loading ? "Verificando tu cuenta…" : "No pudimos verificarla"}><p className={status.error ? "form-error" : "auth-intro"}>{status.error || "Esto solo tardará un momento."}</p>{status.error && <p className="auth-switch"><Link to="/login">Volver al inicio</Link></p>}</AuthShell>;
};

export const ForgotPassword = () => {
  const { actions } = useContext(Context);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const submit = async event => { event.preventDefault(); const result = await actions.forgotPassword(email); setMessage(result.message || result.data?.message); };
  return <AuthShell eyebrow="Recuperación" title="Recupera tu acceso"><p className="auth-intro">Te enviaremos un enlace de un solo uso, válido durante 30 minutos.</p><form className="auth-form" onSubmit={submit}><label htmlFor="recovery-email">Correo electrónico</label><input id="recovery-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} />{message && <p className="profile-message success">{message}</p>}<button type="submit">Enviar enlace</button></form><p className="auth-switch"><Link to="/login">Volver al inicio</Link></p></AuthShell>;
};

export const ResetPassword = () => {
  const { actions } = useContext(Context);
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState(null);
  const submit = async event => {
    event.preventDefault();
    if (password !== confirmation) return setMessage({ error: true, text: "Las contraseñas no coinciden." });
    const result = await actions.resetPassword(params.get("token"), password);
    setMessage({ error: !result.ok, text: result.ok ? result.data.message : result.message });
  };
  return <AuthShell eyebrow="Nueva contraseña" title="Protege nuevamente tu cuenta"><p className="auth-intro">Elige una contraseña única de al menos 10 caracteres.</p><form className="auth-form" onSubmit={submit}><label htmlFor="reset-password">Nueva contraseña</label><input id="reset-password" type="password" minLength="10" required value={password} onChange={event => setPassword(event.target.value)} /><label htmlFor="reset-confirmation">Confirmar contraseña</label><input id="reset-confirmation" type="password" minLength="10" required value={confirmation} onChange={event => setConfirmation(event.target.value)} />{message && <p className={message.error ? "form-error" : "profile-message success"}>{message.text}</p>}<button type="submit">Actualizar contraseña</button></form>{message && !message.error && <p className="auth-switch"><Link to="/login">Iniciar sesión</Link></p>}</AuthShell>;
};
