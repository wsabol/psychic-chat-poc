/**
 * Menu structure configuration
 * Defines all navigation items and submenus
 */
export const menuStructure = [
  {
    id: 'chat',
    label: 'Chat',
    icon: '💬',
    type: 'page',
    pageId: 'chat',
  },
  {
    id: 'accountManagement',
    label: 'My Account',
    icon: '👤',
    type: 'category',
    submenu: [
      { id: 'personalInfo', label: 'Personal Information', icon: '👤', pageId: 'personal' },
      { id: 'security', label: 'Security', icon: '🔒', pageId: 'security' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & Subscriptions',
    icon: '💳',
    type: 'page',
    pageId: 'billing',
  },
  {
    id: 'astrology',
    label: 'Astrology',
    icon: '✨',
    type: 'category',
    submenu: [
      { id: 'mySign', label: 'My Sign', icon: '♈', pageId: 'sign' },
      { id: 'moonPhase', label: 'Moon Phase', icon: '🌙', pageId: 'moon' },
      { id: 'horoscope', label: 'Horoscope', icon: '🔮', pageId: 'horoscope' },
      { id: 'cosmicWeather', label: 'Cosmic Weather', icon: '🌌', pageId: 'cosmic' },
    ],
  },
];
