# MailMop 📧🧹

> As of June 2025, Currently beta-testing with a few folks prior to submitting for Google's CASA 2 verification.

**A privacy-first Gmail inbox decluttering tool that processes everything locally in your browser**

MailMop is a client-heavy, privacy-focused Gmail cleaning tool built with Next.js, Supabase, and the Gmail API. Unlike traditional email management tools that upload your data to remote servers, MailMop processes everything locally in your browser, ensuring your emails never leave your device.

[![License: Source Available](https://img.shields.io/badge/License-Source%20Available-blue.svg)](https://github.com/neilbhammar/mailmop)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org/)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-green)](https://supabase.com/)
[![Gmail API](https://img.shields.io/badge/Gmail-API-red)](https://developers.google.com/gmail)

## 🚀 Live Demo

Visit [mailmop.com](https://mailmop.com) to see it in action (currently in beta with waitlist).

## 📖 Background & Why I Built This

### The Problem
I was drowning in my Gmail inbox with over 50,000 emails. Most existing inbox cleaning tools require you to upload your emails to their servers, which felt uncomfortable from a privacy standpoint. I wanted something that:

- **Respects privacy**: Processes emails locally, never uploads them
- **Actually works**: Can handle massive inboxes (50k-500k+ emails)  
- **Is transparent**: Open source so you can see exactly what it does
- **Focuses on metadata**: Only looks at headers (sender, subject, date), never email content

### The Solution
I built MailMop to be the email cleaning tool I wanted to exist. It uses the Gmail API's metadata-only scope to analyze your inbox locally, identifying bulk senders, promotions, and noise—all while keeping your emails on your device.

### A Note on Experience

**Full transparency**: I'm not a professional developer, in fact, I'm not even technical! I've always had an appreciation for the engineers I've worked with and a fascination for making things, so this was my way of dipping my toes in the water. This is my first time building something substantial and (despite 95% of the code surely being Cursor generated) I tried to be really intentional about architecture and quality. That said, I'm certain I made a lot of suboptimal decisions and trade-offs along the way.

If you're an experienced developer and see things that could be improved, I'd genuinely love your feedback! The goal was to build something that works well and is maintainable, but I know there's going to be tons of room for improvement.

## 🔐 Privacy-First Architecture

### Why Local Processing Matters

Traditional email tools work like this:
```
Your Gmail → Their Servers → Analysis → Results
```

MailMop works like this:
```
Your Gmail → Your Browser → Analysis → Results
```

**Key Privacy Features:**
- ✅ **Client-side processing**: All analysis happens in your browser
- ✅ **Metadata only**: We never access email content, only headers, we request full access so that MailMop can do advanced queries when fetching  
- ✅ **No email storage**: Your emails are never uploaded or stored
- ✅ **Revoke anytime**: Disconnect with one click

## 🏗️ Technical Architecture

### Core Technologies
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Gmail Integration**: Gmail API 
- **Local Storage**: IndexedDB for efficient local data caching
- **State Management**: React Context with custom providers
- **UI Components**: Radix UI + ShadCN for accessible components
- **AI Development Stack**: [Cursor](https://cursor.so/) with Claude Sonnet for AI-assisted development

### Key Architectural Decisions

**1. Client-Heavy Design**
- Gmail API calls made directly from browser using gapi
- Refresh tokens stored in secure httpOnly cookies
- Access tokens cached in memory only (never persisted)
- Heavy metadata processing done locally with IndexedDB

**2. Progressive Analysis**
- Analyzes inboxes in batches (100 messages at a time)
- Real-time updates as analysis progresses
- Can handle massive inboxes (tested with 500k+ emails)

**3. Context-Driven State**
- `AuthProvider`: User authentication state
- `GmailPermissionsProvider`: Gmail API access management  
- `AnalysisProvider`: Inbox analysis state and operations

**4. Privacy by Design**
- No email content ever processed
- Minimal server-side data (just user auth and action logs)
- All sensitive operations happen client-side

## 📂 Project Structure

```
mailmop/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── dashboard/           # Main analysis interface
│   │   ├── api/auth/           # OAuth token management
│   │   └── api/stripe/         # Subscription handling
│   ├── components/
│   │   ├── dashboard/          # Analysis UI components
│   │   ├── landing/            # Marketing site
│   │   └── ui/                 # Shared UI (ShadCN)
│   ├── context/                # React context providers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and Gmail API
│   └── types/                  # TypeScript definitions
├── supabase/
│   ├── migrations/             # Database schema
│   └── functions/              # Edge functions (email automation)
└── public/                     # Static assets
```

## 🌟 Why Open Source?

I'm making MailMop **source available** for several reasons:

1. **Transparency**: Email tools should be transparent about what they do with your data
2. **Trust**: You can audit the code to verify privacy claims
3. **Learning**: This is my first major project—I'd love feedback from experienced developers
4. **Community**: Others might want to contribute improvements or fork for their needs

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- A Google Cloud Project (for Gmail API)
- A Supabase account

### 1. Clone the Repository

```bash
git clone https://github.com/neilbhammar/mailmop.git
cd mailmop
npm install
```

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/auth/callback`
   - Note your Client ID and Client Secret

### 3. Set Up Supabase

1. Create a new Supabase project
2. Run the database migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
3. Set up authentication:
   - Go to Authentication → Providers → Google
   - Add your Google OAuth credentials

### 4. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Google OAuth (for l ocal development)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Local URLs
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"


### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📊 Database Schema

The project uses Supabase with the following key tables:

- `profiles`: User profile information
- `action_logs`: Analytics on user actions (delete, unsubscribe, etc.)
- `daily_stats`: Aggregated statistics for the landing page
- `beta_whitelist`: Beta access management

All migrations are in `supabase/migrations/` and version controlled.

## 🔧 Key Features

- **📊 Inbox Analysis**: Identify bulk senders and email patterns
- **🗑️ Bulk Actions**: Delete, unsubscribe, mark as read in batches
- **🏷️ Smart Labels**: Automatic labeling and Gmail filter creation
- **📱 Progressive Analysis**: Works with any inbox size
- **🔄 Real-time Updates**: See results as analysis progresses
- **🎯 Sender Insights**: Detailed breakdown by sender with action counts
- **📈 Statistics**: Track your inbox cleaning progress

## 🚀 Deployment

The app is designed to be deployed on Vercel with Supabase as the backend:

1. Deploy to Vercel
2. Set production environment variables
3. Configure Supabase Edge Functions
4. Update Google OAuth redirect URIs for production

See `ENVIRONMENT_SETUP_EXPLAINED.md` for detailed deployment instructions.

## 🤝 Contributing

While this is primarily a personal project, I welcome:

- 🐛 Bug reports and fixes
- 💡 Feature suggestions  
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🔍 Code review and architecture feedback

Please open an issue first to discuss major changes.

## 📄 License

This project is source available under a custom license. You're free to:
- ✅ View and modify
- ✅ Run it locally for personal use
- ✅ Submit issues and improvements

Please see the LICENSE file for full terms.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Backend powered by [Supabase](https://supabase.com/)
- UI components from [Radix UI](https://www.radix-ui.com/) and [ShadCN](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

## 📧 Contact

- Website: [mailmop.com](https://mailmop.com)
- GitHub: [@neilbhammar](https://github.com/neilbhammar)

---

**Built with ❤️ for privacy-conscious email users**
