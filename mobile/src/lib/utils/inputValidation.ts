/**
 * Input validation and sanitization utilities for MailMop
 * 
 * These functions help prevent XSS, injection attacks, and ensure data integrity
 * throughout the application by validating and cleaning user inputs.
 */

/**
 * Validates and sanitizes label names for Gmail labels.
 * Gmail has specific requirements for label names.
 * 
 * @param labelName - The proposed label name
 * @returns Object with validation result and sanitized name
 */
export function validateLabelName(labelName: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!labelName || typeof labelName !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      error: 'Label name is required'
    };
  }

  // Remove dangerous characters
  const sanitized = labelName
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove XSS-prone characters
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/[\\/]/g, '') // Remove path separators (Gmail doesn't allow these)
    .trim();

  // Gmail label name validation rules
  if (sanitized.length === 0) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Label name cannot be empty'
    };
  }

  if (sanitized.length > 50) {
    return {
      isValid: false,
      sanitized: sanitized.slice(0, 50),
      error: 'Label name must be 50 characters or less'
    };
  }

  // Check for reserved Gmail label names (case-insensitive)
  const reservedNames = [
    'inbox', 'sent', 'drafts', 'spam', 'trash', 'starred', 'important',
    'chats', 'all', 'unread', 'category_personal', 'category_social',
    'category_updates', 'category_forums', 'category_promotions'
  ];

  if (reservedNames.includes(sanitized.toLowerCase())) {
    return {
      isValid: false,
      sanitized,
      error: 'This name is reserved by Gmail'
    };
  }

  return {
    isValid: true,
    sanitized
  };
}

/**
 * Validates and sanitizes filter condition values for delete-with-exceptions.
 * These values become part of Gmail search queries, so they need careful validation.
 * 
 * @param value - The filter condition value
 * @param conditionType - The type of condition this value is for
 * @returns Object with validation result and sanitized value
 */
export function validateFilterConditionValue(
  value: string,
  conditionType: 'contains' | 'not-contains'
): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!value || typeof value !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      error: 'Filter value is required'
    };
  }

  // Remove dangerous characters but preserve legitimate search terms
  const sanitized = value
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove XSS-prone characters
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/vbscript:/gi, '') // Remove vbscript: URLs
    .replace(/[{}[\]]/g, '') // Remove regex-like characters that could break Gmail search
    .trim();

  if (sanitized.length === 0) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Filter value cannot be empty'
    };
  }

  if (sanitized.length > 200) {
    return {
      isValid: false,
      sanitized: sanitized.slice(0, 200),
      error: 'Filter value must be 200 characters or less'
    };
  }

  // Check for Gmail search operators that could be misused
  const dangerousPatterns = [
    /\bin:\s*["\']?javascript/i,
    /\bfrom:\s*["\']?javascript/i,
    /\bto:\s*["\']?javascript/i,
    /\bsubject:\s*["\']?javascript/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return {
        isValid: false,
        sanitized: sanitized.replace(pattern, ''),
        error: 'Invalid search pattern detected'
      };
    }
  }

  return {
    isValid: true,
    sanitized
  };
}

/**
 * Validates date input strings to prevent injection attacks
 * and ensure proper date format.
 * 
 * @param dateStr - The date string to validate
 * @returns Object with validation result and parsed date
 */
export function validateDateInput(dateStr: string): {
  isValid: boolean;
  date?: Date;
  error?: string;
} {
  if (!dateStr || typeof dateStr !== 'string') {
    return {
      isValid: false,
      error: 'Date is required'
    };
  }

  // Remove any potentially dangerous characters
  const sanitized = dateStr
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove XSS-prone characters
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .trim();

  // Try to parse as MM/DD/YYYY format
  const dateParts = sanitized.split(/[\/\-\.]/);
  
  if (dateParts.length !== 3) {
    return {
      isValid: false,
      error: 'Date must be in MM/DD/YYYY format'
    };
  }

  const month = parseInt(dateParts[0]) - 1; // 0-indexed month
  const day = parseInt(dateParts[1]);
  const year = parseInt(dateParts[2]);

  // Validate numeric values
  if (isNaN(month) || isNaN(day) || isNaN(year)) {
    return {
      isValid: false,
      error: 'Date contains invalid numbers'
    };
  }

  // Validate reasonable ranges
  if (year < 1900 || year > 2100) {
    return {
      isValid: false,
      error: 'Year must be between 1900 and 2100'
    };
  }

  if (month < 0 || month > 11) {
    return {
      isValid: false,
      error: 'Month must be between 1 and 12'
    };
  }

  if (day < 1 || day > 31) {
    return {
      isValid: false,
      error: 'Day must be between 1 and 31'
    };
  }

  const date = new Date(year, month, day);

  // Validate that the date is actually valid (handles cases like Feb 31)
  if (date.getMonth() !== month || date.getDate() !== day || date.getFullYear() !== year) {
    return {
      isValid: false,
      error: 'Invalid date (e.g., February 31st doesn\'t exist)'
    };
  }

  return {
    isValid: true,
    date
  };
}

/**
 * General purpose input sanitization for text fields
 * that will be displayed in the UI or stored in the database.
 * 
 * @param input - The raw input string
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized string safe for display and storage
 */
export function sanitizeTextInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove XSS-prone characters
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/vbscript:/gi, '') // Remove vbscript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .slice(0, maxLength);
} 