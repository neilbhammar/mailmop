'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeftIcon, HomeIcon, MailIcon, SearchIcon } from 'lucide-react'
import { useMounted } from '@/hooks/useMounted'

export default function NotFound() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Track mouse position for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Define SVG patterns for light and dark themes (same as landing page)
  const lightSvgPattern = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%234299e1' fill-opacity='0.03' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`
  const darkSvgPattern = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2394a3b8' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`

  // Determine current SVG pattern safely
  const currentSvgPattern = mounted 
    ? (resolvedTheme === 'dark' ? darkSvgPattern : lightSvgPattern) 
    : undefined

  // Calculate parallax offset based on mouse position
  const parallaxX = mounted ? (mousePosition.x - window.innerWidth / 2) * 0.01 : 0
  const parallaxY = mounted ? (mousePosition.y - window.innerHeight / 2) * 0.01 : 0

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{
        backgroundImage: currentSvgPattern,
      }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large background circle */}
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl"
          style={{
            transform: `translate(${parallaxX * 20}px, ${parallaxY * 20}px)`,
          }}
        />
        
        {/* Secondary background circle */}
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"
          style={{
            transform: `translate(${parallaxX * -15}px, ${parallaxY * -15}px)`,
          }}
        />

        {/* Floating email icons */}
        <div
          className="absolute top-20 left-20 text-blue-500/20 dark:text-blue-400/20"
          style={{
            transform: `translate(${parallaxX * 5}px, ${parallaxY * 5}px)`,
          }}
        >
          <MailIcon size={32} />
        </div>
        
        <div
          className="absolute top-40 right-40 text-indigo-500/20 dark:text-indigo-400/20"
          style={{
            transform: `translate(${parallaxX * -3}px, ${parallaxY * -3}px)`,
          }}
        >
          <SearchIcon size={24} />
        </div>
        
        <div
          className="absolute bottom-40 left-40 text-purple-500/20 dark:text-purple-400/20"
          style={{
            transform: `translate(${parallaxX * 7}px, ${parallaxY * 7}px)`,
          }}
        >
          <MailIcon size={28} />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl">
          <CardContent className="p-12">
            {/* Large 404 number */}
            <div className="mb-8">
              <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 bg-clip-text leading-none">
                404
              </h1>
            </div>

            {/* Decorative line */}
            <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto mb-8" />

            {/* Error message */}
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Oops! Page Not Found
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Looks like this page got lost in the digital clutter! 
                <br className="hidden sm:block" />
                Don't worry - we'll help you find your way back to your clean inbox.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => router.back()}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto group border-border/50 hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                Go Back
              </Button>
              
              <Button 
                asChild
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Link href="/">
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>

            {/* Additional help text */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                Need help? Visit our{' '}
                <Link 
                  href="/dashboard" 
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  dashboard
                </Link>
                {' '}or{' '}
                <Link 
                  href="mailto:support@mailmop.com" 
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  contact support
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* MailMop branding */}
        <div className="mt-8">
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <MailIcon className="w-4 h-4 mr-2" />
            <span className="font-semibold">MailMop</span>
            <span className="ml-1">- Clean Your Gmail Inbox in Minutes</span>
          </Link>
        </div>
      </div>

      {/* Subtle animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
    </div>
  )
} 