import React, { lazy, Suspense } from "react";
import ScrollToTop from "./component/scrollToTop";
import injectContext from "./store/appContext";
import Navbar from "./component/navbar";
import ProtectedRoute from "./component/ProtectedRoute.jsx";
import ManejoError from "./component/manejoError.jsx";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Footer } from "./component/footer";
import GlobalNotice from "./component/GlobalNotice.jsx";

const Home = lazy(() => import("./pages/home").then(module => ({ default: module.Home })));
const Signup = lazy(() => import("./component/Signup.jsx"));
const LogIn = lazy(() => import("./component/LogIn.jsx"));
const Private = lazy(() => import("./component/Private.jsx"));
const CheckEmail = lazy(() => import("./pages/AuthFlows.jsx").then(module => ({ default: module.CheckEmail })));
const VerifyEmail = lazy(() => import("./pages/AuthFlows.jsx").then(module => ({ default: module.VerifyEmail })));
const ForgotPassword = lazy(() => import("./pages/AuthFlows.jsx").then(module => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import("./pages/AuthFlows.jsx").then(module => ({ default: module.ResetPassword })));

const RoutedApplication = () => {
  const location = useLocation();
  return (
    <ManejoError key={location.pathname}>
      <div>
        <GlobalNotice />
        <ScrollToTop>
          <Navbar />
          <Suspense fallback={<main className="page-state" aria-live="polite">Cargando…</main>}>
          <Routes>
            <Route element={<Home />} path="/" />
            <Route element={<Signup />} path="/signup" />
            <Route element={<LogIn />} path="/login" />
            <Route element={<CheckEmail />} path="/check-email" />
            <Route element={<VerifyEmail />} path="/verify-email" />
            <Route element={<ForgotPassword />} path="/forgot-password" />
            <Route element={<ResetPassword />} path="/reset-password" />
            <Route
              path="/profile"
              element={<ProtectedRoute><Private /></ProtectedRoute>}
            />
            <Route element={<main className="page-state"><h1>Página no encontrada</h1></main>} path="*" />
          </Routes>
          </Suspense>
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
