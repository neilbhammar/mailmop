// src/app/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowRightIcon, CheckIcon, LockClosedIcon } from '@radix-ui/react-icons'
import { MailOpen, BellOff, Search, Lock, Trash2, Ban, Tag, FilterIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Lenis from '@studio-freight/lenis'
import LandingNavbar from '@/components/landing/LandingNavbar'
import LandingFooter from '@/components/landing/LandingFooter'
import LandingCta from '@/components/landing/LandingCta'
import LandingFaq from '@/components/landing/LandingFaq'
import LandingPricing from '@/components/landing/LandingPricing'
import LandingPrivacy from '@/components/landing/LandingPrivacy'
import { useTheme } from 'next-themes'
import { useMounted } from '@/hooks/useMounted'

export default function Home() {
  const router = useRouter()
  const bubblesContainerRef = useRef<HTMLDivElement>(null)
  const heroBgCircle1Ref = useRef<HTMLDivElement>(null)
  const lenisInstanceRef = useRef<Lenis | null>(null)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const popSoundRef = useRef<HTMLAudioElement | null>(null);
  const { resolvedTheme, theme } = useTheme()
  const mounted = useMounted()
  
  // Stats state
  const [stats, setStats] = useState({
    analyzedEmails: 0,
    cleanedEmails: 0,
    hoursSaved: 0,
    isLoading: true
  })

  // Define SVG strings for light and dark themes
  const lightSvgPattern = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%234299e1' fill-opacity='0.03' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`
  const darkSvgPattern = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2394a3b8' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`

  // Determine current SVG pattern safely
  const currentSvgPattern = mounted ? (resolvedTheme === 'dark' ? darkSvgPattern : lightSvgPattern) : undefined;

  // Lenis smooth scroll and parallax effect
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 0.8,
    });
    lenisInstanceRef.current = lenis;

    lenis.on('scroll', (e: { scroll: number }) => {
      if (bubblesContainerRef.current) {
        bubblesContainerRef.current.style.transform = `translateY(${e.scroll * 0.2}px)`;
      }
      if (heroBgCircle1Ref.current) {
        heroBgCircle1Ref.current.style.transform = `translateY(${e.scroll * 0.1}px)`;
      }
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisInstanceRef.current = null;
    };
  }, []);

  // Fetch stats from Supabase on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        // Get the latest stats from daily_stats table (explicitly fetch the most recent by datetime)
        const { data, error } = await supabase
          .from('daily_stats')
          .select('analysis_count, modified_count')
          .order('datetime', { ascending: false })
          .limit(1)
          .single()

        if (error) {
          console.error('Error fetching stats:', error)
          setStats({
            analyzedEmails: 500000,
            cleanedEmails: 300000,
            hoursSaved: 3000,
            isLoading: false
          })
          return
        }

        if (data) {
          // Round analysis_count to nearest 10,000
          const analyzedEmails = Math.ceil(data.analysis_count / 10000) * 10000
          
          // Round modified_count to nearest 1,000
          const cleanedEmails = Math.ceil(data.modified_count / 1000) * 1000
          
          // Calculate hours saved (modified_count / 10 / 60) with minimum of 20
          const hoursSaved = Math.max(20, Math.ceil(data.modified_count / 500 + data.analysis_count / 10000))
          
          setStats({
            analyzedEmails,
            cleanedEmails,
            hoursSaved,
            isLoading: false
          })
        }
      } catch (error) {
        console.error('Error processing stats:', error)
        // Fallback to default values if there's an error
        setStats({
          analyzedEmails: 500000,
          cleanedEmails: 300000,
          hoursSaved: 3000,
          isLoading: false
        })
      }
    }

    fetchStats()
  }, [])

  const signIn = async () => {
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${redirectUrl}/dashboard` }
    })
    if (error) console.error(error)
  }
  
  // Format numbers with K, M suffix
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K'
    }
    return num.toString()
  }

  // Open video modal function
  const openVideoModal = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setVideoModalOpen(true)
    document.body.style.overflow = 'hidden' // Prevent scrolling when modal is open
  }

  // Close video modal function
  const closeVideoModal = () => {
    setVideoModalOpen(false)
    document.body.style.overflow = '' // Re-enable scrolling
  }

  // Add keydown listener for Escape key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && videoModalOpen) {
        closeVideoModal()
      }
    }

    window.addEventListener('keydown', handleEscKey)
    return () => window.removeEventListener('keydown', handleEscKey)
  }, [videoModalOpen])

  // Create random bubbles
  useEffect(() => {
    if (!mounted || !bubblesContainerRef.current || !resolvedTheme) {
      if (bubblesContainerRef.current) {
        while (bubblesContainerRef.current.firstChild) {
          bubblesContainerRef.current.removeChild(bubblesContainerRef.current.firstChild);
        }
      }
      return;
    }
    
    const container = bubblesContainerRef.current as HTMLDivElement;
    const isDarkMode = resolvedTheme === 'dark';

    // Function to create a single bubble
    function createBubble(containerElement: HTMLDivElement, index: number, currentIsDarkMode: boolean) {
      const size = 20 + Math.floor(Math.random() * 20);
      let left;
      if (Math.random() > 0.5) {
        left = Math.random() * 30;
      } else {
        left = 70 + Math.random() * 30;
      }
      const bottom = -30 - Math.random() * 80;
      const duration = 12 + Math.random() * 8;
      const delay = Math.random() * 0.01;
      const xOffset = -25 + Math.random() * 50;
      const rotate1 = -8 + Math.random() * 16;
      const rotate2 = -8 + Math.random() * 16;
      
      const bubble = document.createElement('div') as HTMLDivElement & { isPopping?: boolean };
      bubble.className = 'mail-bubble bubble-shine';
      // Use a more unique ID generation if bubbles are rapidly created/destroyed, 
      // but for now, index might be reused if not careful with direct recreation.
      // Consider using a counter or a random ID if issues arise.
      bubble.id = `bubble-${Date.now()}-${Math.random()}`;
      bubble.isPopping = false;
      
      bubble.style.setProperty('--xOffset', xOffset.toString());
      bubble.style.setProperty('--rotate1', rotate1.toString());
      bubble.style.setProperty('--rotate2', rotate2.toString());
      
      const lightModeBackground = 'linear-gradient(to bottom right, rgba(255,255,255,0.95), rgba(220,230,255,0.9))';
      const darkModeBackground = 'linear-gradient(to bottom right, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.7))';
      const lightModeBoxShadow = '0 1px 4px rgba(0,0,0,0.08)';
      const darkModeBoxShadow = '0 1px 4px rgba(0,0,0,0.3)';
      
      bubble.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        bottom: ${bottom}px;
        border-radius: 50%;
        background: ${currentIsDarkMode ? darkModeBackground : lightModeBackground};
        box-shadow: ${currentIsDarkMode ? darkModeBoxShadow : lightModeBoxShadow};
        animation: floatBubble ${duration}s ease-in-out ${delay}s infinite;
        pointer-events: auto;
        cursor: pointer;
        --xOffset: ${xOffset};
        --rotate1: ${rotate1};
        --rotate2: ${rotate2};
        will-change: transform, opacity;
        z-index: 10; /* z-index for bubbles themselves */
        transition: transform 0.05s ease-out, opacity 0.05s ease-out, border-radius 0.05s ease-out, filter 0.05s ease-out;
      `;
      
      const iconSize = Math.max(Math.floor(size/2.3), 5);
      const lightModeIconColor = 'rgba(90, 140, 250, 0.7)';
      const darkModeIconColor = 'rgba(129, 140, 248, 0.7)';

      const lightModePingBorder = '1px solid rgba(255,255,255,0.5)';
      const darkModePingBorder = '1px solid rgba(203, 213, 225, 0.3)';
      
      bubble.innerHTML = `
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: ${currentIsDarkMode ? darkModeIconColor : lightModeIconColor};">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: ${iconSize}px; height: ${iconSize}px; display: block;">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>
        <div style="position: absolute; inset: 0; border-radius: 9999px; border: ${currentIsDarkMode ? darkModePingBorder : lightModePingBorder}; animation: ping 3.5s ease-in-out infinite 0.5s;"></div>
      `;
      
      bubble.addEventListener('mouseenter', () => {
        if (bubble.isPopping) return;
        bubble.isPopping = true;

        if (popSoundRef.current) {
          popSoundRef.current.currentTime = 0;
          popSoundRef.current.play().catch(error => console.warn("Audio play failed:", error));
        }

        bubble.classList.add('popping');

        setTimeout(() => {
          if (containerElement.contains(bubble)) {
            containerElement.removeChild(bubble);
            // Check if the container still exists and is part of the document before creating a new bubble
            if (document.body.contains(containerElement)) {
                createBubble(containerElement, 0, resolvedTheme === 'dark'); // Regenerate a bubble
            }
          }
        }, 800); 
      });
      containerElement.appendChild(bubble);
    }

    // Clear existing bubbles first when theme changes or on initial mount
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const bubbleCount = 12;
    for (let i = 0; i < bubbleCount; i++) {
      createBubble(container, i, isDarkMode);
    }

    if (!popSoundRef.current) {
      const audio = new Audio('/bubble.mp3');
      audio.volume = 0.2;
      audio.preload = 'auto';
      audio.load();
      popSoundRef.current = audio;
    }

    return () => {
      const existingBubbles = container.querySelectorAll('.mail-bubble');
      existingBubbles.forEach(b => b.remove());
    };
  }, [mounted, resolvedTheme, bubblesContainerRef]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900 selection:bg-blue-500 selection:text-white">
      <LandingNavbar signIn={signIn} lenis={lenisInstanceRef.current} />

      {/* Bubble container - ensure it's styled to be fixed and cover the screen with a high z-index */}
      <div ref={bubblesContainerRef} className="fixed inset-0 pointer-events-none z-50 overflow-hidden" />

      <main>
        {/* Hero Section with improved floating cards */}
        <section className="py-8 md:py-16 overflow-hidden">
          <div className="container mx-auto px-4 relative">
            {/* Mail-themed decorative elements */}
            <div ref={heroBgCircle1Ref} className="absolute -z-10 -left-20 top-1/4 w-64 h-64 bg-blue-100 rounded-full filter blur-3xl opacity-30 animate-pulse dark:bg-blue-900/30"></div>
            <div className="absolute -z-10 -right-20 top-3/4 w-72 h-72 bg-indigo-100 rounded-full filter blur-3xl opacity-30 animate-pulse delay-1000 dark:bg-indigo-900/30"></div>
            
            {/* Cleaning-themed decorative elements */}
            <div className="absolute -z-10 right-1/4 top-10 w-20 h-20 rounded-full border-4 border-dashed border-blue-200 opacity-40 animate-spin-slow dark:border-blue-700/50"></div>
            <div className="absolute -z-10 left-1/3 bottom-0 w-16 h-16 rounded-full border-4 border-dashed border-indigo-200 opacity-40 animate-spin-slow-reverse dark:border-indigo-700/50"></div>
            
            {/* Mail Bubble Animation Container - Increased z-index */}
            <div ref={bubblesContainerRef} className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-30">
              {/* Bubbles will be created dynamically via JavaScript */}
            </div>

            {/* Mail icons scattered in background */}
            <div className="absolute -z-10 left-1/4 top-20 text-blue-100 opacity-20 dark:text-blue-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            {/* Mop icon */}
            <div className="absolute -z-10 right-1/5 top-1/3 text-indigo-100 opacity-20 rotate-12 dark:text-indigo-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            
            <div className="max-w-3xl mx-auto text-center mb-8 relative z-10">
              <div className="inline-flex items-center px-2 sm:px-3 py-1 mb-4 text-xs sm:text-sm font-medium rounded-full bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200 flex-wrap justify-center dark:from-slate-700 dark:to-slate-800 dark:text-blue-300 dark:border-slate-600">
                <LockClosedIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="mr-2">Secure</span><span className="opacity-70 dark:opacity-50">•</span><span className="ml-2 mr-2">Privacy-First</span><span className="opacity-70 dark:opacity-50">•</span>
                <a href="https://github.com/neilbhammar/mailmop" target="_blank" rel="noopener noreferrer" className="ml-2 hover:text-blue-600 transition-colors dark:hover:text-blue-400">Source Available</a>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-4 dark:text-slate-100">
                Clean up your <span className="relative inline-block">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">email chaos</span>
                  <svg className="absolute -bottom-1 left-0 w-full h-2 text-blue-200 opacity-70 dark:text-blue-700/60" viewBox="0 0 100 12" preserveAspectRatio="none">
                    <path d="M0,4 Q25,12 50,4 T100,4" fill="none" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 px-4 sm:px-0 dark:text-slate-300">
                Mailmop helps you identify and clean up inbox clutter. All in your browser, <strong>for free</strong>. Mailmop never sees or stores your emails.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mb-6">
                <button onClick={signIn} className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-md hover:shadow-lg transition-all duration-300 flex items-center justify-center group relative overflow-hidden dark:from-blue-500 dark:to-blue-600">
                  <span className="relative z-10">Clean my inbox</span>
                  <ArrowRightIcon className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform relative z-10" />
                  <div className="absolute -right-12 -top-4 w-20 h-20 rounded-full bg-blue-500 opacity-20 group-hover:scale-150 transition-transform duration-500 dark:bg-blue-400"></div>
                  <div className="absolute inset-0 w-full scale-x-0 h-1 bg-gradient-to-r from-transparent via-blue-300 to-transparent bottom-0 group-hover:scale-x-100 transition-transform duration-700 origin-left z-0 opacity-80 dark:via-blue-400"></div>
                  <div className="absolute inset-0 w-full scale-x-0 h-1 bg-gradient-to-r from-transparent via-blue-200 to-transparent bottom-2 group-hover:scale-x-100 transition-transform duration-1000 origin-right z-0 opacity-60 delay-100 dark:via-blue-300"></div>
                </button>
                <a href="#how-it-works" onClick={openVideoModal} className="text-gray-600 font-medium flex items-center hover:text-gray-800 transition-all group mt-2 sm:mt-0 sm:ml-4 py-2 dark:text-slate-400 dark:hover:text-slate-200">
                  <span>See how it works</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          {/* Hero Interface with more interesting, visually appealing cards */}
          <div className="relative max-w-6xl mx-auto mt-16 mb-2">
            {/* Hero App Interface */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl mx-auto max-w-5xl bg-white border border-gray-100 z-10 dark:bg-slate-800 dark:border-slate-700">
              {/* Cleaning theme overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-transparent pointer-events-none dark:from-blue-900/30"></div>
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] pointer-events-none dark:bg-slate-900/10">
                <div className="absolute inset-0" style={{ 
                  backgroundImage: currentSvgPattern,
                  backgroundSize: '20px 20px'
                }}></div>
              </div>
              {mounted && (
              <Image 
                  src={resolvedTheme === 'dark' ? '/darkpreview.png' : '/app-preview.png'}
                alt="MailMop App Interface" 
                width={1200} 
                height={675} 
                className="w-full h-auto relative z-10"
                priority
              />
              )}
              {!mounted && (
                <Image 
                  src={'/app-preview.png'}
                  alt="MailMop App Interface" 
                  width={1200} 
                  height={675} 
                  className="w-full h-auto relative z-10"
                  priority
                />
              )}
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/5 via-transparent to-blue-400/5 pointer-events-none animate-shine-slow dark:from-blue-600/10 dark:to-blue-600/10"></div>
            </div>
            
            {/* Feature callouts - refined, balanced approach */}
            <div className="absolute hidden sm:block -left-3 top-1/4 z-20">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 max-w-[180px] border border-red-100 transform hover:-translate-y-1 transition-transform duration-300 dark:bg-slate-700/80 dark:border-red-500/30 dark:shadow-slate-900/50">
                <div className="flex items-center">
                  <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center mr-2 flex-shrink-0 dark:bg-red-500/20">
                    <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-200">Bulk Delete</span>
                </div>
              </div>
            </div>
            
            <div className="absolute hidden sm:block bottom-10 right-6 z-20">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 max-w-[180px] border border-purple-100 transform hover:-translate-y-1 transition-transform duration-300 dark:bg-slate-700/80 dark:border-purple-500/30 dark:shadow-slate-900/50">
                <div className="flex items-center">
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0 dark:bg-purple-500/20">
                    <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-200">Block Sender</span>
                </div>
              </div>
            </div>
            
            <div className="absolute top-40 right-6 z-20">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 max-w-[180px] border border-indigo-100 transform hover:-translate-y-1 transition-transform duration-300 dark:bg-slate-700/80 dark:border-indigo-500/30 dark:shadow-slate-900/50">
                <div className="flex items-center">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mr-2 flex-shrink-0 dark:bg-indigo-500/20">
                    <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-200">Apply Labels</span>
                </div>
              </div>
            </div>
            
            <div className="absolute left-3 top-[45%] z-20">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 max-w-[180px] border border-green-100 transform hover:-translate-y-1 transition-transform duration-300 dark:bg-slate-700/80 dark:border-green-500/30 dark:shadow-slate-900/50">
                <div className="flex items-center">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center mr-2 flex-shrink-0 dark:bg-green-500/20">
                    <MailOpen className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-200">Mark as Read</span>
                </div>
              </div>
            </div>
            
            <div className="absolute right-6 top-2 z-20">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 border border-blue-100 transform hover:-translate-y-1 transition-transform duration-300 dark:bg-slate-700/80 dark:border-blue-500/30 dark:shadow-slate-900/50">
                <div className="flex items-center">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 dark:bg-blue-500/20">
                    <BellOff className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-800 whitespace-nowrap dark:text-slate-200">One-click Unsubscribe</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Redesigned Stats Section - More subtle and better integrated */}
        <section className="py-2 relative overflow-hidden mt-0 mb-8">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:divide-x divide-gray-200 dark:divide-slate-700">
                <div className="flex flex-col items-center text-center px-4 border-b sm:border-b-0 pb-6 sm:pb-0 last:border-b-0 dark:border-slate-700">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 flex items-center dark:text-slate-100">
                      <span>{stats.isLoading ? '...' : formatNumber(stats.analyzedEmails)}</span>
                      <span className="text-lg sm:text-xl text-blue-600 ml-1 dark:text-blue-400">+</span>
                    </div>
                    <div className="text-sm text-gray-500 font-medium flex items-center dark:text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1 flex-shrink-0 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Emails analyzed</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center text-center px-4 border-b sm:border-b-0 pb-6 sm:pb-0 last:border-b-0 dark:border-slate-700">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 flex items-center dark:text-slate-100">
                      <span>{stats.isLoading ? '...' : formatNumber(stats.cleanedEmails)}</span>
                      <span className="text-lg sm:text-xl text-purple-600 ml-1 dark:text-purple-400">+</span>
                    </div>
                    <div className="text-sm text-gray-500 font-medium flex items-center dark:text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500 mr-1 flex-shrink-0 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Emails cleaned</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center text-center px-4 border-b sm:border-b-0 pb-6 sm:pb-0 last:border-b-0 dark:border-slate-700">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 flex items-center dark:text-slate-100">
                      <span>{stats.isLoading ? '...' : formatNumber(stats.hoursSaved)}</span>
                      <span className="text-lg sm:text-xl text-green-600 ml-1 dark:text-green-400">+</span>
                    </div>
                    <div className="text-sm text-gray-500 font-medium flex items-center dark:text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1 flex-shrink-0 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Hours saved</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works - Bento Grid */}
        <section id="how-it-works" className="py-8 sm:py-12 md:py-16 bg-white dark:bg-slate-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 dark:text-slate-100">How MailMop Works</h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4 sm:px-0 dark:text-slate-300">
                Clean your inbox in three simple steps
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {/* Local Analysis - Largest Box */}
              <div className="md:col-span-12 bg-white rounded-2xl p-6 sm:p-8 relative overflow-hidden group border border-gray-100 shadow-sm hover:shadow-md transition-all dark:bg-slate-800 dark:border-slate-700 dark:shadow-slate-900/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full opacity-20 transform translate-x-1/3 -translate-y-1/3 group-hover:bg-blue-200 transition-colors dark:bg-blue-900/20 dark:group-hover:bg-blue-800/30"></div>
                <div className="flex flex-col md:flex-row items-start gap-6 sm:gap-8 relative z-10">
                  <div className="w-full md:w-1/2">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold">1</div>
                      <h3 className="text-xl sm:text-2xl font-semibold dark:text-slate-100">Local-First Analysis</h3>
                    </div>
                    <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base dark:text-slate-300">
                      MailMop runs entirely in your browser, analyzing your Gmail inbox without your data ever leaving your device. 
                      We use restricted Gmail scope's and are undergoing Google's CASA 2 Security Audit for complete privacy and security.
                    </p>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start">
                        <CheckIcon className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0 dark:text-blue-400" />
                        <span className="ml-3 text-gray-700 dark:text-slate-300">Privacy-focused with client-side processing</span>
                      </div>
                      <div className="flex items-start">
                        <CheckIcon className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0 dark:text-blue-400" />
                        <span className="ml-3 text-gray-700 dark:text-slate-300">No email content ever stored on Mailmop servers</span>
                      </div>
                      <div className="flex items-start">
                        <CheckIcon className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0 dark:text-blue-400" />
                        <span className="ml-3 text-gray-700 dark:text-slate-300">Handles inboxes small and large, up to 500k emails</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 h-full flex items-center justify-center">
                    {/* Updated Local Analysis Visual */}
                    <div className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden p-1 transform transition-transform group-hover:scale-105 border border-gray-200 shadow-inner dark:bg-slate-700 dark:border-slate-600">
                      {/* Browser Top Bar */}
                      <div className="absolute top-0 left-0 right-0 h-7 bg-gray-200 flex items-center px-2 border-b border-gray-300 dark:bg-slate-600 dark:border-slate-500">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400 group-hover:bg-red-500 transition-colors dark:bg-red-500/70 dark:group-hover:bg-red-400/70"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 group-hover:bg-yellow-500 transition-colors dark:bg-yellow-500/70 dark:group-hover:bg-yellow-400/70"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400 group-hover:bg-green-500 transition-colors dark:bg-green-500/70 dark:group-hover:bg-green-400/70"></div>
                        </div>
                      </div>
                      
                      {/* Browser Content Area */}
                      <div className="mt-7 h-[calc(100%-1.75rem)] bg-white p-4 flex items-center justify-center relative dark:bg-slate-700/50">
                        <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                          {/* Stylized email list - made wider */}
                          <div className="w-full p-3 bg-blue-50 rounded-md space-y-2 shadow-sm dark:bg-blue-900/20">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className={`h-3 rounded-sm ${i === 2 ? 'bg-blue-400 dark:bg-blue-600/50 w-full' : 'bg-blue-200 dark:bg-blue-700/30 w-11/12'}`}></div>
                            ))}
                          </div>
                          
                          {/* Analysis Icon */}
                          <div className="p-3 bg-blue-100 rounded-full shadow-md dark:bg-blue-900/40">
                            <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>

                          <p className="text-xs text-blue-500 font-medium dark:text-blue-400">Analyzing locally...</p>
                        </div>
                        
                        {/* Privacy Lock Icon */}
                        <div className="absolute bottom-3 right-3 p-1.5 bg-green-100 rounded-full opacity-80 group-hover:opacity-100 transition-opacity dark:bg-green-900/30">
                          <Lock className="w-3 h-3 text-green-700 dark:text-green-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Find Clutter */}
              <div className="md:col-span-6 bg-white rounded-2xl p-8 relative overflow-hidden group border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all dark:bg-slate-800 dark:border-slate-700 dark:shadow-slate-900/50">
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-50 rounded-full opacity-50 group-hover:bg-purple-100 transition-colors dark:bg-purple-900/20 dark:group-hover:bg-purple-800/30"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center text-xl font-bold">2</div>
                    <h3 className="text-2xl font-semibold dark:text-slate-100">Find Clutter Instantly</h3>
                  </div>
                  <p className="text-gray-700 mb-6 dark:text-slate-300">
                    MailMop analyzes your inbox and shows you exactly which senders are taking up space, how many emails you have from them, and more.
                  </p>
                  {/* Updated Visual for Find Clutter Instantly */}
                  <div className="space-y-3 rounded-lg bg-gray-50 p-4 border border-gray-200 group-hover:border-purple-100 transition-colors dark:bg-slate-700/50 dark:border-slate-600 dark:group-hover:border-purple-700/50">
                    {[
                      { name: 'Promotional Weekly', count: 182, volume: 'w-4/5' },
                      { name: 'Platform Notifications', count: 97, volume: 'w-2/5' },
                      { name: 'Social Updates', count: 143, volume: 'w-3/5' },
                    ].map((sender) => (
                      <div key={sender.name} className="grid grid-cols-2 items-center gap-2 p-2.5 bg-white rounded-md shadow-xs border border-gray-100 group-hover:border-transparent transition-colors dark:bg-slate-700 dark:border-slate-600 dark:group-hover:border-slate-500">
                        {/* Sender Name */}
                        <div className="col-span-1 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-purple-300 mr-2 flex-shrink-0 dark:bg-purple-600/70"></div>
                          <span className="text-xs sm:text-sm font-medium text-gray-700 truncate dark:text-slate-300">{sender.name}</span>
                        </div>
                        {/* Email Count & Volume Bar */}
                        <div className="col-span-1 flex items-center justify-end">
                          <span className="text-xxs sm:text-xs text-gray-500 mr-2 whitespace-nowrap dark:text-slate-400">{sender.count} emails</span>
                          <div className="w-16 h-1.5 bg-purple-100 rounded-full overflow-hidden dark:bg-purple-800/50">
                            <div className={`h-full bg-purple-400 dark:bg-purple-500 ${sender.volume}`}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* One-Click Actions */}
              <div className="md:col-span-6 bg-white rounded-2xl p-8 relative overflow-hidden group border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all dark:bg-slate-800 dark:border-slate-700 dark:shadow-slate-900/50">
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-green-50 rounded-full opacity-50 group-hover:bg-green-100 transition-colors dark:bg-green-900/20 dark:group-hover:bg-green-800/30"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center text-xl font-bold">3</div>
                    <h3 className="text-2xl font-semibold dark:text-slate-100">One-Click Actions</h3>
                  </div>
                  <p className="text-gray-700 mb-6 dark:text-slate-300">
                    Clean up thousands of emails in seconds with powerful batch actions. Delete, block, unsubscribe, and more, directly within MailMop.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[ 
                      { name: 'Delete', icon: Trash2, color: 'text-red-600', darkColor: 'dark:text-red-400' },
                      { name: 'Block Sender', icon: Ban, color: 'text-orange-600', darkColor: 'dark:text-orange-400' },
                      { name: 'Unsubscribe', icon: BellOff, color: 'text-purple-600', darkColor: 'dark:text-purple-400' },
                      { name: 'Mark as Read', icon: MailOpen, color: 'text-sky-600', darkColor: 'dark:text-sky-400' },
                      { name: 'Apply Label', icon: Tag, color: 'text-teal-600', darkColor: 'dark:text-teal-400' },
                      { name: 'Create Filter', icon: FilterIcon, color: 'text-indigo-600', darkColor: 'dark:text-indigo-400' },
                    ].map((action, index) => (
                      <div key={action.name} className="flex items-center gap-2 p-3.5 bg-gray-50 rounded-lg border border-gray-200 group-hover:border-green-100 transition-colors dark:bg-slate-700/50 dark:border-slate-600 dark:group-hover:border-green-700/50">
                        <action.icon className={`h-4 w-4 ${action.color} ${action.darkColor} flex-shrink-0`} />
                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">{action.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <LandingPrivacy />
        
        <LandingPricing signIn={signIn} />
        
        <LandingFaq />
        
        <LandingCta signIn={signIn} />
      </main>

      <LandingFooter />

      {/* Add animation styles */}
      <style jsx global>{`
        /* Existing animations - no changes */
        @keyframes float {
          0% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-10px) rotate(-2deg); }
          100% { transform: translateY(0) rotate(-2deg); }
        }
        /* ... other existing animations ... */
        
        /* New bubble animations */
        @keyframes floatBubble {
          0% { 
            transform: translate(0, 0) scale(0.8);
            opacity: 0;
          }
          5% {
            transform: translate(calc(var(--xOffset, 10) * 1px), calc(-30px)) rotate(0deg);
            opacity: 0.95;
            scale: 1;
          }
          20% {
            transform: translate(calc(var(--xOffset, 10) * 2px), calc(-120px)) rotate(calc(var(--rotate1, 5) * 1deg));
          }
          40% {
            transform: translate(calc(var(--xOffset, -10) * -2px), calc(-240px)) rotate(calc(var(--rotate2, -8) * 1deg));
          }
          60% {
            transform: translate(calc(var(--xOffset, 15) * 1.5px), calc(-360px)) rotate(calc(var(--rotate1, 5) * 0.7deg));
          }
          80% {
            transform: translate(calc(var(--xOffset, -5) * -1px), calc(-480px)) rotate(calc(var(--rotate2, -3) * 0.5deg));
            opacity: 0.7;
          }
          95% {
            transform: translate(calc(var(--xOffset, 8) * 0.5px), calc(-550px)) rotate(0deg);
            opacity: 0.4;
            scale: 0.9;
          }
          100% {
            transform: translate(0, calc(-600px)) scale(0);
            opacity: 0;
          }
        }
        
        @keyframes popBubble {
          0% { 
            transform: scale(1);
            opacity: 1;
            filter: blur(0);
          }
          10% {
            transform: scale(1.3);
            opacity: 0.95;
            filter: blur(0);
            border-radius: 50%;
          }
          25% {
            transform: scale(1.5) rotate(5deg);
            opacity: 0.8;
            filter: blur(0.5px);
            border-radius: 45%;
          }
          40% {
            transform: scale(1.7) rotate(-3deg);
            opacity: 0.6;
            filter: blur(1px);
            border-radius: 40%;
          }
          60% {
            transform: scale(1.4) rotate(2deg);
            opacity: 0.4;
            filter: blur(2px);
            border-radius: 35%;
          }
          80% {
            transform: scale(1.1) rotate(-1deg);
            opacity: 0.2;
            filter: blur(3px);
            border-radius: 30%;
          }
          100% {
            transform: scale(0.5);
            opacity: 0;
            filter: blur(4px);
            border-radius: 20%;
          }
        }
        
        @keyframes ping {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.4;
          }
        }
        
        .bubble-shine {
          position: relative;
          overflow: hidden;
        }
        
        .bubble-shine::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to bottom right,
            rgba(255, 255, 255, 0),
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(30deg);
        }
        
        .mail-bubble {
          cursor: pointer;
        }
        
        .popping {
          animation: popBubble 0.8s ease-out forwards !important;
        }
        
        /* ... rest of existing styles ... */
      `}</style>

      {/* Video Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-20 bg-gray-900/80 backdrop-blur-sm transition-all" onClick={closeVideoModal}>
          <div 
            className="w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl transform transition-all dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {/* Modal header with close button */}
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={closeVideoModal}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800/80 text-white backdrop-blur-sm hover:bg-gray-700 transition-colors dark:bg-slate-700/80 dark:hover:bg-slate-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* Video player - using a placeholder for now */}
              <div className="relative pt-[56.25%]">
                <iframe 
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0&showinfo=0&modestbranding=1"
                  title="MailMop Demo Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              
              {/* Optional video caption or description */}
              <div className="p-4 bg-gray-900 text-gray-200 dark:bg-slate-800 dark:text-slate-200">
                <h3 className="text-lg font-semibold mb-1 dark:text-slate-100">How MailMop Works</h3>
                <p className="text-sm text-gray-400 dark:text-slate-400">See how MailMop helps you clean up your inbox in minutes, not hours.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
