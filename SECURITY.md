# MailMop Security Measures

## Input Validation & Sanitization

MailMop implements comprehensive input validation and sanitization to protect against XSS attacks, injection vulnerabilities, and other security threats.

### Implemented Security Features

#### 1. **Feedback Modal Protection** ⚠️ **HIGH PRIORITY**
- **Location**: `src/components/modals/FeedbackModal.tsx`
- **Protection**: Feedback content sanitized with `sanitizeTextInput()` before database submission
- **What it prevents**: XSS attacks, script injection, malicious content stored in database
- **User feedback**: Warns users when potentially dangerous characters are removed
- **Why critical**: User feedback is stored server-side and could be viewed by administrators

#### 2. **Label Creation & Management**
- **Location**: `src/components/modals/ApplyLabelModal.tsx`
- **Protection**: Label names validated with `validateLabelName()`
- **What it validates**:
  - Removes HTML tags and dangerous characters
  - Enforces Gmail's 50-character limit
  - Prevents use of reserved Gmail label names
  - Blocks path separators and script URLs

#### 3. **Delete with Exceptions Filters**
- **Location**: `src/components/modals/DeleteWithExceptionsModal.tsx`
- **Protection**: Filter conditions validated with `validateFilterConditionValue()`
- **What it prevents**:
  - Gmail search query injection
  - XSS through filter values
  - Malicious Gmail search operators
  - Excessive input lengths (200 char limit)

#### 4. **Date Input Validation**
- **Protection**: Date inputs validated with `validateDateInput()`
- **What it validates**:
  - Proper MM/DD/YYYY format
  - Realistic date ranges (1900-2100)
  - Valid calendar dates (prevents Feb 31st, etc.)
  - Removes dangerous characters

#### 5. **Gmail Query Building Protection**
- **Location**: `src/lib/gmail/buildQuery.ts`
- **Protection**: All values escaped with `escapeGmailSearchValue()`
- **What it prevents**:
  - Gmail search syntax injection
  - Query manipulation attacks
  - Regex pattern injection

### Areas Intentionally NOT Validated

#### **Client-Side Search & Filtering** ✅ **SAFE BY DESIGN**
- **Why not validated**: All search operations happen client-side against cached metadata
- **No security risk**: Users are filtering their own data locally in the browser
- **Performance benefit**: No validation overhead for real-time search
- **Examples**:
  - Sender analysis search bar
  - Label search in ApplyLabelModal
  - Delete with exceptions keyword filters (handled by query escaping)

### Existing Security Infrastructure

#### Request-Level Protection (Middleware)
- **Location**: `middleware.ts`
- **Features**:
  - Path traversal protection (`..` detection)
  - XSS attempt blocking (`<script` detection)
  - SQL injection protection (`union select` detection)
  - JavaScript/VBScript URL blocking
  - Request size limits (URL: 2048 chars, User-Agent: 1000 chars)
  - Rate limiting for dashboard routes
  - Comprehensive security headers (CSP, HSTS, etc.)

#### Content Security Policy
- Restricts script sources to trusted domains
- Prevents inline script execution
- Controls resource loading sources
- Blocks object embedding

#### Authentication & Authorization
- JWT-based authentication via Supabase
- Route-level protection for `/dashboard`
- Session validation on each request

### Security Utilities

All validation functions are centralized in:
```typescript
src/lib/utils/inputValidation.ts
```

**Available Functions:**
- `validateLabelName(labelName: string)` - Gmail label validation
- `validateFilterConditionValue(value: string, type)` - Filter condition validation
- `validateDateInput(dateStr: string)` - Date format and safety validation
- `sanitizeTextInput(input: string, maxLength?)` - **General text sanitization for server-side data**

### Security Best Practices Implemented

1. **Defense in Depth**: Multiple layers of validation (client + middleware + query building)
2. **Input Sanitization**: User inputs that reach the server are cleaned before processing
3. **Output Encoding**: Gmail queries are properly escaped
4. **Length Limits**: Reasonable limits prevent DoS and overflow attacks
5. **User Feedback**: Clear warnings when input is modified for security
6. **Centralized Validation**: All validation logic in dedicated utility functions
7. **Type Safety**: TypeScript prevents many injection attack vectors
8. **Performance-Conscious**: No unnecessary validation on client-side-only operations

### Areas of Low Risk

**Why these areas have minimal security concerns:**

1. **Local Filtering**: Most searches filter locally against cached email metadata
2. **Gmail API Scope**: Read-only metadata access limits potential damage
3. **Client-Side Processing**: Heavy computation happens in browser, not server
4. **OAuth Tokens**: Stored securely (httpOnly cookies for refresh, memory-only for access)

### Monitoring & Logging

- Malicious requests logged via security middleware
- Failed validation attempts tracked
- Rate limiting violations recorded
- Authentication failures monitored

---

**Note**: This security implementation follows security-by-design principles, focusing validation efforts where they matter most (server-side data and external API calls) while avoiding unnecessary overhead on client-side operations. This provides robust protection against common web application vulnerabilities while maintaining optimal user experience. 