import type { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

function isDynamicOrGrouped(segment: string): boolean {
  return segment.startsWith('[') || segment.endsWith(']') || segment.startsWith('(') || segment.endsWith(')')
}

function collectStaticRoutes(appDirAbs: string): string[] {
  const routes: Set<string> = new Set()

  function walk(currentAbs: string, currentRoute: string) {
    const dirName = path.basename(currentAbs)
    if (dirName === 'api' || dirName.startsWith('_')) return
    if (isDynamicOrGrouped(dirName)) return

    let entries: string[] = []
    try {
      entries = fs.readdirSync(currentAbs)
    } catch {
      return
    }

    const hasPage = entries.some((e) => e === 'page.tsx' || e === 'page.ts' || e === 'page.jsx' || e === 'page.js')
    if (hasPage) {
      routes.add(currentRoute === '' ? '/' : `/${currentRoute}`)
    }

    for (const entry of entries) {
      const childAbs = path.join(currentAbs, entry)
      let stat: fs.Stats
      try {
        stat = fs.statSync(childAbs)
      } catch {
        continue
      }
      if (stat.isDirectory()) {
        if (['components', 'styles', 'public', 'node_modules'].includes(entry)) continue
        if (isDynamicOrGrouped(entry)) continue
        const nextRoute = currentRoute ? `${currentRoute}/${entry}` : entry
        walk(childAbs, nextRoute)
      }
    }
  }

  walk(appDirAbs, '')
  return Array.from(routes).sort((a, b) => a.localeCompare(b))
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const appDir = path.join(process.cwd(), 'app')
  let routes: string[] = []
  try {
    routes = collectStaticRoutes(appDir)
  } catch {
    routes = ['/']
  }

  const now = new Date()
  return routes.map((p) => ({
    url: `${baseUrl}${p}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p === '/' ? 1 : 0.7
  }))
}


