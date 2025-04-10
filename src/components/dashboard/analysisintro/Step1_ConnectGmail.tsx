'use client'

import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { motion } from 'framer-motion'
import { LockIcon, CheckCircle, AlertCircle, Check } from 'lucide-react'

interface Step1Props {
  onNext: () => void;
}

export default function Step1_ConnectGmail({ onNext }: Step1Props) {
  // We'll use this hook to handle Gmail connection
  const { requestPermissions, isLoading } = useGmailPermissions()

  const handleConnect = async () => {
    try {
      const success = await requestPermissions()
      if (success) {
        onNext()
      }
    } catch (error) {
      console.error('Failed to connect to Gmail:', error)
      // TODO: Add error handling UI
    }
  }

  const features = [
    {
      icon: <CheckCircle className="text-emerald-500" size={20} />,
      title: "Inbox Analysis",
      description: "See which senders clutter your inbox and take action",
    },
    {
      icon: <CheckCircle className="text-emerald-500" size={20} />,
      title: "Smart Cleanup",
      description: "Delete thousands of emails in seconds with just a few clicks",
    },
    {
      icon: <CheckCircle className="text-emerald-500" size={20} />,
      title: "One-Click Unsubscribe",
      description: "Unsubscribe from newsletters without leaving MailMop",
    },
    {
      icon: <CheckCircle className="text-emerald-500" size={20} />,
      title: "Future-Proof Protection",
      description: "Auto-label, filter, or block senders going forward",
    }
  ]

  // Animation variants for staggered entrance
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <div className="flex flex-col w-full">
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
          Declutter Your Gmail
        </h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Connect your Gmail to identify senders taking up the most space and clean up your inbox in minutes.
        </p>
      </motion.div>

      {/* Feature grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            variants={item}
            className="flex items-start gap-3 p-4 rounded-xl bg-white hover:shadow-md hover:bg-blue-50/30 transition-all duration-300 border border-gray-100 group"
          >
            <div className="shrink-0 mt-0.5">
              {feature.icon}
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Privacy notice */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mb-8 border border-blue-100 flex items-start gap-3"
      >
        <div className="shrink-0 bg-white p-2 rounded-full shadow-sm">
          <LockIcon className="text-blue-600" size={16} />
        </div>
        <div>
          <h4 className="font-medium text-blue-700 mb-1 text-sm">Privacy Guaranteed</h4>
          <p className="text-sm text-blue-600/80">
            MailMop runs 100% in your browser. We only access email metadata and never store your message content.
          </p>
        </div>
      </motion.div>

      {/* Connect button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mx-auto"
      >
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 px-8 py-3.5 text-white shadow-lg transition-all duration-300 hover:from-blue-500 hover:to-blue-400 disabled:opacity-70 min-w-[200px] font-medium"
        >
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 12L3 4V10L14 12L3 14V20L22 12Z" fill="white"/>
                </svg>
                <span>Connect Gmail</span>
              </>
            )}
          </div>
        </button>
      </motion.div>
    </div>
  )
} 