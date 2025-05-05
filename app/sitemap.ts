import type { MetadataRoute } from 'next'
import { fetchModels, models } from './data/models'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all models if they're not already loaded
  if (models.length === 0) {
    await fetchModels()
  }

  // Create base routes
  const baseRoutes: MetadataRoute.Sitemap = [
    {
      url: 'https://routstr.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://routstr.com/models',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://routstr.com/chat',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://routstr.com/roadmap',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://routstr.com/settings',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  // Generate model-specific routes
  const modelRoutes: MetadataRoute.Sitemap = models.map(model => ({
    url: `https://routstr.com/models/${model.id.replace('/', '/')}`,
    lastModified: new Date(model.created * 1000), // Convert UNIX timestamp to Date
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  // Combine and return all routes
  return [...baseRoutes, ...modelRoutes]
} 