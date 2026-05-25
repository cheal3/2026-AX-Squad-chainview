import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { IncidentImpact } from "./pages/IncidentImpact";
import { IncidentStatusDashboard } from "./pages/IncidentStatusDashboard";
import { ServerPortal } from "./pages/ServerPortal";
import { ServerWorldMap } from "./pages/ServerWorldMap";
import { ServicePortal } from "./pages/ServicePortal";
import { ServiceRelationFlow } from "./pages/ServiceRelationFlow";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: Dashboard },
      { path: "incident-status", Component: IncidentStatusDashboard },
      { path: "world-map", Component: ServerWorldMap },
      { path: "servers", Component: ServerPortal },
      { path: "services", Component: ServicePortal },
      { path: "relations", Component: ServiceRelationFlow },
      { path: "incidents", Component: IncidentImpact },
      { path: "portal", element: <Navigate to="/dashboard" replace /> },
      { path: "portal/dependencies", element: <Navigate to="/services" replace /> },
      { path: "portal/services", element: <Navigate to="/services" replace /> },
      { path: "portal/relations", element: <Navigate to="/relations" replace /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
