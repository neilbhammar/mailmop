import { useState, useRef, ChangeEvent } from 'react'
import { Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/supabase/client'
import { useAuth } from '@/context/AuthProvider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

type FeedbackType = 'issue' | 'idea' | 'other'

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const maxCharCount = 500
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { user } = useAuth()

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    if (text.length <= maxCharCount) {
      setFeedbackContent(text)
      setCharCount(text.length)
    }
  }

  const handleTypeSelect = (type: FeedbackType) => {
    setSelectedType(type)
    
    // Focus the textarea after selecting a type
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  const handleSubmit = async () => {
    if (!selectedType || !feedbackContent.trim() || !user) {
      toast.error('Please fill out all fields', {
        description: 'Both feedback type and content are required'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('feedback').insert([{
        user_id: user.id,
        feedback_type: selectedType,
        content: feedbackContent.trim(),
        user_email: user.email
      }])
      
      if (error) throw error

      toast.success('Feedback submitted successfully', {
        description: 'Thank you for helping us improve MailMop!'
      })
      
      // Reset form and close modal
      setSelectedType(null)
      setFeedbackContent('')
      setCharCount(0)
      onClose()
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Failed to submit feedback', {
        description: 'Please try again later'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-900 sm:max-w-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="text-blue-500 dark:text-blue-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <DialogTitle className="text-xl font-semibold text-left dark:text-slate-100">Share your thoughts</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-2/5">
              <div>
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    What type of feedback do you have?
                  </label>
                </div>
                
                <div className="space-y-3 mt-3">
                  <div 
                    onClick={() => handleTypeSelect('issue')}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors duration-150 ease-in-out ${
                      selectedType === 'issue' 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1 dark:border-blue-500 dark:bg-slate-800 dark:ring-blue-500' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                      selectedType === 'issue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">Issue</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Something isn't working</p>
                    </div>
                  </div>

                  <div 
                    onClick={() => handleTypeSelect('idea')}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors duration-150 ease-in-out ${
                      selectedType === 'idea' 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1 dark:border-blue-500 dark:bg-slate-800 dark:ring-blue-500' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                      selectedType === 'idea' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">Idea</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">A new feature suggestion</p>
                    </div>
                  </div>
                    
                  <div 
                    onClick={() => handleTypeSelect('other')}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors duration-150 ease-in-out ${
                      selectedType === 'other' 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1 dark:border-blue-500 dark:bg-slate-800 dark:ring-blue-500' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                      selectedType === 'other' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">Other</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Something else</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:w-3/5 mt-4 md:mt-0">
              <div className="mb-3">
                <label htmlFor="feedback-content" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Your feedback
                </label>
              </div>
              <textarea
                ref={textareaRef}
                id="feedback-content"
                value={feedbackContent}
                onChange={handleTextChange}
                placeholder="Share what's on your mind..."
                className="w-full h-[210px] px-3 py-2 text-sm text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 resize-none shadow-sm transition-colors duration-150 ease-in-out dark:bg-slate-800 dark:placeholder-slate-500"
              />
              <div className="mt-1 flex justify-between items-center">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Your feedback will be shared with your email address.
                </p>
                <span className={`text-xs ${
                  charCount > maxCharCount * 0.9 ? 'text-red-500 dark:text-red-400' : 
                  charCount > maxCharCount * 0.75 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-slate-400'
                }`}>
                  {charCount}/{maxCharCount}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="p-4 bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700 sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-500 focus:ring-offset-1 transition-colors duration-150 ease-in-out"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedType || !feedbackContent.trim()}
            className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium text-white transition-colors duration-150 ease-in-out ${
              isSubmitting || !selectedType || !feedbackContent.trim()
                ? 'bg-blue-300 cursor-not-allowed dark:bg-blue-700/60 dark:text-slate-400'
                : 'bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus:ring-blue-500'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span>{isSubmitting ? 'Submitting...' : 'Submit feedback'}</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 