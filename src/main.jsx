import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/index.css";
import "../ChainView/pages/admin-common.css";
import "./dashboard-theme.css";

const basePath = import.meta.env.BASE_URL || "/";
const normalizedBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;
const currentPath = window.location.pathname;
const legacyRoute = currentPath.startsWith(normalizedBasePath)
  ? currentPath.slice(normalizedBasePath.length)
  : "";

if (legacyRoute && !window.location.hash) {
  const query = window.location.search || "";
  window.history.replaceState(
    null,
    "",
    `${normalizedBasePath}#/${legacyRoute}${query}`
  );
}

createRoot(document.getElementById("root")).render(
  <HashRouter>
    <App />
  </HashRouter>
);
