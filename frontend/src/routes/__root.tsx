import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ThemeProvider } from "../components/theme-provider";
import Header from "../components/Header";
import { Toaster } from "../components/ui/sonner";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

const isDevelopment = import.meta.env.DEV;

const DevTools = isDevelopment
  ? lazy(() =>
      Promise.all([
        import("@tanstack/react-devtools"),
        import("@tanstack/react-router-devtools"),
        import("../integrations/tanstack-query/devtools"),
      ]).then(([devtools, router, query]) => ({
        default: () => (
          <devtools.TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <router.TanStackRouterDevtoolsPanel />,
              },
              query.default,
            ]}
          />
        ),
      }))
    )
  : null;

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <ThemeProvider defaultTheme="system" storageKey="football-rag-theme">
      <Header />
      <Outlet />
      <Toaster position="bottom-right" />
      {isDevelopment && DevTools && (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      )}
    </ThemeProvider>
  ),
});
