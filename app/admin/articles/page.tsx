'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface ArticleFormState {
  title: string
  subheading: string
  contentMarkdown: string
}

interface ArticleSummary {
  id: string
  title: string
  subheading: string | null
  slug: string
  created_at: string | null
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const suffix = Date.now().toString(36)
  return `${base || 'article'}-${suffix}`
}

export default function AdminArticlesPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ArticleFormState>({
    title: '',
    subheading: '',
    contentMarkdown: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [articlesLoading, setArticlesLoading] = useState(false)
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [editingArticleTitle, setEditingArticleTitle] = useState<string | null>(null)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (!supabase) return
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single()

          if (profileError) {
            console.error('Error fetching user profile:', profileError)
            setError(`Error checking admin status: ${profileError.message}`)
            return
          }

          if (profile?.role === 'admin') {
            setIsAdmin(true)
          } else {
            setError('Access denied: Admin privileges required')
          }
        } else {
          setError('No active session found')
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
        console.error('Exception in checkAdminStatus:', err)
        setError(`Exception checking admin status: ${errorMessage}`)
      }
    }

    checkAdminStatus()
  }, [])

  useEffect(() => {
    if (!isAdmin) return

    const fetchArticles = async () => {
      setArticlesLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('articles')
          .select('id, title, subheading, slug, created_at')
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.error('Error fetching articles:', fetchError)
          setError(fetchError.message)
          return
        }

        setArticles(data || [])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred'
        console.error('Exception fetching articles:', err)
        setError(message)
      } finally {
        setArticlesLoading(false)
      }
    }

    fetchArticles()
  }, [isAdmin])

  const handleChange = (field: keyof ArticleFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setCreatedSlug(null)

    if (!form.title.trim()) {
      setError('Title is required')
      return
    }

    if (!form.contentMarkdown.trim()) {
      setError('Full article (markdown) is required')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingArticleId) {
        const { data, error: updateError } = await supabase
          .from('articles')
          .update({
            title: form.title.trim(),
            subheading: form.subheading.trim() || null,
            content_markdown: form.contentMarkdown
          })
          .eq('id', editingArticleId)
          .select('id, slug')
          .single()

        if (updateError) {
          console.error('Error updating article:', updateError)
          setError(updateError.message)
          return
        }

        setSuccessMessage('Article updated successfully.')
        setCreatedSlug(data?.slug || editingSlug || null)

        setArticles((prev) =>
          prev.map((article) =>
            article.id === editingArticleId
              ? {
                  ...article,
                  title: form.title.trim(),
                  subheading: form.subheading.trim() || null
                }
              : article
          )
        )

        setEditingArticleId(null)
        setEditingSlug(null)
        setEditingArticleTitle(null)
        setForm({
          title: '',
          subheading: '',
          contentMarkdown: ''
        })
        return
      }

      const slug = generateSlug(form.title)

      const { data, error: insertError } = await supabase
        .from('articles')
        .insert({
          slug,
          title: form.title.trim(),
          subheading: form.subheading.trim() || null,
          content_markdown: form.contentMarkdown
        })
        .select('id, slug, created_at')
        .single()

      if (insertError) {
        console.error('Error inserting article:', insertError)
        setError(insertError.message)
        return
      }

      const finalSlug = data?.slug || slug
      setSuccessMessage('Article created successfully.')
      setCreatedSlug(finalSlug)

      setForm({
        title: '',
        subheading: '',
        contentMarkdown: ''
      })

      // Refresh list after creating
      setArticles((prev) => [
        {
          id: data?.id || crypto.randomUUID(),
          title: form.title.trim(),
          subheading: form.subheading.trim() || null,
          slug: finalSlug,
          created_at: data?.created_at || new Date().toISOString()
        },
        ...prev
      ])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      console.error('Exception while creating article:', err)
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = async (articleId: string) => {
    setError(null)
    setSuccessMessage(null)
    setCreatedSlug(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('articles')
        .select('id, title, subheading, content_markdown, slug')
        .eq('id', articleId)
        .single()

      if (fetchError) {
        console.error('Error fetching article for edit:', fetchError)
        setError(fetchError.message)
        return
      }

      setEditingArticleId(data.id)
      setEditingSlug(data.slug)
      setEditingArticleTitle(data.title ?? 'Untitled article')
      setForm({
        title: data.title ?? '',
        subheading: data.subheading ?? '',
        contentMarkdown: data.content_markdown ?? ''
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred'
      console.error('Exception while loading article for edit:', err)
      setError(message)
    }
  }

  const handleCancelEdit = () => {
    setEditingArticleId(null)
    setEditingSlug(null)
    setEditingArticleTitle(null)
    setForm({
      title: '',
      subheading: '',
      contentMarkdown: ''
    })
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You need admin privileges to access this page.
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2">
            Manage Articles
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Create new articles or review what&apos;s already published.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r">
            <div className="font-semibold">Error</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        )}

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Existing Articles</h2>
            {articlesLoading && (
              <span className="text-sm text-gray-500">Refreshing...</span>
            )}
          </div>
          {articles.length === 0 ? (
            <p className="text-sm text-gray-600">
              No articles yet. Create one using the form below.
            </p>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="border border-gray-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {article.title}
                    </p>
                    {article.subheading && (
                      <p className="text-sm text-blue-600">
                        {article.subheading}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Published {article.created_at ? new Date(article.created_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div className="mt-3 sm:mt-0 flex items-center gap-3 text-sm">
                    <Link
                      href={`/articles/${article.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      className="text-gray-700 hover:text-gray-900 font-medium"
                      onClick={() => handleEditClick(article.id)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {successMessage && (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-800 rounded-r">
            <div className="font-semibold">Success</div>
            <div className="mt-1 text-sm">{successMessage}</div>
            {createdSlug && (
              <div className="mt-2 text-sm">
                <Link
                  href={`/articles/${createdSlug}`}
                  className="text-blue-700 hover:text-blue-800 underline"
                >
                  View article
                </Link>
              </div>
            )}
          </div>
        )}

        {editingArticleId && (
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-900 rounded-r flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Editing article</p>
              <p className="text-base font-semibold">
                {editingArticleTitle || 'Untitled article'}
              </p>
              {editingSlug && (
                <p className="text-xs text-blue-600">
                  Slug: {editingSlug}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100"
            >
              Cancel edit
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingArticleId ? 'Edit Article' : 'Create New Article'}
              </h2>
              <p className="text-sm text-gray-500">
                {editingArticleId
                  ? 'Update the content below and save your changes.'
                  : 'Publish a new investing article.'}
              </p>
            </div>
            {editingArticleId && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                Editing
              </span>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder="e.g., Basics of Goal-Based Investing"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub-heading (short summary)
            </label>
            <input
              type="text"
              value={form.subheading}
              onChange={(e) => handleChange('subheading', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder="A one-line summary shown on article cards"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full article (Markdown) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.contentMarkdown}
              onChange={(e) => handleChange('contentMarkdown', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm font-mono"
              rows={16}
              placeholder={`Use markdown for formatting. For example:

## Why goal-based investing matters

Investing with clear goals helps you stay disciplined...

- Define your time horizon
- Estimate required corpus
- Choose suitable investment mix
`}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Fields marked with <span className="text-red-500">*</span> are required.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting
                  ? editingArticleId
                    ? 'Updating...'
                    : 'Creating...'
                  : editingArticleId
                    ? 'Update Article'
                    : 'Create Article'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}


