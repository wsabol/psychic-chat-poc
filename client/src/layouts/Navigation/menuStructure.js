/**
 * Menu structure configuration
 * Defines all navigation items and submenus
 * Labels are translation keys - will be translated by the component
 */
export const menuStructure = [
  {
    id: 'chat',
    labelKey: 'menu.chat',
    icon: '💬',
    type: 'page',
    pageId: 'chat',
  },
  {
    id: 'astrology',
    labelKey: 'menu.astrology.title',
    icon: '✨',
    type: 'category',
    submenu: [
      { id: 'mySign', labelKey: 'menu.astrology.mySign', icon: '♈', pageId: 'sign' },
      { id: 'horoscope', labelKey: 'menu.astrology.horoscope', icon: '🔮', pageId: 'horoscope' },
      { id: 'moonPhase', labelKey: 'menu.astrology.moonPhase', icon: '🌙', pageId: 'moon' },
      { id: 'cosmicWeather', labelKey: 'menu.astrology.cosmicWeather', icon: '🌌', pageId: 'cosmic' },
      { id: 'venusLove', labelKey: 'menu.astrology.venusLove', icon: '💕', pageId: 'venus' },
    ],
  },
  {
    id: 'billing',
    labelKey: 'menu.billing.title',
    icon: '💳',
    type: 'page',
    pageId: 'billing',
  },
  {
    id: 'accountManagement',
    labelKey: 'menu.myAccount.title',
    icon: '👤',
    type: 'category',
    submenu: [
      { id: 'personalInfo', labelKey: 'menu.myAccount.personalInfo', icon: '👤', pageId: 'personal' },
      { id: 'preferences', labelKey: 'menu.myAccount.preferences', icon: '🎯', pageId: 'preferences' },
      { id: 'security', labelKey: 'menu.myAccount.security', icon: '🔒', pageId: 'security' },
      { id: 'settings', labelKey: 'menu.myAccount.settings', icon: '⚙️', pageId: 'settings' },
    ],
  },
  {
    id: 'admin',
    labelKey: 'menu.admin',
    icon: '⚡',
    type: 'page',
    pageId: 'admin',
    adminOnly: true,
  },
];
