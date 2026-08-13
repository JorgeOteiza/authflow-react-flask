import React from "react";
import ScrollToTop from "./component/scrollToTop";
import injectContext from "./store/appContext";
import Signup from "./component/Signup.jsx";
import LogIn from "./component/LogIn.jsx";
import Private from "./component/Private.jsx";
import Navbar from "./component/navbar";
import ProtectedRoute from "./component/ProtectedRoute.jsx";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/home";
import { Footer } from "./component/footer";

const Layout = () => {
  const basename = process.env.BASENAME || "";

  return (
    <div>
      <BrowserRouter basename={basename}>
        <ScrollToTop>
          <Navbar />
          <Routes>
            <Route element={<Home />} path="/" />
            <Route element={<Signup />} path="/signup" />
            <Route element={<LogIn />} path="/login" />
            <Route
              path="/profile"
              element={<ProtectedRoute><Private /></ProtectedRoute>}
            />
            <Route element={<main className="page-state"><h1>Página no encontrada</h1></main>} path="*" />
          </Routes>
          <Footer />
        </ScrollToTop>
      </BrowserRouter>
    </div>
  );
};

export default injectContext(Layout);
