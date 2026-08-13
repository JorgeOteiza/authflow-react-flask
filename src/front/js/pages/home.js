import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/appContext";
import "../../styles/home.css";

export const Home = () => {
  const { store } = useContext(Context);
  return (
    <main className="home-page">
      <section className="hero">
        <div>
          <p className="eyebrow">React · Flask · JWT</p>
          <h1>Autenticación full stack, construida con seguridad en mente.</h1>
          <p className="hero-copy">AuthFlow demuestra registro, sesiones protegidas con cookies HttpOnly, renovación de tokens y gestión segura del perfil.</p>
          <div className="hero-actions">
            <Link className="button-primary" to={store.user ? "/profile" : "/signup"}>{store.user ? "Ir a mi perfil" : "Probar AuthFlow"}</Link>
            {!store.user && <Link className="button-secondary" to="/login">Ya tengo una cuenta</Link>}
          </div>
        </div>
        <div className="security-panel" aria-label="Características de seguridad">
          <span className="lock-mark" aria-hidden="true">🔐</span>
          <h2>Tu sesión, bajo control</h2>
          <ul>
            <li>Contraseñas almacenadas con hash</li>
            <li>Cookies HttpOnly y protección CSRF</li>
            <li>Tokens de acceso y renovación</li>
            <li>Límites contra intentos automatizados</li>
          </ul>
        </div>
      </section>
    </main>
  );
};
