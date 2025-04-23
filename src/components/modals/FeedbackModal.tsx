import { useState, useRef, ChangeEvent } from 'react'
import { X, Lightbulb, AlertCircle, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/supabase/client'
import { useUser } from '@supabase/auth-helpers-react'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

type FeedbackType = 'issue' | 'idea' | 'other'

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<FeedbackType[]>([])
  const [feedbackContent, setFeedbackContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const maxCharCount = 500
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const user = useUser()

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    if (text.length <= maxCharCount) {
      setFeedbackContent(text)
      setCharCount(text.length)
    }
  }

  const handleTypeToggle = (type: FeedbackType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type)
      } else {
        return [...prev, type]
      }
    })
    
    // Focus the textarea after selecting a type if it's the first selection
    if (selectedTypes.length === 0) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }

  const handleSubmit = async () => {
    if (selectedTypes.length === 0 || !feedbackContent.trim() || !user) {
      toast.error('Please fill out all fields', {
        description: 'Both feedback type and content are required'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Insert a record for each selected feedback type
      for (const type of selectedTypes) {
        const { error } = await supabase.from('feedback').insert([{
          user_id: user.id,
          feedback_type: type,
          content: feedbackContent.trim(),
          user_email: user.email
        }])
        
        if (error) throw error
      }

      toast.success('Feedback submitted successfully', {
        description: 'Thank you for helping us improve MailMop!'
      })
      
      // Reset form and close modal
      setSelectedTypes([])
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0" style={{ zIndex: 50 }}>
      {/* Simpler semi-transparent overlay without excessive blur */}
      <div 
        className="fixed inset-0 bg-gray-800/70"
        style={{ 
          zIndex: 50,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={onClose}
      />
      
      {/* Dialog container */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 51 }}
      >
        {/* Actual modal container */}
        <div className="bg-white rounded-xl shadow-xl w-full max-w-[800px] mx-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center p-6 justify-between border-b">
            <div className="flex items-center gap-4">
              <div className="text-blue-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Share your thoughts</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content area */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left column */}
              <div className="md:w-2/5">
                <div>
                  <div className="mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      What type of feedback do you have?
                    </label>
                  </div>
                  
                  <div className="space-y-3 mt-3">
                    <div 
                      onClick={() => handleTypeToggle('issue')}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                        selectedTypes.includes('issue') ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                        selectedTypes.includes('issue') ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Issue</p>
                        <p className="text-sm text-gray-500">Something isn't working correctly</p>
                      </div>
                    </div>

                    <div 
                      onClick={() => handleTypeToggle('idea')}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                        selectedTypes.includes('idea') ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                        selectedTypes.includes('idea') ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Idea</p>
                        <p className="text-sm text-gray-500">I have a suggestion for improvement</p>
                      </div>
                    </div>
                    
                    <div 
                      onClick={() => handleTypeToggle('other')}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                        selectedTypes.includes('other') ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                        selectedTypes.includes('other') ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Other</p>
                        <p className="text-sm text-gray-500">Something else on my mind</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right column */}
              <div className="md:w-3/5 mt-4 md:mt-0">
                <div className="mb-3">
                  <label htmlFor="feedback-content" className="text-sm font-medium text-gray-700">
                    Your feedback
                  </label>
                </div>
                <textarea
                  ref={textareaRef}
                  id="feedback-content"
                  value={feedbackContent}
                  onChange={handleTextChange}
                  placeholder="Tell us what's on your mind..."
                  className="w-full h-[210px] px-3 py-2 text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                
                <div className="mt-1 flex justify-between items-center">
  <p className="text-xs text-gray-500">
    Your feedback will be shared along with your email address.
  </p>
  <span className={`text-xs ${charCount > maxCharCount * 0.8 ? 'text-orange-500' : 'text-gray-500'}`}>
    {charCount}/{maxCharCount}
  </span>
</div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-between items-center p-4 bg-gray-50 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedTypes.length === 0 || !feedbackContent.trim()}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium text-white ${
                isSubmitting || selectedTypes.length === 0 || !feedbackContent.trim()
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span>Submit feedback</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 