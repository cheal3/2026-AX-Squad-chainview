import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { IncidentImpact, IncidentListPage } from "./pages/IncidentImpact";
import { IncidentStatusDashboard } from "./pages/IncidentStatusDashboard";
import {
  CommonCodesPage,
  DeploymentsPage,
  GroupsPage,
  ServiceCategoryPage,
  ServiceOwnersPage,
  ServiceRelationsAdminPage,
  TechStackPage,
  UsersPage,
} from "./pages/MonitorAdminPages";
import { ServerPortal } from "./pages/ServerPortal";
import { ServerWorldMap } from "./pages/ServerWorldMap";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";
import { ServicePortal } from "./pages/ServicePortal";
import { ServiceRelationFlow } from "./pages/ServiceRelationFlow";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: Layout,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: "dashboard", Component: Dashboard },
        { path: "service-catalog/relations", Component: ServiceRelationFlow },
        {
          path: "relations",
          element: <Navigate to="/service-catalog/relations" replace />,
        },
        {
          path: "relation-graph",
          element: <Navigate to="/service-catalog/relations" replace />,
        },
        { path: "incidents", Component: IncidentListPage },
        { path: "incidents/:incidentId", Component: IncidentImpact },
        { path: "incident-status", Component: IncidentStatusDashboard },
        { path: "world-map", Component: ServerWorldMap },
        { path: "servers", Component: ServerPortal },
        { path: "services", Component: ServicePortal },
        { path: "services/:serviceId", Component: ServiceDetailPage },
        { path: "service-relations", Component: ServiceRelationsAdminPage },
        { path: "service-categories", Component: ServiceCategoryPage },
        { path: "tech-stacks", Component: TechStackPage },
        { path: "deployments", Component: DeploymentsPage },
        { path: "users", Component: UsersPage },
        { path: "groups", Component: GroupsPage },
        { path: "service-owners", Component: ServiceOwnersPage },
        { path: "common-codes", Component: CommonCodesPage },
        { path: "portal", element: <Navigate to="/dashboard" replace /> },
        {
          path: "portal/dependencies",
          element: <Navigate to="/services" replace />,
        },
        { path: "portal/services", element: <Navigate to="/services" replace /> },
        {
          path: "portal/relations",
          element: <Navigate to="/service-catalog/relations" replace />,
        },
        { path: "chainview/*", element: <Navigate to="/dashboard" replace /> },
        { path: "pages/*", element: <Navigate to="/dashboard" replace /> },
        { path: "*", element: <Navigate to="/dashboard" replace /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
