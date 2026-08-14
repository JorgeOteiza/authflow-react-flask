import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/context.js";
import "../../styles/home.css";

export const Home = () => {
  const { store } = useContext(Context);

  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-content">
          <div className="tech-pill"><span aria-hidden="true" /> React · Flask · PostgreSQL</div>
          <h1>Autenticación moderna, <span>simple y segura.</span></h1>
          <p className="hero-copy">Cuentas verificadas, sesiones revocables y perfiles protegidos sobre una arquitectura full stack preparada para el mundo real.</p>
          <div className="hero-actions">
            <Link className="button-primary" to={store.user ? "/profile" : "/signup"}>{store.user ? "Ir a mi perfil" : "Crear cuenta gratis"}<span aria-hidden="true">→</span></Link>
            {!store.user && <Link className="button-secondary" to="/login">Ya tengo una cuenta</Link>}
          </div>
          <div className="trust-row" aria-label="Garantías de seguridad">
            <span>✓ Contraseñas cifradas</span><span>✓ Correo verificado</span><span>✓ Sesiones revocables</span>
          </div>
        </div>
        <div className="security-panel" aria-label="Características de seguridad">
          <div className="panel-orbit panel-orbit-one" aria-hidden="true" />
          <div className="panel-orbit panel-orbit-two" aria-hidden="true" />
          <div className="security-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Z"/><path d="m9.3 12 1.8 1.8 3.8-4"/></svg></div>
          <p className="panel-label">Estado del sistema</p><h2>Protección activa</h2>
          <div className="security-list">
            <div><span className="feature-icon">01</span><p><strong>Cookies HttpOnly</strong><small>Tokens fuera del alcance de JavaScript</small></p></div>
            <div><span className="feature-icon">02</span><p><strong>Verificación y CSRF</strong><small>Identidad y operaciones sensibles protegidas</small></p></div>
            <div><span className="feature-icon">03</span><p><strong>Rotación y revocación</strong><small>Sesiones renovables que puedes invalidar</small></p></div>
          </div>
          <div className="panel-stack" aria-label="Infraestructura"><span>PostgreSQL</span><span>Redis</span><span>JWT</span></div>
        </div>
      </section>
    </main>
  );
};
