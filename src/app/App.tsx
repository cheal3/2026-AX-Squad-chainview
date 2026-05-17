import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ServiceRelationProvider } from "./ServiceRelationStore";

export default function App() {
  return (
    <ServiceRelationProvider>
      <RouterProvider router={router} />
    </ServiceRelationProvider>
  );
}
