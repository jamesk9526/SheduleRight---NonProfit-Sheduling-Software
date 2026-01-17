/**
 * Help Desk Search Index
 * Centralized searchable index of documentation, API endpoints, guides, and tools
 */

export interface HelpItem {
  id: string
  title: string
  description: string
  category: 'docs' | 'api' | 'feature' | 'guide' | 'tool'
  url: string
  keywords: string[]
  icon?: string
}

export const helpIndex: HelpItem[] = [
  // API Endpoints
  {
    id: 'api-base',
    title: 'API Base URL',
    description: 'Server API base URL: /api/v1',
    category: 'api',
    url: '/api/v1',
    keywords: ['api', 'base', 'url', 'endpoint', 'server'],
    icon: '🔌',
  },
  {
    id: 'api-auth',
    title: 'Authentication API',
    description: 'Login and token refresh endpoints',
    category: 'api',
    url: '/api/v1/auth/login',
    keywords: ['auth', 'login', 'token', 'jwt', 'authentication'],
    icon: '🔐',
  },
  {
    id: 'api-bookings',
    title: 'Bookings API',
    description: 'Create and manage bookings',
    category: 'api',
    url: '/api/v1/bookings',
    keywords: ['bookings', 'appointments', 'scheduling', 'calendar'],
    icon: '📅',
  },
  {
    id: 'api-properties',
    title: 'Custom Properties API',
    description: 'Manage custom fields and property definitions',
    category: 'api',
    url: '/api/v1/properties',
    keywords: ['properties', 'custom fields', 'field library', 'metadata'],
    icon: '🏷️',
  },
  {
    id: 'api-public-branding',
    title: 'Public Branding API',
    description: 'Fetch organization branding (logo, colors) without authentication',
    category: 'api',
    url: '/api/v1/public/orgs/:orgId/branding',
    keywords: ['branding', 'public', 'logo', 'colors', 'theme'],
    icon: '🎨',
  },

  // Features & Tools
  {
    id: 'feature-properties',
    title: 'Custom Properties',
    description: 'Manage custom fields for clients, appointments, sites, and more',
    category: 'feature',
    url: '/properties',
    keywords: ['custom fields', 'properties', 'field library', 'metadata', 'configuration'],
    icon: '⚙️',
  },
  {
    id: 'feature-embed',
    title: 'Embed Widget',
    description: 'Generate and configure booking widget for your website',
    category: 'feature',
    url: '/embed',
    keywords: ['embed', 'widget', 'integration', 'website', 'booking form'],
    icon: '🔗',
  },
  {
    id: 'feature-branding',
    title: 'Organization Branding',
    description: 'Configure logo, colors, and branding settings',
    category: 'feature',
    url: '/orgs',
    keywords: ['branding', 'logo', 'colors', 'theme', 'organization settings'],
    icon: '🎨',
  },
  {
    id: 'feature-messaging',
    title: 'SMS Reminders',
    description: 'Configure automated SMS reminders via Twilio',
    category: 'feature',
    url: '/reminders',
    keywords: ['sms', 'reminders', 'notifications', 'twilio', 'messaging'],
    icon: '📱',
  },

  // Guides & Documentation
  {
    id: 'guide-booking-api',
    title: 'Booking API Guide',
    description: 'Complete guide to availability and booking endpoints',
    category: 'guide',
    url: '/docs/booking-api',
    keywords: ['bookings', 'api', 'guide', 'documentation', 'tutorial'],
    icon: '📖',
  },
  {
    id: 'guide-embed',
    title: 'Embed Widget Guide',
    description: 'How to embed the booking widget on your website',
    category: 'guide',
    url: '/docs/embed-guide',
    keywords: ['embed', 'widget', 'integration', 'tutorial', 'website'],
    icon: '📖',
  },
  {
    id: 'guide-properties',
    title: 'Custom Properties Guide',
    description: 'How to create and use custom fields',
    category: 'guide',
    url: '/docs/properties-guide',
    keywords: ['custom fields', 'properties', 'configuration', 'tutorial'],
    icon: '📖',
  },
  {
    id: 'guide-branding',
    title: 'Branding Setup Guide',
    description: 'Customize your organization\'s appearance and login page',
    category: 'guide',
    url: '/docs/branding-guide',
    keywords: ['branding', 'logo', 'colors', 'login', 'customization'],
    icon: '📖',
  },

  // Dashboard Tools
  {
    id: 'tool-org-settings',
    title: 'Organization Settings',
    description: 'Manage organization details, branding, and logo upload',
    category: 'tool',
    url: '/orgs',
    keywords: ['settings', 'organization', 'branding', 'configuration', 'admin'],
    icon: '⚙️',
  },
  {
    id: 'tool-volunteers',
    title: 'Volunteers Management',
    description: 'View and manage volunteers and shifts',
    category: 'tool',
    url: '/volunteers',
    keywords: ['volunteers', 'shifts', 'staff', 'scheduling'],
    icon: '👥',
  },
  {
    id: 'tool-bookings',
    title: 'Bookings Management',
    description: 'Browse, create, and manage bookings',
    category: 'tool',
    url: '/bookings',
    keywords: ['bookings', 'appointments', 'scheduling', 'calendar'],
    icon: '📅',
  },

  // Special Topics
  {
    id: 'topic-login-branding',
    title: 'Login Page Branding',
    description: 'Use ?orgId query parameter to apply organization branding to login',
    category: 'docs',
    url: '/login?orgId=your-org-id',
    keywords: ['login', 'branding', 'orgId', 'query parameter', 'customization'],
    icon: '🔑',
  },
  {
    id: 'topic-embed-token',
    title: 'Embed Token Configuration',
    description: 'Generate and manage embed tokens for widget access control',
    category: 'docs',
    url: '/embed',
    keywords: ['embed', 'token', 'security', 'access control', 'configuration'],
    icon: '🔒',
  },
  {
    id: 'topic-visibility',
    title: 'Property Visibility',
    description: 'Control who can see custom properties (public/staff/admin)',
    category: 'docs',
    url: '/properties',
    keywords: ['properties', 'visibility', 'permissions', 'access control', 'security'],
    icon: '👁️',
  },
]

