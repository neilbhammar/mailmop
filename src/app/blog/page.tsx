import Link from 'next/link'
import Image from 'next/image'
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

export default async function BlogPage() {
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

      {/* Simple, clean hero */}
      <section className="py-12 md:py-16 border-b">
        <div className="container mx-auto px-6 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Gmail Tips & Guides
          </h1>
          <p className="text-lg text-muted-foreground">
            Expert advice on cleaning up Gmail, managing storage, and organizing your inbox.
          </p>
        </div>
      </section>

      <main className="container mx-auto px-6 py-12 md:py-16 md:max-w-4xl">
        {/* Featured Post */}
        {featuredPost && (
          <section aria-label="Featured Article" className="mb-16">
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Featured</h2>
            </div>
            <article className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300">
              <Link href={`/blog/${featuredPost.slug}`} className="block p-6">
                {featuredPost.tags && featuredPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      Featured
                    </span>
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                      {featuredPost.tags[0].replace('-', ' ')}
                    </span>
                  </div>
                )}
                
                <h3 className="text-2xl font-bold mb-2 hover:text-primary transition-colors">
                  {featuredPost.title}
                </h3>
                
                <p className="text-muted-foreground mb-4 text-sm">
                  {featuredPost.description}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <time dateTime={formatISODate(featuredPost.date)}>
                      {formatDate(featuredPost.date)}
                    </time>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{featuredPost.readingTime} min read</span>
                  </div>
                </div>
              </Link>
            </article>
          </section>
        )}

        {/* All Posts */}
        <section aria-label="All Articles">
          <div className="mb-8">
            <h2 className="text-xl font-bold">
              {featuredPost ? 'All Articles' : 'Articles'}
            </h2>
          </div>
          
          {posts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {(featuredPost ? otherPosts : posts).map((post) => (
                <article
                  key={post.slug}
                  className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <Link href={`/blog/${post.slug}`} className="block p-5 h-full">
                    {post.tags && post.tags.length > 0 && (
                      <span className="inline-block px-2 py-1 bg-muted text-xs text-muted-foreground rounded-full mb-2">
                        {post.tags[0].replace('-', ' ')}
                      </span>
                    )}
                    
                    <h3 className="text-lg font-bold mb-2 line-clamp-2 hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {post.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <time dateTime={formatISODate(post.date)}>
                        {formatDate(post.date)}
                      </time>
                      <span>{post.readingTime} min read</span>
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