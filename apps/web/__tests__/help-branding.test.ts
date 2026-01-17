/**
 * Help Desk & Branding Smoke Tests
 * Basic integration tests to verify help search and branding functionality
 */

import { describe, it, expect } from 'vitest'
import { searchHelp, getCategories, helpIndex } from '../lib/help-index'

describe('Help Search Index', () => {
  it('should have help items indexed', () => {
    expect(helpIndex).toBeDefined()
    expect(helpIndex.length).toBeGreaterThan(0)
  })

  it('should search by title', () => {
    const results = searchHelp('API')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.title.toLowerCase().includes('api'))).toBe(true)
  })

  it('should search by keywords', () => {
    const results = searchHelp('branding')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.keywords.includes('branding'))).toBe(true)
  })

  it('should search for embed', () => {
    const results = searchHelp('embed')
    expect(results.length).toBeGreaterThan(0)
    const embedItems = results.filter((r) => r.keywords.includes('embed'))
    expect(embedItems.length).toBeGreaterThan(0)
  })

  it('should search for properties', () => {
    const results = searchHelp('properties')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.keywords.includes('properties'))).toBe(true)
  })

  it('should search for custom fields', () => {
    const results = searchHelp('custom fields')
    expect(results.length).toBeGreaterThan(0)
  })

  it('should return all items when query is empty', () => {
    const results = searchHelp('', 50)
    expect(results.length).toBe(Math.min(helpIndex.length, 50))
  })

  it('should limit results to maxResults', () => {
    const results = searchHelp('', 5)
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('should filter by multiple terms', () => {
    const results = searchHelp('API branding')
    expect(results.length).toBeGreaterThan(0)
  })
})

describe('Help Categories', () => {
  it('should return all categories with counts', () => {
    const categories = getCategories()
    expect(categories.length).toBe(5) // api, feature, guide, tool, docs
    expect(categories.every((c) => c.count >= 0)).toBe(true)
  })

  it('should have api category', () => {
    const categories = getCategories()
    const apiCat = categories.find((c) => c.category === 'api')
    expect(apiCat).toBeDefined()
    expect(apiCat!.count).toBeGreaterThan(0)
  })

  it('should have feature category', () => {
    const categories = getCategories()
    const featureCat = categories.find((c) => c.category === 'feature')
    expect(featureCat).toBeDefined()
    expect(featureCat!.count).toBeGreaterThan(0)
  })
})

describe('Help Index Content', () => {
  it('should include API base URL', () => {
    const item = helpIndex.find((h) => h.id === 'api-base')
    expect(item).toBeDefined()
    expect(item!.url).toBe('/api/v1')
  })

  it('should include public branding endpoint', () => {
    const item = helpIndex.find((h) => h.id === 'api-public-branding')
    expect(item).toBeDefined()
    expect(item!.url).toContain('branding')
    expect(item!.keywords).toContain('branding')
  })

  it('should include embed token documentation', () => {
    const item = helpIndex.find((h) => h.id === 'topic-embed-token')
    expect(item).toBeDefined()
    expect(item!.keywords).toContain('token')
  })

  it('should include login branding parameter', () => {
    const item = helpIndex.find((h) => h.id === 'topic-login-branding')
    expect(item).toBeDefined()
    expect(item!.url).toContain('orgId')
    expect(item!.keywords).toContain('orgId')
  })

  it('should include properties visibility documentation', () => {
    const item = helpIndex.find((h) => h.id === 'topic-visibility')
    expect(item).toBeDefined()
    expect(item!.keywords).toContain('visibility')
  })
})

describe('Branding Functionality (Integration)', () => {
  it('should have branding API endpoint documented', () => {
    const results = searchHelp('branding API')
    expect(results.length).toBeGreaterThan(0)
    const brandingAPI = results.find((r) => r.url.includes('branding'))
    expect(brandingAPI).toBeDefined()
  })

  it('should document logo upload capability', () => {
    const results = searchHelp('logo')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.keywords.includes('logo'))).toBe(true)
  })

  it('should document color customization', () => {
    const results = searchHelp('colors')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.keywords.includes('colors'))).toBe(true)
  })
})
