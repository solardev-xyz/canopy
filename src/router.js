import { createRouter, createWebHashHistory } from 'vue-router';

// Hash history: canopy is served from content-addressed hosts (bzz://…)
// where the server can't rewrite arbitrary paths to index.html. Same
// choice swarmit made.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    {
      path: '/:rid(rad:[a-zA-Z0-9]+)',
      component: () => import('./views/RepoLayout.vue'),
      props: true,
      children: [
        { path: '', name: 'code', component: () => import('./views/CodeView.vue') },
        {
          path: 'tree/:path(.*)',
          name: 'tree',
          component: () => import('./views/CodeView.vue'),
        },
        {
          path: 'blob/:path(.*)',
          name: 'blob',
          component: () => import('./views/BlobView.vue'),
        },
        { path: 'commits', name: 'commits', component: () => import('./views/CommitsView.vue') },
        {
          path: 'commits/:sha([0-9a-f]+)',
          name: 'commit',
          component: () => import('./views/CommitView.vue'),
        },
        { path: 'issues', name: 'issues', component: () => import('./views/IssuesView.vue') },
        {
          path: 'issues/:id([0-9a-f]+)',
          name: 'issue',
          component: () => import('./views/IssueView.vue'),
        },
        { path: 'patches', name: 'patches', component: () => import('./views/PatchesView.vue') },
        {
          path: 'patches/:id([0-9a-f]+)',
          name: 'patch',
          component: () => import('./views/PatchView.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
