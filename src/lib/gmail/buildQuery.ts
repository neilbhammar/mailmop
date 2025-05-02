// Types of operations that can generate Gmail search queries
export type QueryOperation = 
  | { type: 'analysis'; mode: 'full' | 'quick' }
  | { type: 'delete'; mode: 'single' | 'bulk'; senderEmail?: string }
  | { type: 'mark'; mode: 'read' | 'unread'; senderEmail?: string };

/**
 * Builds Gmail API search queries for different operations
 * 
 * @param operation - The operation and its parameters
 * @returns A Gmail API compatible search query string
 * 
 * @example
 * // Analysis Queries
 * buildQuery({ type: 'analysis', mode: 'full' }) // Returns: '-from:me'
 * buildQuery({ type: 'analysis', mode: 'quick' }) // Returns: '-from:me unsubscribe'
 * 
 * // Delete Queries (planned)
 * buildQuery({ type: 'delete', mode: 'sender', senderEmail: 'news@example.com' })
 * buildQuery({ type: 'delete', mode: 'bulk' })
 */
export function buildQuery(operation: QueryOperation): string {
  // Base query excludes sent emails
  const baseQuery = '-from:me';

  switch (operation.type) {
    case 'analysis':
      return operation.mode === 'quick' 
        ? `${baseQuery} unsubscribe`
        : baseQuery;

    case 'delete':
      if (operation.mode === 'single' && operation.senderEmail) {
        return `${baseQuery} from:${operation.senderEmail}`;
      }
      console.warn('[buildQuery] Delete operation called without single sender email or for bulk. Using base query.');
      return baseQuery;

    case 'mark':
      if (operation.senderEmail) {
        return `${baseQuery} from:${operation.senderEmail}`;
      }
      return baseQuery;

    default:
      throw new Error(`Unknown operation type: ${(operation as any).type}`);
  }
} 