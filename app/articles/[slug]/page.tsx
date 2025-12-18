'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Article {
  id: string
  slug: string
  title: string
  subheading: string | null
  content_markdown: string
  created_at: string | null
}

export default function ArticleDetailPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : Array.isArray(params.slug) ? params.slug[0] : ''

  const [article, setArticle] = useState<Article | null>(null)
  const [related, setRelated] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    const fetchArticleAndRelated = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: articleData, error: articleError } = await supabase
          .from('articles')
          .select('id, slug, title, subheading, content_markdown, created_at')
          .eq('slug', slug)
          .single()

        if (articleError) {
          console.error('Error fetching article:', articleError)
          setError('Article not found or could not be loaded.')
          return
        }

        setArticle(articleData)

        if (articleData?.id) {
          const { data: relatedData, error: relatedError } = await supabase
            .from('articles')
            .select('id, slug, title, subheading, content_markdown, created_at')
            .neq('id', articleData.id)
            .order('created_at', { ascending: false })
            .limit(5)

          if (relatedError) {
            console.error('Error fetching related articles:', relatedError)
          } else {
            setRelated(relatedData || [])
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred'
        console.error('Exception while fetching article:', err)
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchArticleAndRelated()
  }, [slug])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/articles"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to all articles
        </Link>

        {loading && (
          <div className="text-gray-600">Loading article...</div>
        )}

        {error && !loading && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r">
            <div className="font-semibold">Error loading article</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        )}

        {!loading && !error && !article && (
          <div className="text-gray-700">
            We couldn&apos;t find this article. It may have been removed.
          </div>
        )}

        {article && (
          <>
            <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-10">
              <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {article.title}
                </h1>
                {article.subheading && (
                  <p className="text-lg text-blue-700">
                    {article.subheading}
                  </p>
                )}
              </header>

              <div className="prose prose-lg max-w-none leading-relaxed prose-headings:text-gray-900 prose-a:text-blue-600 prose-strong:text-gray-900">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ ...props }) => (
                      <p className="mt-5 mb-5 text-gray-800 leading-relaxed" {...props} />
                    ),
                    h1: ({ ...props }) => (
                      <h1 className="mt-10 mb-6 text-3xl font-bold text-gray-900 tracking-tight" {...props} />
                    ),
                    h2: ({ ...props }) => (
                      <h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 border-b border-gray-200 pb-2" {...props} />
                    ),
                    h3: ({ ...props }) => (
                      <h3 className="mt-6 mb-3 text-xl font-semibold text-gray-900" {...props} />
                    )
                  }}
                >
                  {article.content_markdown}
                </ReactMarkdown>
              </div>
            </article>

            {related.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  You might also like
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {related.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/articles/${rel.slug}`}
                      className="group bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                    >
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 mb-1 line-clamp-2">
                        {rel.title}
                      </h3>
                      {rel.subheading && (
                        <p className="text-sm text-blue-700 line-clamp-2">
                          {rel.subheading}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}


