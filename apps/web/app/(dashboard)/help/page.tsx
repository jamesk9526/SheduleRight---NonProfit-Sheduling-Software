'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { searchHelp, getCategories, type HelpItem } from '@/lib/help-index'

export default function HelpPage() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = getCategories()
  const results = useMemo(() => {
    const items = searchHelp(query, 50)
    if (selectedCategory) {
      return items.filter((item) => item.category === selectedCategory)
    }
    return items
  }, [query, selectedCategory])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            📚 Help Center
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Search for API endpoints, features, guides, and documentation. Press{' '}
            <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-sm font-mono text-sm">
              ?
            </kbd>{' '}
            or{' '}
            <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-sm font-mono text-sm">
              Ctrl+K
            </kbd>{' '}
            to open the command palette from anywhere.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for API endpoints, guides, features..."
              className="w-full px-6 py-4 text-lg border-2 border-slate-300 rounded-xl shadow-lg focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition"
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === null
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All ({results.length})
          </button>
          {categories.map(({ category, label, count }) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Results */}
        {results.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold text-slate-700 mb-2">No results found</h2>
            <p className="text-slate-500">Try a different search term or browse by category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((item) => (
              <HelpCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Quick Links Section */}
        <div className="mt-16 pt-12 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickLinkCard
              title="API Reference"
              description="Browse all available API endpoints"
              icon="🔌"
              href="/api/v1"
            />
            <QuickLinkCard
              title="Custom Properties"
              description="Manage custom fields and metadata"
              icon="⚙️"
              href="/properties"
            />
            <QuickLinkCard
              title="Embed Widget"
              description="Generate booking widget code"
              icon="🔗"
              href="/embed"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function HelpCard({ item }: { item: HelpItem }) {
  const categoryColors: Record<HelpItem['category'], string> = {
    api: 'bg-blue-100 text-blue-700 border-blue-200',
    feature: 'bg-green-100 text-green-700 border-green-200',
    guide: 'bg-purple-100 text-purple-700 border-purple-200',
    tool: 'bg-orange-100 text-orange-700 border-orange-200',
    docs: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  const isExternal = item.url.startsWith('http')
  const LinkComponent = isExternal ? 'a' : Link

  return (
    <LinkComponent
      href={item.url}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="block bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition border border-slate-200 hover:border-primary-300"
    >
      <div className="flex items-start gap-4">
        {item.icon && <div className="text-3xl flex-shrink-0">{item.icon}</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full border ${
                categoryColors[item.category]
              }`}
            >
              {item.category}
            </span>
          </div>
          <p className="text-slate-600 mb-3">{item.description}</p>
          <div className="flex items-center gap-2 text-sm text-primary-600 font-medium">
            <span>{isExternal ? 'View' : 'Go to'}</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </LinkComponent>
  )
}

function QuickLinkCard({
  title,
  description,
  icon,
  href,
}: {
  title: string
  description: string
  icon: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="block bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 shadow-md hover:shadow-xl transition border-2 border-slate-200 hover:border-primary-400"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </Link>
  )
}
