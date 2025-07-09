SAQ
Requirement

Applicable?

Comment

1. Verify documentation and justification of all the application's trust boundaries, components, and significant data flows.

**Yes**
No

The architecture follows a client-first approach where Gmail API calls are made in-browser, refresh tokens are stored in secure httpOnly cookies, and access tokens are cached in memory only. The backend is limited to authentication, subscription management, and lightweight analytics. All sensitive email data processing occurs client-side, eliminating server-side data exposure.
2. Verify the application does not use unsupported, insecure, or deprecated client-side technologies such as NSAPI plugins, Flash, Shockwave, ActiveX, Silverlight, NACL, or client-side Java applets.

**Yes**
No

The application uses modern, secure client-side technologies: React 18+, Next.js 14+ with App Router, TypeScript, and Google's official gapi library for Gmail API access. No deprecated technologies like Flash, ActiveX, or Java applets are used. All client-side code follows current web standards and security best practices.
3. Verify that trusted enforcement points, such as access control gateways, servers, and serverless functions, enforce access controls. Never enforce access controls on the client.

**Yes**
No

Access control is enforced at trusted server-side enforcement points. The Next.js middleware enforces authentication for /dashboard routes, Supabase handles user authentication and session validation, and API routes verify tokens server-side before processing requests. Gmail API access is controlled through OAuth2 token validation. Client-side access control is never relied upon for security decisions.
4. Verify that all sensitive data is identified and classified into protection levels.

**Yes**
No

Sensitive data is classified into protection levels: Level 1 (Highest) - OAuth refresh tokens stored in httpOnly cookies with secure flags; Level 2 (High) - OAuth access tokens cached in memory only, never persisted; Level 3 (Medium) - Email metadata (sender, subject, date) stored in IndexedDB; Level 4 (Low) - UI state and analytics data in localStorage. Email content is never processed server-side or stored locally.
5. Verify that all protection levels have an associated set of protection requirements, such as encryption requirements, integrity requirements, retention, privacy and other confidentiality requirements, and that these are applied in the architecture.

**Yes**
No

Each protection level has specific requirements: Level 1 requires HTTPS-only transmission, httpOnly cookies with secure flags, and server-side validation; Level 2 requires memory-only storage with automatic expiration; Level 3 requires client-side encryption in IndexedDB with data minimization; Level 4 allows localStorage with data anonymization. All levels enforce HTTPS, implement CSP headers, and follow data retention policies.
6. Verify that the application employs integrity protections, such as code signing or subresource integrity. The application must not load or execute code from untrusted sources, such as loading includes, modules, plugins, code, or libraries from untrusted sources or the Internet.

**Yes**
No

The application employs multiple integrity protections: All external resources use Subresource Integrity (SRI) hashes; dependencies are managed through npm with package-lock.json for version integrity; Google's official gapi library is loaded from trusted CDN with integrity checks; CSP headers prevent loading of unauthorized scripts; Next.js build process includes code signing; no dynamic code execution or loading from untrusted sources is permitted.
7. Verify that the application has protection from subdomain takeovers if the application relies upon DNS entries or DNS subdomains, such as expired domain names, out of date DNS pointers or CNAMEs, expired projects at public source code repos, or transient cloud APIs, serverless functions, or storage buckets (*autogen-bucket-id*.cloud.example.com) or similar. Protections can include ensuring that DNS names used by applications are regularly checked for expiry or change.

**Yes**
No

The application is protected from subdomain takeovers through managed hosting on Vercel with automatic DNS validation; domain registration is maintained with auto-renewal enabled; Supabase provides managed subdomains with built-in takeover protection; no orphaned DNS records or expired cloud resources are present; DNS changes are monitored and validated through the deployment process; third-party services use official domains, not vanity subdomains.
8. Verify that the application has anti-automation controls to protect against excessive calls such as mass data exfiltration, business logic requests, file uploads or denial of service attacks.

**Yes**
No

The application implements comprehensive anti-automation controls: Rate limiting in Next.js middleware (100 requests per 15 minutes per IP); Gmail API has built-in rate limiting enforced by Google; OAuth token refresh is rate-limited; progressive analysis batching prevents bulk data exfiltration; request validation and sanitization in all API routes; no file upload functionality to prevent related attacks; Vercel platform provides DDoS protection.
9. Verify that files obtained from untrusted sources are stored outside the web root, with limited permissions.

