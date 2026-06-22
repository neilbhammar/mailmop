import { MetadataRoute } from 'next'

// Explicitly welcome AI crawlers in addition to traditional search bots.
// ChatGPT and Perplexity are already top referrers for MailMop, so being
// openly crawlable by GPTBot / ClaudeBot / PerplexityBot / Google-Extended
// directly supports the LLM-recommendation channel.
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/api/', '/dashboard/'],
      },
      ...AI_BOTS.map((bot) => ({
        userAgent: bot,
        allow: ['/'],
        disallow: ['/api/', '/dashboard/'],
      })),
    ],
    sitemap: 'https://mailmop.com/sitemap.xml',
    host: 'https://mailmop.com',
  }
}
