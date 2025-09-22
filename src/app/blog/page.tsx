import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { Metadata } from 'next'
import { getBlogPosts } from '@/lib/blog'
import { Calendar, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'MailMop Blog | Gmail Storage & Email Management Tips',
  description: 'Expert advice on Gmail storage management, email cleanup, and inbox organization. Learn how to free up Gmail space and manage your inbox efficiently.',
  keywords: 'gmail storage, email cleanup, inbox management, gmail tips, email organization',
  alternates: {
    canonical: 'https://mailmop.com/blog',
  },
  openGraph: {
    title: 'MailMop Blog | Gmail Storage & Email Management Tips',
    description: 'Expert advice on Gmail storage management, email cleanup, and inbox organization.',
    type: 'website',
    url: 'https://mailmop.com/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MailMop Blog | Gmail Storage & Email Management Tips',
    description: 'Expert advice on Gmail storage management, email cleanup, and inbox organization.',
  },
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format ISO date for schema
function formatISODate(dateString: string): string {
  return new Date(dateString).toISOString()
}

// Next.js 15 page component type
export default async function BlogPage({
  params,
  searchParams
}: {
  params?: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // We don't need to await params/searchParams here since we're not using them
  const posts = await getBlogPosts()
  const featuredPost = posts.find(post => post.featured)
  const otherPosts = posts.filter(post => !post.featured)

  // JSON-LD structured data for BlogPosting list
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'MailMop Blog',
    description: 'Expert advice on Gmail storage management, email cleanup, and inbox organization.',
    url: 'https://mailmop.com/blog',
    publisher: {
      '@type': 'Organization',
      name: 'MailMop',
      url: 'https://mailmop.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://mailmop.com/logo10.png'
      }
    },
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: formatISODate(post.date),
      dateModified: formatISODate(post.date),
      author: {
        '@type': 'Organization',
        name: post.author || 'MailMop Team',
      },
      url: `https://mailmop.com/blog/${post.slug}`,
      keywords: post.tags?.join(', ')
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Umami Analytics - Blog page tracking */}
      <Script
        defer
        src="https://cloud.umami.is/script.js"
        data-website-id="99d13ac3-8c9d-4499-94d7-4aa6e5e7f56d"
        strategy="afterInteractive"
        {...(process.env.NEXT_PUBLIC_UMAMI_INTEGRITY && {
          integrity: process.env.NEXT_PUBLIC_UMAMI_INTEGRITY
        })}
        crossOrigin="anonymous"
      />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Simple header with only logo */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo10.png"
              alt="MailMop - Email Cleanup Tool"
              width={120}
              height={30}
              className="h-7 w-auto"
              priority
            />
          </Link>
          
          <Link
            href="/"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Try MailMop Free
          </Link>
        </div>
      </header>

      {/* Engaging hero with gradient */}
      <section className="py-12 md:py-12 bg-gradient-to-br from-primary/5 via-primary/3 to-background border-b">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-0 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
            ✨ Latest Gmail Tips & Guides
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-black dark:text-white">
            Master Your Gmail Inbox
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            Expert strategies to clean up Gmail, free up storage, and reclaim hours of productivity. No more email overwhelm.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              Try MailMop Free
            </Link>
            <Link
              href="#articles"
              className="px-6 py-3 border border-muted-foreground/20 rounded-lg hover:bg-muted/50 transition-colors font-semibold"
            >
              Browse Articles
            </Link>
          </div>
        </div>
      </section>

      <main className="w-full">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          {/* Featured Post */}
          {featuredPost && (
            <section aria-label="Featured Article" className="mb-20" id="articles">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  Featured Article
                </h2>
                <p className="text-muted-foreground">Our latest and most comprehensive guide</p>
              </div>
              <article className="group relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Link href={`/blog/${featuredPost.slug}`} className="block p-8 relative z-10">
                  {featuredPost.tags && featuredPost.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1">
                        <span className="w-1 h-1 bg-primary-foreground rounded-full"></span>
                        Featured
                      </span>
                      <span className="px-3 py-1 bg-background/90 backdrop-blur-sm text-muted-foreground text-xs font-medium rounded-full border border-border/80">
                        {featuredPost.tags[0].replace('-', ' ')}
                      </span>
                    </div>
                  )}
                  <h3 className="text-3xl md:text-4xl font-bold mb-4 group-hover:text-primary transition-colors line-clamp-2">
                    {featuredPost.title}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed text-lg line-clamp-3">
                    {featuredPost.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(featuredPost.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {featuredPost.readingTime} min read
                      </span>
                    </div>
                    <span className="text-primary font-medium group-hover:underline flex items-center gap-1">
                      Read more
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </article>
            </section>
          )}

          {/* All Posts */}
          <section aria-label="All Articles">
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
                {featuredPost ? 'All Articles' : 'Articles'}
              </h2>
              <p className="text-muted-foreground">Deep-dive guides to master your Gmail</p>
            </div>
            
            {posts.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2">
                {(featuredPost ? otherPosts : posts).map((post) => (
                  <article
                    key={post.slug}
                    className="group bg-card/80 backdrop-blur-sm border border-border rounded-xl overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                  >
                    <Link href={`/blog/${post.slug}`} className="block p-6 h-full">
                      {post.tags && post.tags.length > 0 && (
                        <span className="inline-block px-3 py-1 bg-background/90 backdrop-blur-sm text-xs text-muted-foreground rounded-full mb-3 border border-border/80">
                          {post.tags[0].replace('-', ' ')}
                        </span>
                      )}
                      
                      <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3 leading-relaxed">
                        {post.description}
                      </p>
                    
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                        <div className="flex items-center gap-3">
                          <time dateTime={formatISODate(post.date)} className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.date)}
                          </time>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.readingTime} min read
                          </span>
                        </div>
                        <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          →
                        </span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground mb-4">
                We're working on helpful Gmail guides. Check back soon!
              </p>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
              >
                Try MailMop Free
              </Link>
            </div>
          )}
        </section>

          {/* Simple CTA */}
          <section className="mt-16 pt-8 border-t">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">
                    Clean up your Gmail inbox
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    MailMop helps you free up space in minutes, not hours.
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                >
                  Try MailMop Free
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      {/* Simple footer with links for SEO */}
      <footer className="container mx-auto px-6 py-8 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MailMop. All rights reserved.</p>
          <nav className="flex gap-6 mt-4 md:mt-0">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
} 