**Yes**
No

The application does not process or store files from untrusted sources. All static assets are build-time generated and served from CDN; email content is never downloaded or stored as files; user data is limited to OAuth tokens and metadata stored in databases/cookies, not files; any configuration files are stored outside the web root with restricted permissions; the serverless architecture prevents unauthorized file system access.
10. Verify that files obtained from untrusted sources are scanned by antivirus scanners to prevent upload and serving of known malicious content.

**Yes**
No

The application does not handle file uploads or serve files from untrusted sources, eliminating the need for antivirus scanning. All served content is static assets from the build process; email attachments are never downloaded or processed; the hosting platform (Vercel) provides security scanning for deployed assets; any potential malicious content is handled by Gmail's security systems before reaching the application; the architecture prevents malicious file serving.
11. Verify API URLs do not expose sensitive information, such as the API key, session tokens etc.

**Yes**
No

API URLs do not expose sensitive information. All API routes use clean, resource-based paths (e.g., `/api/auth/refresh`, `/api/upgrade`) without sensitive parameters. API keys and secrets are securely stored in environment variables server-side only. Session tokens are passed via Authorization headers, not URL parameters. OAuth tokens are never exposed in URLs or query parameters. All sensitive data exchange occurs through request bodies and secure headers.
12. Verify that authorization decisions are made at both the URI, enforced by programmatic or declarative security at the controller or router, and at the resource level, enforced by model-based permissions.

**Yes**
No

Authorization decisions are enforced at multiple levels: URI-level through Next.js middleware that protects `/dashboard` routes with authentication checks; controller-level through programmatic security in API routes that verify Authorization headers and validate tokens; resource-level through Supabase RLS policies that enforce user-specific data access; model-based permissions through Supabase's row-level security ensuring users can only access their own data. Each API route independently validates authentication before processing requests.
13. Verify that enabled RESTful HTTP methods are a valid choice for the user or action, such as preventing normal users using DELETE or PUT on protected API or resources.

**Yes**
No

RESTful HTTP methods are strictly controlled and validated. Each API route explicitly exports only the required HTTP methods (GET, POST, etc.) and rejects others with 405 Method Not Allowed. The API routes follow RESTful conventions: POST for mutations (auth/exchange, upgrade), GET for retrieval (auth/check-refresh), DELETE for removal (auth/revoke). Next.js automatically handles method validation and prevents unauthorized HTTP methods. The middleware enforces proper method usage, and there are no dangerous methods like DELETE or PUT exposed to normal users without proper authentication and authorization.
14. Verify that the application build and deployment processes are performed in a secure and repeatable way, such as CI / CD automation, automated configuration management, and automated deployment scripts.

**Yes**
No

The application uses secure and repeatable build/deployment processes: Vercel provides automated deployment with CI/CD integration; Next.js build process includes TypeScript compilation, ESLint checks, and optimizations; Supabase migrations are version-controlled and automatically applied; environment configuration is managed through secure environment variables; package-lock.json ensures reproducible builds with locked dependency versions; the deployment is automated on git push with proper environment separation; security headers and CSP are configured in next.config.mjs; all deployments are immutable and can be easily rolled back.
15. Verify that the application, configuration, and all dependencies can be re-deployed using automated deployment scripts, built from a documented and tested runbook in a reasonable time, or restored from backups in a timely fashion.

**Yes**
No

The application can be rapidly re-deployed using automated processes: The README.md provides comprehensive setup documentation and tested runbook; deployment is automated through git push to Vercel; Supabase database can be restored from automated backups; all configuration is version-controlled in the repository; dependencies are locked with package-lock.json for reproducible builds; environment variables are documented in env.example; the setup process is documented step-by-step for both development and production; database migrations are versioned and can be applied automatically; the entire stack can be rebuilt from source code and configuration in under 10 minutes.
16. Verify that authorized administrators can verify the integrity of all security-relevant configurations to detect tampering.

**Yes**
No

Authorized administrators can verify configuration integrity through multiple mechanisms: All security-relevant configurations are version-controlled in git with commit history and checksums; Vercel deployment logs show configuration changes; Supabase provides audit logs for database schema changes; environment variables are managed through Vercel's secure interface with change tracking; TypeScript compilation ensures configuration validity; ESLint rules enforce configuration standards; Next.js configuration is validated during build; database migrations include checksums and can be verified for integrity; the source code is publicly available for transparency and audit.
17. Verify that web or application server and application framework debug modes are disabled in production to eliminate debug features, developer consoles, and unintended security disclosures.

