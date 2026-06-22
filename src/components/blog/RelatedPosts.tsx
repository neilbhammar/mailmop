import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export interface RelatedPostLink {
  slug: string
  title: string
  description: string
}

/**
 * Internal linking block for blog posts. Distributes link equity between related
 * articles and keeps readers on-site — previously the blog had no internal linking
 * at all (the template just had a "could be added here" comment).
 */
export function RelatedPosts({ posts }: { posts: RelatedPostLink[] }) {
  if (!posts || posts.length === 0) return null

  return (
    <section className="mt-16 pt-12 border-t max-w-4xl" aria-labelledby="related-heading">
      <h2 id="related-heading" className="text-2xl font-bold mb-6 text-foreground">
        Keep reading
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block p-5 rounded-xl border border-border/80 bg-card/60 hover:bg-muted/50 transition-colors"
          >
            <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {post.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{post.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Read more
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
