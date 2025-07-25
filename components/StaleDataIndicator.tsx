interface StaleDataIndicatorProps {
  isStale?: boolean
  timestamp?: string
  className?: string
}

export default function StaleDataIndicator({ isStale, timestamp, className = '' }: StaleDataIndicatorProps) {
  if (!isStale) return null
  
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown'
    }
  }
  
  return (
    <div className={`inline-flex items-center text-xs text-amber-600 ${className}`}>
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span>
        {timestamp ? `Last updated: ${formatTimestamp(timestamp)}` : 'Stale data'}
      </span>
    </div>
  )
} 