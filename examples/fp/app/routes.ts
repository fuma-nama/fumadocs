import { defineRoutes } from 'fumapress';

export default defineRoutes({
  root: {
    id: 'root',
    path: '',
    lazy: () => import('./root'),
  },
});