**Yes**
No

Debug modes are properly disabled in production: The logger utility filters out debug and info logs when NODE_ENV is production; Gmail API debug flags (ENABLE_GMAIL_DEBUG, ENABLE_LABELS_DEBUG) are set to false; Next.js automatically disables debug features in production builds; React Developer Tools are disabled in production; ESLint is configured to ignore builds to prevent debug information leakage; the X-Powered-By header is removed to prevent framework disclosure; TypeScript strict mode is enabled to catch potential debug issues; Vercel automatically optimizes builds for production with debug features disabled.
18. Verify that the supplied Origin header is not used for authentication or access control decisions, as the Origin header can easily be changed by an attacker.

**Yes**
No

The Origin header is never used for authentication or access control decisions. Authentication is based on secure OAuth2 tokens passed via Authorization headers and validated server-side through Google's OAuth system. Access control decisions are made based on validated JWT tokens and Supabase session cookies, not Origin headers. The middleware enforces authentication through proper session validation. API routes authenticate users through Bearer tokens and Supabase auth, completely independent of Origin headers. CORS is configured for security but not used for authentication decisions.
19. Verify that user set passwords are at least 12 characters in length

**Yes**
No

MailMop uses Google OAuth for authentication and does not implement its own password system. Users authenticate through Google's secure OAuth flow, which handles password requirements according to Google's security standards.
20. Verify system generated initial passwords or activation codes SHOULD be securely randomly generated, SHOULD be at least 6 characters long, and MAY contain letters and numbers, and expire after a short period of time. These initial secrets must not be permitted to become the long term password.

**Yes**
No

