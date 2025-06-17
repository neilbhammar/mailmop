import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getBlogPost, generateBlogStaticParams } from '@/lib/blog'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { ReadingProgress } from '@/components/blog/ReadingProgress'
import { ArrowLeft, Clock, Calendar } from 'lucide-react'

// This is for static generation at build time
export async function generateStaticParams() {
  return await generateBlogStaticParams()
}

// Generate metadata for each blog post
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const resolvedParams = await params
  const post = await getBlogPost(resolvedParams.slug)

  if (!post) {
    return {
      title: 'Post Not Found | MailMop Blog',
    }
  }

  const url = `https://mailmop.com/blog/${post.slug}`

  return {
    title: `${post.title} | MailMop Blog`,
    description: post.description,
    keywords: post.tags?.join(', '),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: url,
      publishedTime: post.date,
      authors: [post.author || 'MailMop Team'],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
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

// Extract headings for Table of Contents
function extractHeadings(content: string) {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm
  const headings = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()
    
    // Only include h2 and h3
    if (level >= 2 && level <= 3) {
      headings.push({ id, text, level })
    }
  }

  return headings
}

// Updated type definition for Next.js 15 compatibility
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  // Use await to resolve the params Promise
  const resolvedParams = await params
  const post = await getBlogPost(resolvedParams.slug)

  if (!post) {
    notFound()
  }

  const headings = extractHeadings(post.content)
  const publishDate = formatISODate(post.date)
  const formattedDate = formatDate(post.date)
  const url = `https://mailmop.com/blog/${post.slug}`

  // JSON-LD structured data for Article
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Organization',
      name: post.author || 'MailMop Team',
      url: 'https://mailmop.com'
    },
    publisher: {
      '@type': 'Organization',
      name: 'MailMop',
      url: 'https://mailmop.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://mailmop.com/logo10.png'
      }
    },
    datePublished: publishDate,
    dateModified: publishDate,
    mainEntityOfPage: url,
    keywords: post.tags?.join(', '),
  }

  return (
    <>
      <ReadingProgress />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="min-h-screen bg-background">
        {/* Simple header with only logo and back button */}
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
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
        </header>

        {/* Full width main content area */}
        <main className="w-full">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <article itemScope itemType="https://schema.org/Article">
              {/* SEO optimization: meta information */}
              <meta itemProp="headline" content={post.title} />
              <meta itemProp="description" content={post.description} />
              <meta itemProp="datePublished" content={publishDate} />
              <meta itemProp="dateModified" content={publishDate} />
              <link itemProp="mainEntityOfPage" href={url} />
              
              {/* Enhanced article header */}
              <header className="mb-16 max-w-4xl relative">
                <div className="absolute -left-6 top-0 w-1 h-32 bg-gradient-to-b from-primary to-primary/30 rounded-full hidden lg:block"></div>
                
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {post.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={tag}
                        className={`px-4 py-2 text-sm font-semibold rounded-full border transition-colors ${
                          index === 0 
                            ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' 
                            : 'bg-background/90 backdrop-blur-sm text-muted-foreground border-border/80 hover:bg-muted/50'
                        }`}
                      >
                        {tag.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                )}

                <h1 itemProp="name" className="text-4xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">
                  {post.title}
                </h1>

                <div className="flex flex-col sm:flex-row sm:items-center gap-6 text-sm p-6 bg-card/60 backdrop-blur-sm rounded-xl border border-border/80">
                  <div className="flex items-center gap-6 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <time itemProp="datePublished" dateTime={publishDate} className="font-medium">
                        {formattedDate}
                      </time>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-medium">{post.readingTime} min read</span>
                    </div>
                  </div>
                  <div className="sm:ml-auto">
                    <Link 
                      href="/"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors border border-primary/30"
                    >
                      Try MailMop Free
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </header>

              {/* Article Content - Better typography and wider layout */}
              <div itemProp="articleBody" className="prose prose-slate prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground prose-p:leading-relaxed prose-p:text-foreground/90 prose-strong:text-foreground prose-strong:font-semibold prose-code:text-primary prose-code:bg-muted/50 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:border prose-code:border-border/50 prose-pre:bg-card prose-pre:border prose-pre:border-border prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:not-italic prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                <MDXRemote
                  source={post.content}
                  options={{
                    mdxOptions: {
                      remarkPlugins: [remarkGfm],
                      rehypePlugins: [
                        rehypeHighlight,
                        rehypeSlug,
                        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
                      ],
                    },
                  }}
                />
                            </div>
            
              {/* Author info for SEO */}
              <div itemProp="author" itemScope itemType="https://schema.org/Person" className="hidden">
                <meta itemProp="name" content={post.author || 'MailMop Team'} />
              </div>
              
              <div itemProp="publisher" itemScope itemType="https://schema.org/Organization" className="hidden">
                <meta itemProp="name" content="MailMop" />
                <meta itemProp="url" content="https://mailmop.com" />
                <div itemProp="logo" itemScope itemType="https://schema.org/ImageObject">
                  <meta itemProp="url" content="https://mailmop.com/logo10.png" />
                </div>
              </div>
            </article>

            {/* Enhanced CTA */}
            <section className="mt-20 pt-12 border-t max-w-4xl">
              <div className="relative bg-card/70 backdrop-blur-sm rounded-2xl p-8 md:p-12 overflow-hidden border border-border/80">
                <div className="absolute top-4 right-4 w-24 h-24 bg-primary/5 dark:bg-primary/10 rounded-full blur-xl"></div>
                <div className="absolute bottom-4 left-4 w-16 h-16 bg-primary/3 dark:bg-primary/5 rounded-full blur-lg"></div>
                
                <div className="relative z-10">
                  <div className="text-center max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6 border border-primary/30">
                      ✨ Ready to declutter?
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                      Clean up your Gmail inbox in minutes
                    </h3>
                    
                    <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                      Stop spending hours manually organizing emails. MailMop analyzes your inbox and identifies exactly what's taking up space, so you can reclaim your productivity.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-lg shadow-sm"
                      >
                        Try MailMop Free
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      <Link
                        href="/blog"
                        className="inline-flex items-center justify-center px-6 py-3 bg-background/90 backdrop-blur-sm border border-border/80 rounded-lg hover:bg-muted/50 transition-colors font-semibold text-lg"
                      >
                        More Gmail Tips
                      </Link>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-4">
                      Free forever • No credit card required • 2 minutes to get started
                    </p>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Related posts could be added here for internal linking and SEO */}
          </div>
        </main>
        
        <footer className="container mx-auto px-6 py-8 border-t mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} MailMop. All rights reserved.</p>
            <nav className="flex gap-6 mt-4 md:mt-0">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            </nav>
          </div>
        </footer>
      </div>
    </>
  )
} 