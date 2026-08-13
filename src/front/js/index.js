import React from "react";
import { createRoot } from "react-dom/client";
import ManejoError from "./component/manejoError.jsx";

//include your index.scss file into the bundle
import "../styles/index.css";

//import your own components
import Layout from "./layout";

// Renderiza la aplicación dentro del componente de manejo de errores
createRoot(document.getElementById("app")).render(
    <ManejoError>
      <Layout />
    </ManejoError>,
  );
