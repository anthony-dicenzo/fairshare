export function prefetchPages() {
  if (typeof window === 'undefined') return;

  // Trigger dynamic imports so the browser fetches the chunks in the background
  import('@/pages/home-page');
  import('@/pages/group-page');
  import('@/pages/groups-page');
  import('@/pages/activity-page');
  import('@/pages/profile-page');
}
