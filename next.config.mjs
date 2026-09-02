import createMDX from '@next/mdx'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure pageExtensions to include MDX files
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/a/**',
      },
    ],
  },
  

  // Consolidate near-duplicate posts so link equity and crawl budget go to one URL
  // per topic. The old slugs 301 to the surviving guide.
  async redirects() {
    const merged = {
      '/blog/privacy-focused-gmail-cleanup-tools-2025': '/blog/privacy-focused-gmail-cleanup-tools-2026',
      '/blog/how-to-unsubscribe-gmail-2025': '/blog/how-to-unsubscribe-gmail-2026',
      '/blog/how-to-unsubscribe-from-gmail': '/blog/how-to-unsubscribe-gmail-2026',
      '/blog/best-gmail-cleaning-tools-2025': '/blog/best-gmail-cleaning-tools-2026',
      '/blog/free-up-gmail-storage-2025': '/blog/gmail-storage-full',
      '/blog/how-to-delete-all-emails-gmail-2025': '/blog/how-to-mass-delete-emails-gmail-2026',
      '/blog/unroll-me-vs-mailmop-2025': '/blog/unroll-me-alternative',
    }
    return Object.entries(merged).map(([source, destination]) => ({ source, destination, permanent: true }))
  },

  async headers() {
    // Determine allowed origins based on environment
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? ['https://mailmop.com', 'https://www.mailmop.com']
      : ['http://localhost:3000', 'https://localhost:3000'];
    
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Powered-By',
            value: '' // Hide X-Powered-By header
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: allowedOrigins.join(', ')
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ],
      },
    ]
  },
};

const withMDX = createMDX({
  // Add markdown plugins here, as needed
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeHighlight,
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
    ],
  },
})

// Merge MDX config with Next.js config
export default withMDX(nextConfig);