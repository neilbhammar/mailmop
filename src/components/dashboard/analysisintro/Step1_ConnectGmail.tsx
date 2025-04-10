'use client'

import { useGmailPermissions } from '@/context/GmailPermissionsProvider'
import { CheckIcon, ChevronRightIcon, ShieldIcon, MailIcon, SparklesIcon, TrashIcon, BanIcon, ExternalLinkIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Step1Props {
  onNext: () => void;
}

export default function Step1_ConnectGmail({ onNext }: Step1Props) {
  const { requestPermissions, isLoading } = useGmailPermissions()
  const [currentAnimation, setCurrentAnimation] = useState(0)
  
  // No longer using auto-rotate, will be triggered by hover
  
  const handleConnect = async () => {
    try {
      const success = await requestPermissions()
      if (success) {
        onNext()
      }
    } catch (error) {
      console.error('Failed to connect to Gmail:', error)
    }
  }

  return (
    <div className="h-full w-full flex items-center">
      {/* Left side - Content (was previously on right) */}
      <div className="w-full md:w-1/2 px-8 py-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Google Logo */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
          </div>
          
          {/* Title and description */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Securely Connect Your Inbox</h1>
            <p className="text-gray-600">
            MailMop analyzes email metadata to identify who's cluttering your inbox and help you take action, all within your browser.
            </p>
          </div>
          
          {/* Benefits - now with hover functionality to control animations */}
          <div className="bg-white-50 rounded-xl mb-6">
            <div className="py-5 px-6 space-y-5">
              <div 
                className="flex cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                onMouseEnter={() => setCurrentAnimation(0)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon size={12} className="text-emerald-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">Your emails stay private</h3>
                  <p className="text-sm text-gray-500">We process and store everything in your browser, not on MailMop servers.</p>
                </div>
              </div>
              
              <div 
                className="flex cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                onMouseEnter={() => setCurrentAnimation(1)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon size={12} className="text-emerald-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">See who's cluttering your inbox</h3>
                  <p className="text-sm text-gray-500">Find out which senders are taking up the most space. Analysis is done locally using metadata.</p>
                </div>
              </div>
              
              <div 
                className="flex cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                onMouseEnter={() => setCurrentAnimation(2)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon size={12} className="text-emerald-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">Clean up with one click</h3>
                  <p className="text-sm text-gray-500">Easily delete, unsubscribe, and block unwanted senders in minutes, not hours.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex w-full items-center justify-center px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Connecting...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <span>Connect my Gmail</span>
                <ChevronRightIcon className="ml-2 w-4 h-4" />
              </div>
            )}
          </button>
          
          {/* Security and trust indicators */}
          <div className="mt-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5">
              <ShieldIcon size={12} className="text-gray-400" />
              <p className="text-xs text-gray-500">
                Secure connection. We never see your emails.
              </p>
            </div>
            <p className="text-xs text-gray-500">
              You can revoke access anytime in your MailMop settings.
            </p>
          </div>
        </div>
      </div>
      
      {/* Right side - Rotating animations (was previously on left) */}
      <div className="hidden md:flex md:w-1/2 h-full bg-slate-50 items-center justify-center p-12">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {/* Connect Animation */}
            {currentAnimation === 0 && (
              <motion.div 
                key="connect"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="relative"
                style={{ minHeight: '400px' }}
              >
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full mb-4">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2 text-xs font-bold">1</span>
                    <span className="font-medium">Connect</span>
                  </div>
                </div>
                
                <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
                  {/* Gmail OAuth animation */}
                  <div className="p-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-5">
                      <svg width="32" height="32" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    
                    <motion.div 
                      animate={{ 
                        boxShadow: ["0px 0px 0px rgba(59, 130, 246, 0)", "0px 0px 20px rgba(59, 130, 246, 0.3)", "0px 0px 0px rgba(59, 130, 246, 0)"]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        repeatType: "loop" 
                      }}
                      className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-6 relative"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-100 p-2">
                          <ShieldIcon className="h-5 w-5 text-blue-700" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-blue-900">Secure Connection</h3>
                          <p className="text-sm text-blue-700">Encrypted connection and client-side processing</p>
                        </div>
                      </div>
                      
                      <motion.div 
                        className="absolute inset-0"
                        animate={{ 
                          borderColor: ["rgba(59, 130, 246, 0)", "rgba(59, 130, 246, 0.5)", "rgba(59, 130, 246, 0)"] 
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          repeatType: "loop" 
                        }}
                        style={{ borderRadius: "0.75rem", border: "2px solid rgba(59, 130, 246, 0)" }}
                      />
                    </motion.div>
                    
                    <div className="flex flex-col items-center gap-3 text-center mt-0">
                      <p className="text-gray-600 font-medium">MailMop connects securely to Gmail</p>
                      <div className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full mt-2">
                        <CheckIcon size={12} />
                        <span>Your data stays private</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Analyze Animation */}
            {currentAnimation === 1 && (
              <motion.div 
                key="analyze"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="relative"
                style={{ minHeight: '400px' }}
              >
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center px-4 py-1.5 bg-indigo-100 text-indigo-800 rounded-full mb-4">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center mr-2 text-xs font-bold">2</span>
                    <span className="font-medium">Analyze</span>
                    <SparklesIcon className="h-4 w-4 text-indigo-600 ml-1.5" />
                  </div>
                </div>
                
                <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    {/* Browser animation with email analysis */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center px-4">
                        <div className="flex space-x-1.5 mr-4">
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                        </div>
                        <div className="flex-1 text-center text-xs text-gray-500">
                          Local Analysis
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="space-y-2">
                          <motion.div 
                            className="h-2.5 bg-indigo-200 rounded-full"
                            initial={{ width: "10%" }}
                            animate={{ width: "95%" }}
                            transition={{ duration: 3, repeat: Infinity, repeatType: "loop" }}
                          />
                          <motion.div 
                            className="h-2.5 bg-indigo-100 rounded-full"
                            initial={{ width: "20%" }}
                            animate={{ width: "85%" }}
                            transition={{ duration: 3, delay: 0.2, repeat: Infinity, repeatType: "loop" }}
                          />
                          <motion.div 
                            className="h-2.5 bg-indigo-200 rounded-full"
                            initial={{ width: "15%" }}
                            animate={{ width: "70%" }}
                            transition={{ duration: 3, delay: 0.4, repeat: Infinity, repeatType: "loop" }}
                          />
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-xs text-gray-500">Analyzing emails...</div>
                          <motion.div 
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                            className="text-xs font-medium text-indigo-700"
                          >
                            Browser only
                          </motion.div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center mt-6">
                      <p className="text-gray-600 font-medium">Fast analysis in your browser</p>
                      <div className="inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full mt-2">
                        <ShieldIcon size={12} />
                        <span>No server processing</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Clean Animation - Enhanced with more actions */}
            {currentAnimation === 2 && (
              <motion.div 
                key="clean"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="relative"
                style={{ minHeight: '400px' }}
              >
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center px-4 py-1.5 bg-emerald-100 text-emerald-800 rounded-full mb-4">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center mr-2 text-xs font-bold">3</span>
                    <span className="font-medium">Clean</span>
                    <TrashIcon className="h-4 w-4 text-emerald-600 ml-1.5" />
                  </div>
                </div>
                
                <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    {/* Enhanced email cleanup animation with multiple action types */}
                    <div className="space-y-3">
                      {/* Email 1 - Delete */}
                      <motion.div 
                        className="flex items-center bg-gray-50 rounded-lg p-3 border border-gray-200"
                        initial={{ x: 0 }}
                        animate={{ 
                          x: [0, -10, -300],
                          opacity: [1, 1, 0]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          delay: 0.5,
                          repeat: Infinity,
                          repeatDelay: 5
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 mr-3"></div>
                        <div className="flex-1">
                          <div className="h-2.5 bg-gray-200 rounded w-2/3 mb-1.5"></div>
                          <div className="h-2 bg-gray-100 rounded w-1/3"></div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="px-2 py-0.5 bg-red-50 rounded-md text-xs font-medium text-red-600">Delete</div>
                          <div className="bg-red-100 h-7 w-7 rounded-full flex items-center justify-center">
                            <TrashIcon className="h-3.5 w-3.5 text-red-500" />
                          </div>
                        </div>
                      </motion.div>
                      
                      {/* Email 2 - Unsubscribe */}
                      <motion.div 
                        className="flex items-center bg-gray-50 rounded-lg p-3 border border-gray-200"
                        initial={{ x: 0 }}
                        animate={{ 
                          x: [0, -10, -300],
                          opacity: [1, 1, 0]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          delay: 1.5,
                          repeat: Infinity,
                          repeatDelay: 5
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 mr-3"></div>
                        <div className="flex-1">
                          <div className="h-2.5 bg-gray-200 rounded w-1/2 mb-1.5"></div>
                          <div className="h-2 bg-gray-100 rounded w-1/4"></div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="px-2 py-0.5 bg-blue-50 rounded-md text-xs font-medium text-blue-600">Unsubscribe</div>
                          <div className="bg-blue-100 h-7 w-7 rounded-full flex items-center justify-center">
                            <ExternalLinkIcon className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                        </div>
                      </motion.div>
                      
                      {/* Email 3 - Block */}
                      <motion.div 
                        className="flex items-center bg-gray-50 rounded-lg p-3 border border-gray-200"
                        initial={{ x: 0 }}
                        animate={{ 
                          x: [0, -10, -300],
                          opacity: [1, 1, 0]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          delay: 2.5,
                          repeat: Infinity,
                          repeatDelay: 5
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 mr-3"></div>
                        <div className="flex-1">
                          <div className="h-2.5 bg-gray-200 rounded w-3/5 mb-1.5"></div>
                          <div className="h-2 bg-gray-100 rounded w-2/5"></div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="px-2 py-0.5 bg-orange-50 rounded-md text-xs font-medium text-orange-600">Block</div>
                          <div className="bg-orange-100 h-7 w-7 rounded-full flex items-center justify-center">
                            <BanIcon className="h-3.5 w-3.5 text-orange-500" />
                          </div>
                        </div>
                      </motion.div>
                    </div>
                    
                    <motion.div 
                      className="mt-6 bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center justify-between"
                      animate={{ 
                        boxShadow: ["0px 0px 0px rgba(16, 185, 129, 0)", "0px 0px 12px rgba(16, 185, 129, 0.3)", "0px 0px 0px rgba(16, 185, 129, 0)"]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        repeatType: "loop" 
                      }}
                    >
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-emerald-500 mr-2" />
                        <span className="text-sm font-medium text-emerald-800">3,240 emails cleaned</span>
                      </div>
                      <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">94% space freed</span>
                    </motion.div>
                    
                    <div className="text-center mt-6">
                      <p className="text-gray-600 font-medium">Clean up your inbox</p>
                      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full mt-2">
                        <CheckIcon size={12} />
                        <span>Save hours of manual work</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Dots indicator */}
          <div className="flex justify-center mt-8 space-x-2">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentAnimation === i ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() => setCurrentAnimation(i)}
                aria-label={`View ${i === 0 ? 'connect' : i === 1 ? 'analyze' : 'clean'} animation`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 