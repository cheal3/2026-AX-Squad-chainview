import type { ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";

function lazyPage<TModule extends Record<string, ComponentType>>(
  importer: () => Promise<TModule>,
  exportName: keyof TModule
) {
  return async () => {
    const module = await importer();
    return { Component: module[exportName] };
  };
}

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: Layout,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        {
          path: "dashboard",
          lazy: lazyPage(
            () => import("./pages/IncidentDemoDashboard"),
            "IncidentDemoDashboard"
          ),
        },
        {
          path: "incident-demo-dashboard",
          element: <Navigate to="/dashboard" replace />,
        },
        {
          path: "service-catalog/relations",
          lazy: lazyPage(
            () => import("./pages/ServiceRelationFlow"),
            "ServiceRelationFlow"
          ),
        },
        {
          path: "relations",
          element: <Navigate to="/service-catalog/relations" replace />,
        },
        {
          path: "relation-graph",
          element: <Navigate to="/service-catalog/relations" replace />,
        },
        {
          path: "incidents",
          lazy: lazyPage(() => import("./pages/IncidentImpact"), "IncidentListPage"),
        },
        {
          path: "incidents/:incidentId",
          lazy: lazyPage(() => import("./pages/IncidentImpact"), "IncidentImpact"),
        },
        {
          path: "incident-status",
          lazy: lazyPage(
            () => import("./pages/IncidentStatusDashboard"),
            "IncidentStatusDashboard"
          ),
        },
        {
          path: "world-map",
          lazy: lazyPage(() => import("./pages/ServerWorldMap"), "ServerWorldMap"),
        },
        {
          path: "servers",
          lazy: lazyPage(() => import("./pages/ServerPortal"), "ServerPortal"),
        },
        {
          path: "services",
          lazy: lazyPage(() => import("./pages/ServicePortal"), "ServicePortal"),
        },
        {
          path: "services/:serviceId",
          lazy: lazyPage(
            () => import("./pages/ServiceDetailPage"),
            "ServiceDetailPage"
          ),
        },
        {
          path: "service-relations",
          lazy: lazyPage(
            () => import("./pages/MonitorAdminPages"),
            "ServiceRelationsAdminPage"
          ),
        },
        {
          path: "service-categories",
          lazy: lazyPage(
            () => import("./pages/MonitorAdminPages"),
            "ServiceCategoryPage"
          ),
        },
        {
          path: "tech-stacks",
          lazy: lazyPage(() => import("./pages/MonitorAdminPages"), "TechStackPage"),
        },
        {
          path: "deployments",
          lazy: lazyPage(() => import("./pages/MonitorAdminPages"), "DeploymentsPage"),
        },
        {
          path: "users",
          lazy: lazyPage(() => import("./pages/MonitorAdminPages"), "UsersPage"),
        },
        {
          path: "groups",
          lazy: lazyPage(() => import("./pages/MonitorAdminPages"), "GroupsPage"),
        },
        {
          path: "service-owners",
          lazy: lazyPage(
            () => import("./pages/MonitorAdminPages"),
            "ServiceOwnersPage"
          ),
        },
        {
          path: "common-codes",
          lazy: lazyPage(
            () => import("./pages/MonitorAdminPages"),
            "CommonCodesPage"
          ),
        },
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
