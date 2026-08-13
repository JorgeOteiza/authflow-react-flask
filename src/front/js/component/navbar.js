import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/context.js";

const Navbar = () => {
  const { store } = useContext(Context);
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Navegación principal">
        <Link className="brand" to="/">
          <span className="brand-mark"><svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm3 0h4V7a2 2 0 1 0-4 0v3Zm2 4a2 2 0 0 0-1 3.73V19h2v-1.27A2 2 0 0 0 12 14Z" /></svg></span>
          <span>AuthFlow</span>
        </Link>
        <div className="nav-actions">
          {store.user ? (
            <Link className="nav-primary" to="/profile">Mi perfil</Link>
          ) : (
            <>
              <Link to="/login">Iniciar sesión</Link>
              <Link className="nav-primary" to="/signup">Crear cuenta</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
