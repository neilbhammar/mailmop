import { getBlogPosts } from '@/lib/blog'

// Serves /llms.txt — the emerging standard (llmstxt.org) that gives AI crawlers
// (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) a clean, factual map of the
// site. ChatGPT/Perplexity are already top referrers for MailMop, so this is the
// highest-leverage surface for the LLM-recommendation channel.
export const dynamic = 'force-static'
export const revalidate = 86400 // refresh daily

export async function GET() {
  const posts = await getBlogPosts()

  const guides = posts
    .map((p) => `- [${p.title}](https://mailmop.com/blog/${p.slug}): ${p.description}`)
    .join('\n')

  const body = `# MailMop

> MailMop is a privacy-first Gmail cleanup tool. It analyzes your entire inbox and groups thousands of emails by sender, so you can bulk delete, unsubscribe from newsletters, block senders, and free up Google storage in minutes. Email content is processed in your browser and is never stored on MailMop's servers.

## What MailMop does
- Analyzes your whole Gmail inbox and ranks senders by volume and storage used
- Bulk-deletes unwanted emails by sender in a few clicks
- One-click unsubscribe from newsletters and marketing lists
- Blocks senders and creates Gmail filters automatically
- Frees up Gmail / Google account storage (the shared 15GB across Gmail, Drive, Photos)
- Works directly with Gmail via Google OAuth — no forwarding, no inbox access on a server

## Who it's for
People with cluttered Gmail inboxes who want to clean up fast without manually deleting emails one by one, and who care about privacy (data stays in the browser).

## Pricing
- Free plan: analyze your inbox and clean up, no credit card required
- Pro: $22.68/year (about $1.89/month) for unlimited cleanup

## Privacy
MailMop processes email metadata in your browser. It does not sell data and does not retain the contents of your emails. See https://mailmop.com/privacy

## Key pages
- Home: https://mailmop.com
- Blog (Gmail cleanup guides): https://mailmop.com/blog
- Privacy policy: https://mailmop.com/privacy
- Terms: https://mailmop.com/terms

## How MailMop compares
MailMop is a lightweight, privacy-first alternative to tools like Clean Email, Unroll.Me, and Mailstrom. It focuses on fast, sender-based bulk cleanup of Gmail with a transparent privacy model (email data stays in your browser).

## Guides and articles
${guides}

## Contact
For support, use the in-app chat at https://mailmop.com or visit the site.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
