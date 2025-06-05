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

        <main className="container mx-auto px-6 py-12 md:max-w-3xl">
          <article itemScope itemType="https://schema.org/Article">
            {/* SEO optimization: meta information */}
            <meta itemProp="headline" content={post.title} />
            <meta itemProp="description" content={post.description} />
            <meta itemProp="datePublished" content={publishDate} />
            <meta itemProp="dateModified" content={publishDate} />
            <link itemProp="mainEntityOfPage" href={url} />
            
            {/* Clean, minimal article header */}
            <header className="mb-10">
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                    >
                      {tag.replace('-', ' ')}
                    </span>
                  ))}
                </div>
              )}

              <h1 itemProp="name" className="text-3xl md:text-4xl font-bold mb-6 leading-tight tracking-tight">
                {post.title}
              </h1>

              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {post.description}
              </p>

              <div className="flex items-center gap-5 text-sm text-muted-foreground border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <time itemProp="datePublished" dateTime={publishDate}>{formattedDate}</time>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{post.readingTime} min read</span>
                </div>
              </div>
            </header>

            {/* Simple inline TOC - only shown if there are headings */}
            {headings.length > 0 && (
              <nav aria-label="Table of Contents" className="mb-10 p-4 bg-muted/30 rounded-lg">
                <h2 className="font-medium text-base mb-3">Table of Contents</h2>
                <ul className="space-y-2">
                  {headings.map((heading) => (
                    <li key={heading.id} className={heading.level === 3 ? "ml-4" : ""}>
                      <a 
                        href={`#${heading.id}`}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center"
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* Article Content - Clean typography */}
            <div itemProp="articleBody" className="prose prose-slate max-w-none dark:prose-invert">
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

          {/* Clean CTA */}
          <section className="mt-16 pt-8 border-t">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">
                    Clean up your Gmail inbox effortlessly
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    MailMop analyzes your inbox and helps you free up space in minutes, not hours.
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
          
          {/* Related posts could be added here for internal linking and SEO */}
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