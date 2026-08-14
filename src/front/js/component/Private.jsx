import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/context.js";
import Logout from "./LogOut.jsx";
import "../../styles/perfil.css";

const Icon = ({ name }) => {
  const paths = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l2 2M14 9l2 2"/></>,
    session: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 12h8M13 9l3 3-3 3"/></>
  };
  return <svg className="profile-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
};

const formatDate = value => new Intl.DateTimeFormat("es-CL", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
}).format(new Date(value));

const formatLastAccess = value => {
  if (!value) return "Primer acceso";
  const date = new Date(value);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(date);
  return isToday ? `Hoy, ${time}` : formatDate(value);
};

const Private = () => {
  const { store, actions } = useContext(Context);
  const user = store.user;
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const saveProfile = async event => {
    event.preventDefault();
    setSubmitting(true);
    const result = await actions.updateAccount({ email, current_password: currentPassword, new_password: newPassword || undefined });
    setSubmitting(false);
    if (result.ok) {
      setCurrentPassword(""); setNewPassword(""); setEditing(false);
      setMessage({ type: "success", text: "Perfil actualizado correctamente." });
    } else setMessage({ type: "error", text: result.message });
  };

  const deleteAccount = async event => {
    event.preventDefault(); setSubmitting(true);
    const result = await actions.deleteAccount(deletePassword);
    setSubmitting(false);
    if (result.ok) navigate("/", { replace: true, state: { accountDeleted: true } });
    else { setDeleteOpen(false); setDeletePassword(""); setMessage({ type: "error", text: result.message }); }
  };

  const cancelEditing = () => {
    setEmail(user.email); setCurrentPassword(""); setNewPassword(""); setEditing(false);
  };

  return (
    <main className="profile-page">
      <div className="profile-layout">
        <section className="profile-card profile-main" aria-labelledby="profile-title">
          <header className="profile-heading">
            <div className="profile-identity"><div className="profile-avatar" aria-hidden="true">{user.email.charAt(0).toUpperCase()}</div><div><p className="eyebrow">Cuenta personal</p><h1 id="profile-title">Tu cuenta</h1><p className="profile-email">{user.email}</p></div></div>
            <span className="status-badge"><span /> Activa</span>
          </header>

          {message && <p className={`profile-message ${message.type}`} role="status">{message.text}</p>}

          <section className="account-section" aria-labelledby="account-info-title">
            <div className="section-heading"><div><p className="section-kicker">Información</p><h2 id="account-info-title">Datos de la cuenta</h2></div>{!editing && <button type="button" className="text-button" onClick={() => { setEditing(true); setMessage(null); }}>Editar perfil</button>}</div>
            {editing ? (
              <form className="profile-form" onSubmit={saveProfile}>
                <label htmlFor="profile-email">Correo electrónico</label><input id="profile-email" type="email" maxLength="120" required value={email} onChange={event => setEmail(event.target.value)} />
                <label htmlFor="current-password">Contraseña actual</label><input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
                <label htmlFor="new-password">Nueva contraseña <span>(opcional, mínimo 10 caracteres)</span></label><input id="new-password" type="password" autoComplete="new-password" minLength="10" maxLength="128" value={newPassword} onChange={event => setNewPassword(event.target.value)} />
                <div className="profile-actions"><button type="submit" disabled={submitting}>{submitting ? "Guardando…" : "Guardar cambios"}</button><button type="button" className="button-secondary" onClick={cancelEditing}>Cancelar</button></div>
              </form>
            ) : (
              <dl className="profile-details"><div><span className="detail-icon"><Icon name="mail" /></span><dt>Correo electrónico</dt><dd>{user.email}</dd></div><div><span className="detail-icon"><Icon name="calendar" /></span><dt>Cuenta creada</dt><dd>{formatDate(user.created_at)}</dd></div></dl>
            )}
          </section>

          <section className="account-section security-section" aria-labelledby="security-title">
            <div className="section-heading"><div><p className="section-kicker">Protección</p><h2 id="security-title">Seguridad</h2></div><span className="security-summary"><Icon name="shield" /> Protegida</span></div>
            <div className="security-grid">
              <div><span className="security-item-icon"><Icon name="shield" /></span><p><strong>Correo verificado</strong><small>{user.email_verified ? "Identidad confirmada" : "Verificación pendiente"}</small></p><span className={user.email_verified ? "check-mark" : "pending-mark"}>{user.email_verified ? "✓" : "!"}</span></div>
              <div><span className="security-item-icon"><Icon name="key" /></span><p><strong>Contraseña protegida</strong><small>Hash seguro, nunca visible</small></p><span className="check-mark">✓</span></div>
              <div><span className="security-item-icon"><Icon name="session" /></span><p><strong>Sesión HttpOnly</strong><small>JWT, CSRF y renovación segura</small></p><span className="check-mark">✓</span></div>
              <div><span className="security-item-icon"><Icon name="clock" /></span><p><strong>Último acceso</strong><small>{formatLastAccess(user.last_login)}</small></p></div>
            </div>
          </section>
          <div className="profile-footer-actions"><Logout /></div>
        </section>

        <section className="danger-zone" aria-labelledby="danger-title"><div><p className="section-kicker danger-kicker">Zona de peligro</p><h2 id="danger-title">Eliminar cuenta</h2><p>Elimina permanentemente tu perfil, sesiones y datos asociados. Esta acción no se puede deshacer.</p></div><button type="button" className="delete-account" onClick={() => { setDeleteOpen(true); setMessage(null); }}>Eliminar mi cuenta</button></section>
      </div>

      {deleteOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDeleteOpen(false); }}><section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title"><div className="dialog-danger-icon" aria-hidden="true">!</div><p className="section-kicker danger-kicker">Confirmación necesaria</p><h2 id="delete-dialog-title">¿Eliminar tu cuenta?</h2><p>Introduce tu contraseña para confirmar. Tus datos y sesiones se eliminarán de forma permanente.</p><form onSubmit={deleteAccount}><label htmlFor="delete-password">Contraseña actual</label><input id="delete-password" type="password" autoComplete="current-password" required autoFocus value={deletePassword} onChange={event => setDeletePassword(event.target.value)} /><div className="dialog-actions"><button type="button" className="button-secondary" onClick={() => { setDeleteOpen(false); setDeletePassword(""); }}>Cancelar</button><button type="submit" className="danger-button" disabled={submitting}>{submitting ? "Eliminando…" : "Eliminar definitivamente"}</button></div></form></section></div>}
    </main>
  );
};

export default Private;
