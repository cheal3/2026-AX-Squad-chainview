import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ServerManagement } from "./pages/ServerManagement";
import { ServiceManagement } from "./pages/ServiceManagement";
import { ServiceRelations } from "./pages/ServiceRelations";
import { IncidentImpact } from "./pages/IncidentImpact";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "servers", Component: ServerManagement },
      { path: "services", Component: ServiceManagement },
      { path: "relations", Component: ServiceRelations },
      { path: "incidents", Component: IncidentImpact },
    ],
  },
]);
