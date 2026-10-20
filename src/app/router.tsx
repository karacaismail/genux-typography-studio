import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { Studio } from './Studio';
import { validateStudioSearch } from './search';

const rootRoute = createRootRoute();
export const studioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validateStudioSearch,
  component: Studio,
});
export const router = createRouter({
  basepath: import.meta.env.BASE_URL,
  routeTree: rootRoute.addChildren([studioRoute]),
  defaultPreload: false,
  scrollRestoration: false,
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
