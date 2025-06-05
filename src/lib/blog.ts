import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { cache } from 'react'

// Type definitions for blog posts
export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author?: string
  tags?: string[]
  featured?: boolean
  image?: string
  imageAlt?: string
  content: string
  readingTime?: number
}

// Cache the posts for better performance
export const getBlogPosts = cache(async (): Promise<BlogPost[]> => {
  const postsDirectory = path.join(process.cwd(), 'content/blog')
  
  // Check if directory exists
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  const posts = fileNames
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => {
      const fullPath = path.join(postsDirectory, name)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      
      // Calculate reading time (rough estimate: 200 words per minute)
      const wordsPerMinute = 200
      const wordCount = content.split(/\s+/).length
      const readingTime = Math.ceil(wordCount / wordsPerMinute)

      return {
        slug: name.replace(/\.mdx$/, ''),
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        author: data.author || 'MailMop Team',
        tags: data.tags || [],
        featured: data.featured || false,
        image: data.image,
        imageAlt: data.imageAlt,
        content,
        readingTime,
      } as BlogPost
    })
    .sort((a, b) => {
      // Sort by date, newest first
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  return posts
})

// Get a single blog post by slug
export const getBlogPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const posts = await getBlogPosts()
  return posts.find((post) => post.slug === slug) || null
})

// Get featured blog posts
export const getFeaturedBlogPosts = cache(async (limit: number = 3): Promise<BlogPost[]> => {
  const posts = await getBlogPosts()
  return posts.filter((post) => post.featured).slice(0, limit)
})

// Get posts by tag
export const getBlogPostsByTag = cache(async (tag: string): Promise<BlogPost[]> => {
  const posts = await getBlogPosts()
  return posts.filter((post) => post.tags?.includes(tag))
})

// Get all unique tags
export const getAllTags = cache(async (): Promise<string[]> => {
  const posts = await getBlogPosts()
  const tags = new Set<string>()
  
  posts.forEach((post) => {
    post.tags?.forEach((tag) => tags.add(tag))
  })
  
  return Array.from(tags).sort()
})

// Generate static params for blog posts (for static generation)
export const generateBlogStaticParams = async () => {
  const posts = await getBlogPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
} 