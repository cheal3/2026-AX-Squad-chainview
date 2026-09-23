import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/index.css";
import "../ChainView/pages/admin-common.css";
import "./dashboard-theme.css";

const basePath = import.meta.env.BASE_URL || "/";
if (window.location.hash.startsWith("#/")) {
  window.history.replaceState(
    null,
    "",
    `${basePath}${window.location.hash.slice(2)}`
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter basename={basePath}>
    <App />
  </BrowserRouter>
);