/**
 * Search help index by query string
 */
export function searchHelp(query: string, maxResults = 10): HelpItem[] {
  if (!query.trim()) return helpIndex.slice(0, maxResults)

  const lowerQuery = query.toLowerCase()
  const terms = lowerQuery.split(/\s+/).filter(Boolean)

  const scored = helpIndex.map((item) => {
    let score = 0

    // Title match (highest weight)
    if (item.title.toLowerCase().includes(lowerQuery)) score += 10
    terms.forEach((term) => {
      if (item.title.toLowerCase().includes(term)) score += 5
    })

    // Description match
    if (item.description.toLowerCase().includes(lowerQuery)) score += 5
    terms.forEach((term) => {
      if (item.description.toLowerCase().includes(term)) score += 2
    })

    // Keyword match
    item.keywords.forEach((keyword) => {
      if (keyword.toLowerCase().includes(lowerQuery)) score += 3
      terms.forEach((term) => {
        if (keyword.toLowerCase().includes(term)) score += 1
      })
    })

    // Category match
    if (item.category.toLowerCase().includes(lowerQuery)) score += 2

    return { item, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.item)
}

/**
 * Get help items by category
 */
export function getHelpByCategory(category: HelpItem['category']): HelpItem[] {
  return helpIndex.filter((item) => item.category === category)
}

/**
 * Get all categories with counts
 */
export function getCategories(): { category: HelpItem['category']; count: number; label: string }[] {
  const categories: { category: HelpItem['category']; label: string }[] = [
    { category: 'api', label: 'API Endpoints' },
    { category: 'feature', label: 'Features' },
    { category: 'guide', label: 'Guides' },
    { category: 'tool', label: 'Tools' },
    { category: 'docs', label: 'Documentation' },
  ]

  return categories.map(({ category, label }) => ({
    category,
    label,
    count: helpIndex.filter((item) => item.category === category).length,
  }))
}
