import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/index.css";
import "../ChainView/pages/admin-common.css";
import "./dashboard-theme.css";

const basePath = import.meta.env.BASE_URL || "/";

if (window.location.hash === "" && basePath !== "/" && window.location.pathname.startsWith(basePath)) {
  const deepPath = window.location.pathname.slice(basePath.length - 1);
  if (deepPath && deepPath !== "/") {
    window.history.replaceState(
      null,
      "",
      `${basePath}#${deepPath}${window.location.search}`
    );
  }
}

createRoot(document.getElementById("root")).render(
  <HashRouter>
    <App />
  </HashRouter>
);
