import { RouterProvider } from "react-router";
import { router } from "./routes";
import { PortalDataProvider } from "./PortalDataStore";

export default function App() {
  return (
    <PortalDataProvider>
      <RouterProvider router={router} />
    </PortalDataProvider>
  );
}
