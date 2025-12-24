import { Navigate, type RouteObject } from "react-router-dom";

import UserPage from "@/pages/user";
import UsersPage from "@/pages/users";
import UserSettingsPage from "@/pages/user/settings";


import AppLayout from "@/layouts/user-layout";
import MainLayout from "@/layouts/main";
import { withUserProviders } from "@/provider/user";

interface AppRoute {
  path?: string;
  index?: boolean;
  element?: React.ReactNode;
  children?: AppRoute[];
}

const UserLayout = withUserProviders(AppLayout);

export const routes: AppRoute[] = [
  {
    element: <MainLayout />,
    children: [
      { path: "/", index: true, element: <Navigate to="/users" replace /> },

      { path: "/users", element: <UsersPage /> },

      {
        path: "/users/:id",
        children: [
          {
            element: <UserLayout />,
            children: [
              {
                index: true,
                element: <UserPage />,
              },
              {
                path: "settings",
                element: <UserSettingsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
];

export const prepareRoutes = (routes: AppRoute[]): RouteObject[] => {
  return routes.map(({ path, index, element, children }) => {
    const hasChildren = Array.isArray(children) && children.length > 0;

    if (index) {
      return { index: true, element };
    }

    return {
      path,
      element: element,
      children: hasChildren ? prepareRoutes(children) : undefined,
    };
  });
};
