/**
 * Compliance Dashboard Constants
 * Centralized configuration for endpoints and tab definitions
 */

export const API_ENDPOINTS = {
  overview: '/admin/compliance-dashboard/overview',
  acceptanceByVersion: '/admin/compliance-dashboard/acceptance-by-version',
  userStatus: '/admin/compliance-dashboard/user-status',
  notificationMetrics: '/admin/compliance-dashboard/notification-metrics',
  timeline: '/admin/compliance-dashboard/timeline?days=30',
  export: '/admin/compliance-dashboard/export'
};

export const DASHBOARD_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    emoji: '📊',
    requiredData: 'overview'
  },
  {
    id: 'versions',
    label: 'By Version',
    emoji: '📈',
    requiredData: 'acceptanceByVersion'
  },
  {
    id: 'users',
    label: 'Users',
    emoji: '👥',
    requiredData: 'userStatus'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    emoji: '🔔',
    requiredData: 'notificationMetrics'
  },
  {
    id: 'timeline',
    label: 'Timeline',
    emoji: '📅',
    requiredData: 'timeline'
  }
];

export const LOAD_ENDPOINTS = [
  { key: 'overview', url: API_ENDPOINTS.overview },
  { key: 'acceptanceByVersion', url: API_ENDPOINTS.acceptanceByVersion },
  { key: 'userStatus', url: API_ENDPOINTS.userStatus },
  { key: 'notificationMetrics', url: API_ENDPOINTS.notificationMetrics },
  { key: 'timeline', url: API_ENDPOINTS.timeline }
];
