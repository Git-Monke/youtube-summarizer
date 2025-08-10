import ReactMarkdown from 'react-markdown'
import { Clock } from 'lucide-react'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface CustomMarkdownProps {
  content: string
  variant?: 'compact' | 'spacious'
  className?: string
}

// Utility function to process timestamps in content
const processTimestamps = (content: any): any => {
  if (typeof content === 'string') {
    const timestampRegex = /\[(\d+:\d+)\]/g;
    const parts = content.split(timestampRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a timestamp - match the TranscriptDisplay styling
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground mx-1"
          >
            <Clock className="h-3 w-3" />
            <span className="font-mono">{part}</span>
          </span>
        );
      }
      return part;
    });
  }
  return content;
};

export function CustomMarkdown({ content, variant = 'spacious', className = '' }: CustomMarkdownProps) {
  const isCompact = variant === 'compact'
  
  // Variant-specific styling
  const styles = {
    // Spacing and margins
    paragraph: isCompact ? 'mb-2 last:mb-0' : 'mb-4',
    listItem: isCompact ? 'mb-1' : 'text-foreground mb-2',
    heading: isCompact 
      ? 'text-base font-semibold mb-2 mt-3 pb-1 border-b border-border/20'
      : 'text-foreground text-xl font-semibold mb-4 mt-6 pb-2 border-b border-border',
    unorderedList: isCompact 
      ? 'space-y-1 mb-2 list-disc list-outside ml-4'
      : 'space-y-2 mb-6 list-disc list-outside ml-4',
    orderedList: isCompact 
      ? 'space-y-1 mb-2 list-decimal list-outside ml-4'
      : 'space-y-2 mb-6 list-decimal list-outside ml-4',
    
    // Table styling with improved visibility
    tableContainer: isCompact ? 'overflow-x-auto mb-4' : 'overflow-x-auto mb-6',
    table: 'min-w-full border border-border/50 rounded-md shadow-sm',
    tableHeader: isCompact ? 'bg-muted/40' : 'bg-muted/60',
    tableHeaderCell: isCompact 
      ? 'border border-border/50 px-3 py-2 text-left text-sm font-semibold'
      : 'border border-border/50 px-4 py-3 text-left font-semibold',
    tableRow: isCompact ? 'even:bg-muted/15' : 'even:bg-muted/25',
    tableCell: isCompact 
      ? 'border border-border/50 px-3 py-2 text-sm'
      : 'border border-border/50 px-4 py-3'
  }

  return (
    <div className={`prose prose-sm max-w-none text-inherit ${className}`}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[remarkGfm]}
        remarkRehypeOptions={{ passThrough: ['link']}}
        components={{
          // Style paragraphs with timestamp support
          p: ({ children }) => (
            <p className={styles.paragraph}>
              {Array.isArray(children) 
                ? children.map(child => processTimestamps(child))
                : processTimestamps(children)}
            </p>
          ),
          // Style list items with timestamp support
          li: ({ children }) => (
            <li className={styles.listItem}>
              {Array.isArray(children) 
                ? children.map(child => processTimestamps(child))
                : processTimestamps(children)}
            </li>
          ),
          // Style H2 headers
          h2: ({ children }) => (
            <h2 className={styles.heading}>
              {children}
            </h2>
          ),
          // Style unordered lists
          ul: ({ children }) => (
            <ul className={styles.unorderedList}>
              {children}
            </ul>
          ),
          // Style ordered lists
          ol: ({ children }) => (
            <ol className={styles.orderedList}>
              {children}
            </ol>
          ),
          // Style tables with improved visibility
          table: ({ children }) => (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={styles.tableHeader}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className={styles.tableHeaderCell}>
              {children}
            </th>
          ),
          tbody: ({ children }) => (
            <tbody>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr className={styles.tableRow}>
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td className={styles.tableCell}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}