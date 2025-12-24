import { prepareRoutes, routes } from "./routes";
import { useRoutes } from "react-router-dom";

function AppRouter() {
  return useRoutes(prepareRoutes(routes));
}

export default AppRouter;