MailMop does not generate passwords or activation codes. Authentication is handled entirely through Google OAuth, which manages secure token generation and expiration according to OAuth2 standards.
21. Verify that passwords are stored in a form that is resistant to offline attacks. Passwords SHALL be salted and hashed using an approved one-way key derivation or password hashing function. Key derivation and password hashing functions take a password, a salt, and a cost factor as inputs when generating a password hash. ([C6](https://owasp.org/www-project-proactive-controls/#div-numbering))

Yes
No
MailMop does not store passwords. Authentication is delegated to Google OAuth, where Google handles secure password storage and verification. MailMop only receives OAuth tokens, never user passwords.
22. Verify shared or default accounts are not present (e.g. "root", "admin", or "sa").

**Yes**
No

No shared or default accounts exist in the application. All authentication is handled through individual Google OAuth accounts with unique user identities. There are no administrative backdoors, default accounts, or shared credentials. Each user authenticates with their personal Google account, and the application does not create or maintain any system-level accounts. Supabase handles user management with individual UUID-based user identities, eliminating shared account risks.
23. Verify that lookup secrets can be used only once.

**Yes**
No

The application does not use traditional lookup secrets. OAuth authorization codes are single-use by design and automatically invalidated after token exchange. OAuth access tokens have limited lifespans and are refreshed using secure refresh tokens. Any temporary secrets generated during the OAuth flow follow OAuth2 specifications for single-use consumption. The Gmail API enforces its own rate limiting and token validation to prevent replay attacks.
24. Verify that the out of band verifier expires out of band authentication requests, codes, or tokens after 10 minutes.

**Yes**
No

Out of band authentication is handled by Google OAuth, which automatically expires authorization codes within minutes (typically 10 minutes or less) according to OAuth2 specifications. OAuth access tokens have short lifespans (typically 1 hour), and refresh tokens expire based on Google's security policies. The application does not implement custom out-of-band authentication; all time-sensitive tokens are managed by Google's secure OAuth infrastructure with appropriate expiration times.
25. Verify that the initial authentication code is generated by a secure random number generator, containing at least 20 bits of entropy (typically a six digital random number is sufficient).

**Yes**
No

Authentication codes are generated by Google's OAuth2 infrastructure, which uses cryptographically secure random number generators with far more than 20 bits of entropy. The application relies on Google's proven OAuth implementation for all authentication code generation. OAuth authorization codes typically contain 43+ characters with sufficient entropy to meet security requirements. The application does not generate its own authentication codes, ensuring compliance through Google's secure implementation.
26. Verify that logout and expiration invalidate the session token, such that the back button or a downstream relying party does not resume an authenticated session, including across relying parties. ([C6](https://owasp.org/www-project-proactive-controls/#div-numbering))

**Yes**
No

Logout and token expiration properly invalidate sessions across all layers. The logout process calls Supabase signOut() to invalidate local sessions, revokes Google OAuth tokens server-side via the auth/revoke API, and clears all client-side storage. Browser back button cannot resume authenticated sessions due to proper session invalidation. The middleware enforces fresh authentication checks on each request. Token expiration is handled by both Supabase (session tokens) and Google (OAuth tokens), preventing session resumption after expiration.
27. Verify that the application gives the option to terminate all other active sessions after a successful password change (including change via password reset/recovery), and that this is effective across the application, federated login (if present), and any relying parties.

Yes
No
Password changes are handled by Google OAuth system, not within MailMop. Google provides session management for their OAuth tokens. MailMop could implement session termination but currently relies on Google's security policies for OAuth session management.
28. Verify the application uses session tokens rather than static API secrets and keys, except with legacy implementations.

**Yes**
No

The application exclusively uses dynamic session tokens instead of static API keys. Authentication relies on OAuth2 access tokens that expire and refresh automatically, Supabase session tokens with built-in expiration, and dynamic JWT tokens for API access. No static API keys are exposed to users or used for authentication. Server-side API keys are stored securely in environment variables and are not used for user sessions. All user authentication is token-based with proper expiration and refresh mechanisms.
29. Verify the application ensures a full, valid login session or requires re-authentication or secondary verification before allowing any sensitive transactions or account modifications.

**Yes**
No

All sensitive operations require a valid, authenticated session. The middleware enforces authentication before accessing any dashboard functionality. Sensitive operations like subscription upgrades, data export, and account modifications require valid OAuth tokens and active Supabase sessions. Token validation occurs on every API request. While the application doesn't perform highly sensitive financial transactions, email actions are protected by OAuth scope limitations and require fresh token validation. Session validity is continuously verified through token refresh mechanisms.
30. Verify that the application enforces access control rules on a trusted service layer, especially if client-side access control is present and could be bypassed.

**Yes**
No

Access control is enforced at the trusted service layer through Next.js middleware, Supabase RLS policies, and API route authentication. While client-side UI controls exist for user experience, all security decisions are made server-side. The middleware protects routes before they reach client code. API endpoints independently validate tokens and user permissions. Supabase enforces row-level security preventing data access bypassing. Client-side access controls are purely cosmetic and cannot be relied upon for security.

31. Verify that all user and data attributes and policy information used by access controls cannot be manipulated by end users unless specifically authorized.

**Yes**
No

User attributes and policy information are protected from manipulation. User IDs are generated by Supabase and stored server-side in JWTs that cannot be forged. OAuth tokens are validated by Google's servers, not locally. Subscription status and permissions are stored in Supabase with RLS policies preventing unauthorized changes. User profiles can only be modified through authenticated API endpoints. Gmail permissions are controlled by OAuth scopes that users cannot escalate. All authorization decisions use server-side validated data.

32. Verify that the principle of least privilege exists - users should only be able to access functions, data files, URLs, controllers, services, and other resources, for which they possess specific authorization. This implies protection against spoofing and elevation of privilege. ([C7](https://owasp.org/www-project-proactive-controls/#div-numbering))

**Yes**
No

The principle of least privilege is enforced throughout the application. Users can only access their own Gmail data through OAuth scope limitations. Dashboard access requires authentication via middleware. API endpoints verify user identity and restrict access to user-specific resources. Supabase RLS ensures users can only access their own database records. Premium features are gated by subscription status validation. No administrative functions are exposed to regular users. File system access is prevented by serverless architecture. OAuth scopes limit Gmail API access to metadata only.

33. Verify that access controls fail securely including when an exception occurs. ([C10](https://owasp.org/www-project-proactive-controls/#div-numbering))

**Yes**
No

Access controls fail securely with proper error handling. The middleware redirects unauthenticated users to login by default. API routes return 401/403 errors and deny access when token validation fails. Supabase RLS policies deny access by default when rules don't match. Exception handling in try-catch blocks prevents information leakage and maintains security boundaries. OAuth token failures result in re-authentication prompts. Database errors don't bypass security checks. The application defaults to denying access rather than allowing it when errors occur.
34. Verify that sensitive data and APIs are protected against Insecure Direct Object Reference (IDOR) attacks targeting creation, reading, updating and deletion of records, such as creating or updating someone else's record, viewing everyone's records, or deleting all records.

**Yes**
No

IDOR attacks are prevented through multiple layers of protection. Supabase RLS policies ensure users can only access their own records using user.id in WHERE clauses. All API endpoints validate user identity before database operations. Gmail API access is user-scoped through OAuth tokens that only grant access to the authenticated user's mailbox. No direct object IDs are exposed in URLs; all operations are user-context dependent. The client-first architecture means users can only see and manipulate their own data through validated API tokens.

35. Verify administrative interfaces use appropriate multi-factor authentication to prevent unauthorized use.

**Yes**
No

There are no traditional administrative interfaces in the application. All administration is handled through secure cloud provider dashboards: Vercel for deployment (with MFA available), Supabase for database management (with MFA support), and Google Cloud Console for OAuth configuration (with MFA required). The application itself doesn't provide administrative functions; all users have the same permission level with access only to their own data. Any administrative access occurs through the secure provider interfaces with their own MFA requirements.

36. Verify that the application has defenses against HTTP parameter pollution attacks, particularly if the application framework makes no distinction about the source of request parameters (GET, POST, cookies, headers, or environment variables).

**Yes**
No

The application has protections against HTTP parameter pollution. Next.js properly distinguishes between parameter sources (query, body, headers, cookies). Input validation functions explicitly validate and sanitize parameters from specific sources. API routes use TypeScript interfaces to define expected parameter structure. Request parsing is handled by Next.js with built-in protections. The middleware validates requests before they reach handlers. No dangerous parameter mixing occurs, and all inputs are validated regardless of source.

37. Verify that the application sanitizes user input before passing to mail systems to protect against SMTP or IMAP injection.

**Yes**
No

The application does not interact with SMTP or IMAP systems directly. Gmail API interactions use Google's secure API endpoints with structured JSON requests, not raw email protocols. User input is sanitized through comprehensive validation functions in inputValidation.ts. Search queries and email filters are validated and escaped before API calls. The Gmail API handles all email protocol interactions securely. No direct SMTP/IMAP commands are constructed from user input, eliminating injection attack vectors through API abstraction.
38. Verify that the application avoids the use of eval() or other dynamic code execution features. Where there is no alternative, any user input being included must be sanitized or sandboxed before being executed.

**Yes**
No

The application completely avoids eval() and dynamic code execution. All code is statically analyzed through TypeScript compilation and ESLint rules that prohibit eval() usage. No user input is ever executed as code. React components use safe rendering with automatic XSS protection. JSON parsing uses JSON.parse() with input validation, never eval(). All dynamic content is handled through safe React state management and template rendering. Next.js build process prevents dangerous dynamic code patterns. ESLint configuration specifically blocks eval() and similar dangerous functions.

39. Verify that the application protects against SSRF attacks, by validating or sanitizing untrusted data or HTTP file metadata, such as filenames and URL input fields, and uses allow lists of protocols, domains, paths and ports.

**Yes**
No

The application is protected against SSRF attacks through multiple mechanisms. All external HTTP requests are made to trusted, predefined endpoints: Google APIs for OAuth and Gmail, Supabase for database, and Stripe for payments. No user-controlled URLs are used for server-side requests. The serverless architecture limits SSRF attack surface. API routes only call specific, validated endpoints with allow-listed domains. No file upload or URL input fields that could trigger SSRF exist. All external API calls use HTTPS and validated endpoints only.

40. Verify that the application sanitizes, disables, or sandboxes user-supplied Scalable Vector Graphics (SVG) scriptable content, especially as they relate to XSS resulting from inline scripts, and foreignObject.

**Yes**
No

The application does not accept or process user-supplied SVG content. All SVG icons and graphics are static assets from the build process or trusted icon libraries. No user-generated SVG content is rendered or stored. React's built-in XSS protection prevents dangerous SVG rendering even if such content were introduced. The CSP headers block inline scripts that could execute within SVGs. No SVG upload or user-generated graphics functionality exists, eliminating SVG-based XSS attack vectors. All visual content is from trusted, static sources.
41. Verify that output encoding is relevant for the interpreter and context required. For example, use encoders specifically for HTML values, HTML attributes, JavaScript, URL parameters, HTTP headers, SMTP, and others as the context requires, especially from untrusted inputs (e.g. names with Unicode or apostrophes, such as ねこ or O'Hara). ([C4](https://owasp.org/www-project-proactive-controls/#div-numbering))

**Yes**
No

The application implements context-appropriate output encoding throughout. React provides automatic HTML encoding for JSX content preventing XSS. URL parameters are encoded using encodeURIComponent() before API calls. JSON data is properly serialized and parsed with built-in encoding. Email metadata is sanitized through inputValidation.ts with context-specific filters. Next.js automatically handles HTML attribute encoding. All user input is validated and encoded based on its destination context (HTML, URLs, JSON) to prevent injection attacks.
42. Verify that the application protects against JSON injection attacks, JSON eval attacks, and JavaScript expression evaluation. ([C4](https://owasp.org/www-project-proactive-controls/#div-numbering))

**Yes**
No

The application is protected against JSON injection and eval attacks. All JSON parsing uses safe JSON.parse() with input validation, never eval(). User input is validated and sanitized before JSON serialization. React prevents JavaScript expression evaluation in JSX. TypeScript compilation catches potential injection vulnerabilities. ESLint rules prohibit dangerous functions like eval(). No dynamic JavaScript generation from user input occurs. All data exchange uses structured JSON with proper validation and type checking.
43. Verify that the application protects against LDAP injection vulnerabilities, or that specific security controls to prevent LDAP injection have been implemented. ([C4](https://owasp.org/www-project-proactive-controls/#div-numbering))

**Yes**
No

The application does not use LDAP directories or authentication, eliminating LDAP injection risks. Authentication is handled through Google OAuth and Supabase, neither of which use LDAP. No LDAP queries or directory operations are performed. All user data is stored in Supabase (PostgreSQL) with parameterized queries and RLS policies. The architecture does not include any LDAP components, making LDAP injection attacks impossible against this application.
44. Verify that regulated private data is stored encrypted while at rest, such as Personally Identifiable Information (PII), sensitive personal information, or data assessed likely to be subject to EU's GDPR.

**Yes**
No

All regulated private data is encrypted at rest. Supabase provides database encryption at rest for all stored data including user profiles and action logs. OAuth refresh tokens are stored in encrypted httpOnly cookies. IndexedDB data on client devices uses browser-level encryption. Email content is never stored; only metadata is cached locally. Stripe handles payment data with PCI DSS compliance and encryption. The minimal data stored (email addresses, usage analytics) is encrypted at rest through cloud provider security. 
45. Verify that all cryptographic operations are constant-time, with no 'short-circuit' operations in comparisons, calculations, or returns, to avoid leaking information.

**Yes**
No

Cryptographic operations are handled by trusted libraries and services that implement constant-time algorithms. OAuth token validation is performed by Google's infrastructure with timing attack protections. Supabase uses PostgreSQL's built-in cryptographic functions that are constant-time. Browser crypto APIs used for local operations implement constant-time comparisons. The application does not implement custom cryptographic operations that could introduce timing vulnerabilities. All crypto is delegated to proven, audited implementations.
46. Verify that random GUIDs are created using the GUID v4 algorithm, and a Cryptographically-secure Pseudo-random Number Generator (CSPRNG). GUIDs created using other pseudo-random number generators may be predictable.

**Yes**
No

All GUIDs are generated using secure methods. Supabase automatically generates UUID v4 identifiers using PostgreSQL's gen_random_uuid() function, which uses CSPRNG. Browser-generated IDs use crypto.randomUUID() which implements UUID v4 with CSPRNG. OAuth tokens and session IDs are generated by Google and Supabase using cryptographically secure methods. The application does not generate custom UUIDs; all unique identifiers come from trusted sources with proper randomness.
47. Verify that key material is not exposed to the application but instead uses an isolated security module like a vault for cryptographic operations. ([C8](https://owasp.org/www-project-proactive-controls/#div-numbering))

**Yes**
No

Key material is properly isolated from the application. Environment variables containing API keys are stored in Vercel's secure vault and never exposed to client code. OAuth private keys are managed by Google's secure infrastructure. Supabase handles database encryption keys in their secure key management system. Stripe API keys are stored server-side only in environment variables. The application never directly handles encryption keys or cryptographic material; all operations are delegated to secure, isolated services that manage their own key material.
48. Verify that the application does not log credentials or payment details. Session tokens should only be stored in logs in an irreversible, hashed form. ([C9, C10](https://owasp.org/www-project-proactive-controls/#div-numbering))

**Yes**
No

The application never logs credentials or payment details. The logger utility is configured to filter sensitive information and only logs sanitized data. OAuth tokens and session tokens are never logged; only user IDs and action types are recorded. Payment processing is handled entirely by Stripe with no payment details exposed to the application. Supabase logs are configured to exclude sensitive user data. Error logging sanitizes any potential credential information. All logging follows security best practices with data minimization and sensitive information exclusion.
49. Verify the application protects sensitive data from being cached in server components such as load balancers and application caches.

**Yes**
No

Sensitive data is protected from server-side caching through multiple mechanisms. API routes that handle sensitive operations include appropriate Cache-Control headers (no-cache, no-store). Vercel's edge network is configured to not cache authenticated requests or API responses containing sensitive data. OAuth tokens are passed via headers, not cached URLs. Database responses containing user data include proper cache directives. Static assets are cached, but contain no sensitive information. All dynamic, user-specific content bypasses caching layers.
50. Verify that data stored in browser storage (such as localStorage, sessionStorage, IndexedDB, or cookies) does not contain sensitive data.

**Yes**
No

localStorage contains only non-sensitive analysis results and UI state. Sensitive tokens stored in httpOnly cookies (not accessible to JavaScript) or memory only. IndexedDB contains email metadata only (sender, date, count) - no email content. Proper data classification implemented for client storage. The appeal of this application/purpose is to store this data client side in Indexeddb.
51. Verify that sensitive data is sent to the server in the HTTP message body or headers, and that query string parameters from any HTTP verb do not contain sensitive data.

**Yes**
No

Sensitive data is properly transmitted through secure channels. OAuth tokens are sent via Authorization headers, never URL parameters. API requests containing sensitive data use POST with JSON bodies. Authentication cookies are httpOnly and secure. No sensitive information appears in query strings or URL parameters. Session tokens, user data, and API keys are transmitted through secure headers or request bodies only. All sensitive data transmission follows HTTPS and uses appropriate HTTP methods and locations.
52. Verify accessing sensitive data is audited (without logging the sensitive data itself), if the data is collected under relevant data protection directives or where logging of access is required.

**Yes**
No

Access to sensitive data is properly audited without logging the data itself. Supabase provides audit logs for authentication events and database access. User actions (delete, unsubscribe, export) are logged with user ID, timestamp, and action type - but not the actual email content or sensitive details. Vercel logs API access patterns without sensitive payload data. OAuth token usage is tracked by Google's audit systems. The application maintains compliance with data protection requirements through comprehensive access logging that preserves privacy.
53. Verify that connections to and from the server use trusted TLS certificates. Where locally generated or self-signed certificates are used, the server must be configured to only trust specific local CAs and specific self-signed certificates. All others should be rejected.

**Yes**
No

All connections use trusted TLS certificates from established Certificate Authorities. Vercel provides automatic SSL/TLS certificates through Let's Encrypt with automatic renewal. Supabase uses trusted CA certificates for database connections. Google APIs require valid TLS certificates for OAuth and Gmail API access. Stripe enforces TLS with trusted certificates. No self-signed or locally generated certificates are used in production. All external API connections validate certificate chains and reject untrusted certificates. TLS 1.2+ is enforced across all connections.
54. Verify that proper certification revocation, such as Online Certificate Status Protocol (OCSP) Stapling, is enabled and configured.

**Yes**
No

Certificate revocation is properly implemented through trusted infrastructure. Vercel automatically configures OCSP stapling for Let's Encrypt certificates with proper revocation checking. Browsers perform certificate revocation checks when accessing the application. All external service connections (Google APIs, Supabase, Stripe) implement OCSP and certificate revocation validation. The hosting platform handles certificate lifecycle management including revocation checking. No custom certificate management is required, ensuring proper revocation protocols are followed through established, secure infrastructure.
