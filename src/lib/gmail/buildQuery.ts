// Types of operations that can generate Gmail search queries
export type QueryOperation = 
  | { type: 'analysis'; mode: 'full' | 'quick' }
  | { 
      type: 'delete'; 
      mode: 'single' | 'bulk'; 
      senderEmail?: string;
      filterRules?: RuleGroup[]; // Add support for filter rules
    }
  | { 
      type: 'mark'; 
      mode: 'read' | 'unread'; 
      senderEmail?: string;
      additionalTerms?: string[];
    };

// Operator types
export type Operator = 'and' | 'or';

// Condition types
export type ConditionType = 
  | 'contains' 
  | 'not-contains'
  | 'date-after' 
  | 'date-before'
  | 'is-unread'
  | 'is-read'
  | 'has-attachment'
  | 'no-attachment';

// Condition definition
export interface Condition {
  id: string;
  type: ConditionType;
  value: string | Date | null;
  isValid: boolean;
}

// Rule group - uses AND/OR logic between conditions
export interface RuleGroup {
  id: string;
  operator: Operator;
  conditions: Condition[];
}

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
 * // Delete Queries
 * buildQuery({ type: 'delete', mode: 'single', senderEmail: 'news@example.com' })
 * buildQuery({ type: 'delete', mode: 'bulk' })
 * 
 * // Delete with Filters
 * buildQuery({ 
 *   type: 'delete', 
 *   mode: 'single', 
 *   senderEmail: 'news@example.com',
 *   filterRules: [
 *     {
 *       id: '1',
 *       operator: 'and',
 *       conditions: [
 *         { id: '1', type: 'is-unread', value: null, isValid: true },
 *         { id: '2', type: 'date-before', value: new Date(), isValid: true }
 *       ]
 *     }
 *   ]
 * })
 */
export function buildQuery(operation: QueryOperation): string {
  // Base query excludes sent emails
  const baseQuery = '-from:me';

  switch (operation.type) {
    case 'analysis':
      return operation.mode === 'quick' 
        ? `${baseQuery} unsubscribe`
        : baseQuery;

    case 'delete': {
      let query = baseQuery;

      // Add sender filter if provided
      if (operation.mode === 'single' && operation.senderEmail) {
        query = `${query} from:${operation.senderEmail}`;
      }

      // Add rule group filters if provided
      if (operation.filterRules?.length) {
        const validGroups = operation.filterRules.filter(group => 
          group.conditions.some(c => c.isValid)
        );

        if (validGroups.length > 0) {
          // Build each group's conditions
          const groupQueries = validGroups.map(group => {
            const validConditions = group.conditions.filter(c => c.isValid);
            
            if (validConditions.length === 0) return '';

            const conditionQueries = validConditions.map(condition => {
              switch (condition.type) {
                case 'contains':
                  return `"${condition.value}"`;
                case 'not-contains':
                  return `-"${condition.value}"`;
                case 'date-after':
                  return `after:${condition.value instanceof Date ? 
                    condition.value.toISOString().split('T')[0].replace(/-/g, '/') : 
                    condition.value}`;
                case 'date-before':
                  return `before:${condition.value instanceof Date ? 
                    condition.value.toISOString().split('T')[0].replace(/-/g, '/') : 
                    condition.value}`;
                case 'is-unread':
                  return 'is:unread';
                case 'is-read':
                  return 'is:read';
                case 'has-attachment':
                  return 'has:attachment';
                case 'no-attachment':
                  return '-has:attachment';
                default:
                  return '';
              }
            }).filter(Boolean);

            if (conditionQueries.length === 0) return '';

            // Join conditions with the appropriate operator
            const joiner = group.operator === 'and' ? ' ' : ' OR ';
            return conditionQueries.length > 1 
              ? `(${conditionQueries.join(joiner)})`
              : conditionQueries[0];
          }).filter(Boolean);

          // Join groups with OR and add to base query
          if (groupQueries.length > 0) {
            query = `${query} ${groupQueries.join(' OR ')}`;
          }
        }
      }

      return query;
    }

    case 'mark':
      let query = baseQuery;
      
      // Add sender filter if specified
      if (operation.senderEmail) {
        query = `${query} from:${operation.senderEmail}`;
      }

      // Add any additional terms (like 'is:unread')
      if (operation.additionalTerms && operation.additionalTerms.length > 0) {
        query = `${query} ${operation.additionalTerms.join(' ')}`;
      }

      return query;

    default:
      throw new Error(`Unknown operation type: ${(operation as any).type}`);
  }
} 