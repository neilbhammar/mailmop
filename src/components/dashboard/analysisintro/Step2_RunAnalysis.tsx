'use client'

import { getStoredGmailStats, GmailStats, fetchGmailStats, GMAIL_STATS_UPDATED_EVENT } from '@/lib/gmail/fetchGmailStats'
import { getStoredToken } from '@/lib/gmail/tokenStorage'
import { useState, useEffect } from 'react'
import { 
  MailIcon, 
  ClockIcon, 
  ShieldIcon,
  AlertCircleIcon,
  LaptopIcon,
  SparklesIcon,
  CheckIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  TrashIcon,
  BanIcon,
  ZapIcon
} from 'lucide-react'
import { motion, AnimatePresence, Transition } from 'framer-motion'
import { cn } from '@/lib/utils'
import { clearSenderAnalysis } from '@/lib/storage/senderAnalysis'
import { useAnalysisOperations } from '@/hooks/useAnalysisOperation'
import { estimateRuntimeMs, formatDuration } from '@/lib/utils/estimateRuntime'
import { ReauthDialog } from '@/components/modals/ReauthDialog'

// BorderTrail component for the magical button effect
function BorderTrail({
  className,
  size = 60,
  transition,
  delay = 0,
  style,
}: {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const BASE_TRANSITION = {
    repeat: Infinity,
    duration: 3.5,
    ease: 'linear',
  };

  return (
    <div className='pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]'>
      <motion.div
        className={cn('absolute aspect-square', className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${16}px)`,
          ...style,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={{
          ...(transition ?? BASE_TRANSITION),
          delay: delay,
        }}
      />
    </div>
  );
}

interface Step2Props {
  onStart: (step: number) => Promise<void>;
}

export default function Step2_RunAnalysis({ onStart }: Step2Props) {
  const [stats, setStats] = useState<GmailStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unsubscribeOnly, setUnsubscribeOnly] = useState(false) // Default to full analysis
  const [buttonState, setButtonState] = useState<'idle' | 'preparing'>('idle')
  
  const { progress, startAnalysis, reauthModal, closeReauthModal } = useAnalysisOperations();
  
  // Update the function to use the proper setter
  const handleReauthModalChange = (isOpen: boolean) => {
    if (!isOpen) {
      closeReauthModal();
    }
  };
  
  // Get stored stats on component mount
  useEffect(() => {
    // Try to get stats from localStorage first
    const storedStats = getStoredGmailStats();
    
    if (storedStats) {
      setStats(storedStats);
      setIsLoading(false);
    } else {
      // If no stats in localStorage, fetch them using the token
      const token = getStoredToken();
      
      if (token?.accessToken) {
        setIsLoading(true);
        fetchGmailStats(token.accessToken)
          .then(freshStats => {
            setStats(freshStats);
          })
          .catch(error => {
            console.error('Failed to fetch Gmail stats:', error);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        // No token available - can't fetch stats
        setIsLoading(false);
      }
    }

    // Listen for Gmail stats updates
    const handleStatsUpdated = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.stats) {
        console.log('[Step2_RunAnalysis] Received stats update event');
        setStats(event.detail.stats);
      } else {
        // If the event doesn't contain stats data, fall back to localStorage
        const freshStoredStats = getStoredGmailStats();
        if (freshStoredStats) {
          console.log('[Step2_RunAnalysis] Using fresh stored stats from localStorage');
          setStats(freshStoredStats);
        }
      }
    };
    
    // Add event listener
    window.addEventListener(GMAIL_STATS_UPDATED_EVENT, handleStatsUpdated);
    
    // Cleanup
    return () => {
      window.removeEventListener(GMAIL_STATS_UPDATED_EVENT, handleStatsUpdated);
    };
  }, [])
  
  // Get time estimate using our utility
  const getTimeEstimate = () => {
    if (!stats?.totalEmails) return 'calculating...';
    
    const estimatedMs = estimateRuntimeMs({
      operationType: 'analysis',
      emailCount: stats.totalEmails,
      mode: unsubscribeOnly ? 'quick' : 'full'
    });
    
    return formatDuration(estimatedMs);
  };

  // Get rounded email count for display
  const getRoundedEmailCount = () => {
    if (!stats?.totalEmails) return 0;
    
    const estimatedMs = estimateRuntimeMs({
      operationType: 'analysis',
      emailCount: stats.totalEmails,
      mode: unsubscribeOnly ? 'quick' : 'full'
    });
    
    // Convert back to email count based on our rate
    return Math.floor(estimatedMs / (60 * 1000) * 750); // 750 is our emails/minute rate
  };

  // Sample senders for visualization
  const sampleSenders = [
    { name: "Pinterest", email: "tips@pinterest.com", count: 1450, lastEmail: "Apr 8" },
    { name: "Spotify", email: "hi@spotify.com", count: 780, lastEmail: "Mar 5" },
    { name: "LinkedIn", email: "news@linkedin.com", count: 420, lastEmail: "3 days ago" }
  ];

  // Add debug logging for reauth state
  useEffect(() => {
    console.log('ReauthModal state:', reauthModal);
  }, [reauthModal]);
  
  const handleStartAnalysis = async () => {
    try {
      // Set button to preparing state immediately for visual feedback
      setButtonState('preparing');
      
      // Reset any existing reanalysis state
      window.dispatchEvent(new Event('mailmop:reanalyze-cancelled'));
      
      // Clear existing data first
      await clearSenderAnalysis();
      
      // Start analysis and check the result
      const result = await startAnalysis({
        type: unsubscribeOnly ? 'quick' : 'full'
      });

      // Only proceed if analysis was successfully initialized
      if (result.success) {
        await onStart(2);
      } else {
        console.log('Analysis start was cancelled or needs reauth');
        // Reset button state if not successful
        setButtonState('idle');
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
      // Reset button state on error
      setButtonState('idle');
    }
  };

  return (
    <div className="relative h-full">
      {/* ReauthDialog component - Add proper connection to state */}
      <ReauthDialog
        open={reauthModal.isOpen}
        onOpenChange={handleReauthModalChange}
        type={reauthModal.type}
        eta={reauthModal.eta}
      />
      
      <div className="h-full w-full flex items-center">
        {/* Left side - Visualization */}
        <div className="hidden md:flex md:w-1/2 h-full bg-slate-50 items-center justify-center p-6">
          <div className="w-full max-w-lg flex flex-col">
            {/* Keep tab open notice - Made more prominent */}
            <motion.div 
              className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-center shadow-sm mb-6"
              initial={{ opacity: 0.9 }}
              animate={{ 
                opacity: [0.9, 1, 0.9]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <div className="flex-shrink-0 mr-4">
                <div className="bg-amber-100 p-2 rounded-full">
                  <AlertCircleIcon size={22} className="text-amber-600" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-amber-900 text-base">Keep this tab open during analysis</h3>
                <p className="text-sm text-amber-800 mt-0.5">
                  You can use other browser tabs while we work in the background
                </p>
              </div>
            </motion.div>
            
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6">
                {/* Static sample display instead of overly dynamic animation */}
                <div className="space-y-5">             
                  {/* Static loading indicator with simpler animation */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-700">Analyzing {!isLoading && stats?.totalEmails && (
                        <span>{getRoundedEmailCount().toLocaleString()}</span>
                      )} emails in real-time</span>
                      <span className="text-gray-500">Sample results</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-blue-500 rounded-full" />
                    </div>
                  </div>
                  
                  {/* Sample senders with frequency - Static sample */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Top Senders Identified</h4>
                      <div className="px-2 py-0.5 bg-green-100 rounded text-xs font-medium text-green-800 flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Sample
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Table header - Simplified with flex layout */}
                      <div className="flex items-center bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                        <div className="w-1/5">Name</div>
                        <div className="w-1/5">Email</div>
                        <div className="w-1/5 text-center">Count</div>
                        <div className="w-2/5 text-left">Actions</div>
                      </div>
                      
                      {/* Sample senders - Static content without distracting animations */}
                      {sampleSenders.map((sender, idx) => (
                        <div
                          key={`sender-${idx}`}
                          className="flex items-center px-3 py-3 border-t border-gray-100 hover:bg-gray-50"
                        >
                          <div className="w-1/5 text-gray-500 text-xs truncate">
                            {sender.name}
                          </div>
                          <div className="w-1/5 text-gray-500 text-xs truncate">
                            {sender.email}
                          </div>
                          <div className="w-1/5 text-gray-500 text-center text-xs truncate">
                            {sender.count}
                          </div>
                          <div className="w-2/5 flex items-left justify-start space-x-3">
                            <button className="text-blue-600 text-xs font-medium">
                              Unsubscribe
                            </button>
                            <div className="flex items-center space-x-2">
                              <button className="text-gray-400 hover:text-gray-500">
                                <ExternalLinkIcon size={15} />
                              </button>
                              <button className="text-gray-400 hover:text-gray-500">
                                <TrashIcon size={15} />
                              </button>
                              <button className="text-gray-400 hover:text-gray-500">
                                <MailIcon size={15} />
                              </button>
                              <button className="text-gray-400 hover:text-gray-500">
                                <MoreHorizontalIcon size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Message at the bottom - Simplified animation */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
                <SparklesIcon size={12} />
                <span>Analysis happens locally in your browser for privacy</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Content */}
        <div className="w-full md:w-1/2 px-6 py-6 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-md flex flex-col">
            {/* Header */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <SparklesIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            {/* Title and description */}
            <div className="text-center mb-3">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Ready to analyze your inbox</h1>
              <p className="text-gray-600">
                {!isLoading && stats?.emailAddress ? (
                  <>Analyzing {stats.emailAddress} with {stats.totalEmails?.toLocaleString()} emails</>
                ) : (
                  <>MailMop will analyze your emails to find cleanup opportunities</>
                )}
              </p>
            </div>
            
            {/* Analysis Options */}
            <div className="bg-white-50 rounded-xl mb-4">
              <div className="py-3 px-6 space-y-4">
                
                <div className="space-y-3">
                  <label className="flex items-center p-3 bg-white border border-gray-200 rounded-lg cursor-pointer transition-colors hover:border-blue-200 hover:bg-blue-50">
                    <input 
                      type="radio" 
                      name="analysis-type" 
                      className="w-4 h-4 text-blue-500 focus:ring-blue-400 border-gray-300" 
                      checked={!unsubscribeOnly}
                      onChange={() => setUnsubscribeOnly(false)}
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-700">Full Inbox Analysis</span>
                      <div className="inline-flex items-center ml-2">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Thorough</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Analyze all emails for maximum cleanup potential
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-3 bg-white border border-gray-200 rounded-lg cursor-pointer transition-colors hover:border-blue-200 hover:bg-blue-50">
                    <input 
                      type="radio" 
                      name="analysis-type" 
                      className="w-4 h-4 text-blue-500 focus:ring-blue-400 border-gray-300" 
                      checked={unsubscribeOnly}
                      onChange={() => setUnsubscribeOnly(true)}
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-700">Optimize for Speed</span>
                      <div className="inline-flex items-center ml-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Faster</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Focus on emails with the word "unsubscribe"
                      </p>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center pt-2">
                  <ClockIcon size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="ml-2 text-sm text-gray-500">
                    Estimated time: <span className="font-medium text-gray-700">{getTimeEstimate()}</span>
                  </span>
                </div>
              </div>
            </div>
            
            {/* Start Button - With focus-grabbing animation and design */}
            <motion.div
              className="relative"
              whileHover={{ scale: buttonState === 'idle' ? 1.02 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <button
                onClick={handleStartAnalysis}
                disabled={isLoading || buttonState === 'preparing'}
                className="relative w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 px-6 text-white font-medium shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                  </div>
                ) : buttonState === 'preparing' ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Preparing Analysis...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <SparklesIcon size={18} className="text-white mr-2" />
                    <span className="text-base">Start Analysis</span>
                  </div>
                )}
                
                {/* Border trail animation - only show in idle state */}
                {buttonState === 'idle' && (
                  <>
                    <BorderTrail 
                      className="bg-white bg-opacity-30" 
                      size={10}
                    />
                    <BorderTrail 
                      className="bg-white bg-opacity-60" 
                      size={10}
                      delay={1.75}
                    />
                  </>
                )}
              </button>
            </motion.div>
            
            {/* Security indicators */}
            <div className="mt-6 text-center space-y-3">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldIcon size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500">
                      100% Private
                    </p>
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <LaptopIcon size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500">
                      Browser-Only
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Your analysis will be ready in {getTimeEstimate()}. Do not close this tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 