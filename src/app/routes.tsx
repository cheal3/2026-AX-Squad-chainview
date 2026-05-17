import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ServerManagement } from "./pages/ServerManagement";
import { ServiceManagement } from "./pages/ServiceManagement";
import { ServiceRelations } from "./pages/ServiceRelations";
import { IncidentImpact } from "./pages/IncidentImpact";
import { ServiceDependencies } from "./pages/ServiceDependencies";
import { ServiceRelationFlow } from "./pages/ServiceRelationFlow";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/portal" replace /> },
      { path: "portal", Component: Dashboard },
      { path: "portal/dependencies", Component: ServiceDependencies },
      { path: "portal/relations", Component: ServiceRelationFlow },
      { path: "admin/servers", Component: ServerManagement },
      { path: "admin/services", Component: ServiceManagement },
      { path: "admin/relations", Component: ServiceRelations },
      { path: "admin/incidents", Component: IncidentImpact },
      { path: "servers", element: <Navigate to="/admin/servers" replace /> },
      { path: "services", element: <Navigate to="/admin/services" replace /> },
      { path: "relations", element: <Navigate to="/portal/relations" replace /> },
      { path: "incidents", element: <Navigate to="/admin/incidents" replace /> },
    ],
  },
]);
