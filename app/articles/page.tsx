'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

interface Article {
  id: string
  slug: string
  title: string
  subheading: string | null
  content_markdown: string
  created_at: string | null
}

function getPreviewText(markdown: string, maxLength = 200): string {
  const withoutMarkdown = markdown
    // Remove headings, emphasis, links, etc.
    .replace(/[#*_`>-]+/g, '')
    // Remove image/link URLs in brackets/parentheses
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  if (withoutMarkdown.length <= maxLength) {
    return withoutMarkdown
  }

  return withoutMarkdown.slice(0, maxLength).trimEnd() + '...'
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('id, slug, title, subheading, content_markdown, created_at')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching articles:', error)
          setError('Failed to load articles. Please try again later.')
          return
        }

        setArticles(data || [])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred'
        console.error('Exception while fetching articles:', err)
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Build Wealth with Intention
          </h1>
          <p className="mt-2 text-gray-600">
            Learn how to invest with purpose, stay on track with goals, and grow steadily over time.
          </p>
        </header>

        {loading && (
          <div className="text-gray-600">
            Loading articles...
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r">
            <div className="font-semibold">Error loading articles</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="text-gray-600">
            No articles have been published yet. Please check back soon.
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="group bg-gray-50 border border-blue-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col transform-gpu group-hover:-translate-y-1"
              >
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 mb-2 line-clamp-2">
                    {article.title}
                  </h2>
                  {article.subheading && (
                    <p className="text-sm text-blue-500 mb-3 line-clamp-2">
                      {article.subheading}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-4 min-h-[120px]">
                    {getPreviewText(article.content_markdown)}
                  </p>
                </div>
                <div className="mt-4 text-sm font-medium text-blue-600">
                  Read more →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


