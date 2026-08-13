import React from "react";
import ScrollToTop from "./component/scrollToTop";
import injectContext from "./store/appContext";
import Signup from "./component/Signup.jsx";
import LogIn from "./component/LogIn.jsx";
import Private from "./component/Private.jsx";
import Navbar from "./component/navbar";
import ProtectedRoute from "./component/ProtectedRoute.jsx";
import ManejoError from "./component/manejoError.jsx";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Home } from "./pages/home";
import { Footer } from "./component/footer";

const RoutedApplication = () => {
  const location = useLocation();
  return (
    <ManejoError key={location.pathname}>
      <div>
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
      </div>
    </ManejoError>
  );
};

const Layout = () => {
  const basename = process.env.BASENAME || "";
  return (
    <BrowserRouter basename={basename}>
      <RoutedApplication />
    </BrowserRouter>
  );
};

export default injectContext(Layout);
