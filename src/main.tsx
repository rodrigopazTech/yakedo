import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { iniciarFirebase } from "./firebase.ts";
import "./estilos.css";

iniciarFirebase();

const raiz = document.getElementById("root");

if (!raiz) {
  throw new Error("No se encontró #root");
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
