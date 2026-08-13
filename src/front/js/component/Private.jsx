import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/context.js";
import Logout from "./LogOut.jsx";
import "../../styles/perfil.css";

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

  const saveProfile = async event => {
    event.preventDefault();
    setSubmitting(true);
    const result = await actions.updateAccount({
      email,
      current_password: currentPassword,
      new_password: newPassword || undefined
    });
    setSubmitting(false);
    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setEditing(false);
      setMessage({ type: "success", text: "Perfil actualizado correctamente." });
    } else {
      setMessage({ type: "error", text: result.message });
    }
  };

  const deleteAccount = async () => {
    const password = window.prompt("Confirma tu contraseña para eliminar definitivamente la cuenta:");
    if (!password) return;
    if (!window.confirm("Esta acción no se puede deshacer. ¿Eliminar la cuenta?")) return;
    const result = await actions.deleteAccount(password);
    if (result.ok) navigate("/");
    else setMessage({ type: "error", text: result.message });
  };

  return (
    <main className="profile-page">
      <section className="profile-card" aria-labelledby="profile-title">
        <div className="profile-heading">
          <div className="profile-avatar" aria-hidden="true">{user.email.charAt(0).toUpperCase()}</div>
          <div><p className="eyebrow">Sesión protegida</p><h1 id="profile-title">Tu perfil</h1><p className="profile-email">{user.email}</p></div>
        </div>
        <dl className="profile-details">
          <div><dt>Cuenta creada</dt><dd>{new Date(user.created_at).toLocaleString()}</dd></div>
          <div><dt>Último acceso</dt><dd>{user.last_login ? new Date(user.last_login).toLocaleString() : "Primer acceso"}</dd></div>
          <div><dt>Estado</dt><dd><span className="status-badge">Activa</span></dd></div>
        </dl>

        {message && <p className={`profile-message ${message.type}`} role="status">{message.text}</p>}

        {editing ? (
          <form className="profile-form" onSubmit={saveProfile}>
            <label htmlFor="profile-email">Correo electrónico</label>
            <input id="profile-email" type="email" maxLength="120" required value={email} onChange={event => setEmail(event.target.value)} />
            <label htmlFor="current-password">Contraseña actual</label>
            <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
            <label htmlFor="new-password">Nueva contraseña <span>(opcional)</span></label>
            <input id="new-password" type="password" autoComplete="new-password" minLength="8" maxLength="128" value={newPassword} onChange={event => setNewPassword(event.target.value)} />
            <div className="profile-actions">
              <button type="submit" disabled={submitting}>{submitting ? "Guardando…" : "Guardar cambios"}</button>
              <button type="button" className="button-secondary" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <div className="profile-actions">
            <button type="button" onClick={() => { setEditing(true); setMessage(null); }}>Editar perfil</button>
            <Logout />
          </div>
        )}

        <button type="button" className="delete-account" onClick={deleteAccount}>Eliminar mi cuenta</button>
      </section>
    </main>
  );
};

export default Private;
