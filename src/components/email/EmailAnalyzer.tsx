import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { 
  getEmailCounts, 
  EmailCounts, 
  processEmails, 
  SenderSummary, 
  EmailProcessingOptions,
  ProcessingProgress,
  generateCSV,
  downloadCSV
} from '../../api/gmailApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useToast } from '../../lib/use-toast';
import { 
  Settings, Download, RefreshCw, ChevronDown, Eye, ArrowUpDown, 
  StopCircle, Copy, Check, Group, Mail, Trash2, ArrowRight, 
  ChevronLeft, Bell, X, Ban, CreditCard, MoreHorizontal, 
  FileEdit, Sparkles, FilterX, Search
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Local storage keys
const CACHE_SUMMARY_KEY = 'mailmop_summary';
const CACHE_EMAIL_COUNTS_KEY = 'mailmop_email_counts';
const CACHE_USER_KEY = 'mailmop_user_email';

interface EmailAnalyzerProps {
  accessToken: string;
  onResetPermissions: () => void;
  onSignOut: () => void;
}

interface SenderData {
  email: string;
  name: string;
  count: number;
  domain: string;
  unsubscribeLink?: string;
}

function getDomainFromEmail(email: string): string {
  return email.split('@')[1] || email;
}

function createGmailSearchQuery(email: string): string {
  return `from:(${email})`;
}

// Add queue interface types
interface QueueItem {
  id: string;
  operation: 'Delete' | 'Archive' | 'Label' | 'Analyze';
  targetName: string;
  targetCount: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  startTime?: Date;
  estimatedEndTime?: Date;
  progress: {
    processed: number;
    total: number;
  };
}

interface ProcessingQueue {
  items: QueueItem[];
  active: number;
  pending: number;
}

// Add new interface for journey stages
interface JourneyStage {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'active' | 'upcoming';
}

// Add function to get user-specific cache keys
const getUserCacheKey = (key: string, userEmail: string | null) => {
  return `${key}_${userEmail}`;
};

// Add function to clear all cached data
const clearAllCachedData = () => {
  localStorage.removeItem(CACHE_SUMMARY_KEY);
  localStorage.removeItem(CACHE_EMAIL_COUNTS_KEY);
  localStorage.removeItem(CACHE_USER_KEY);
};

// Modify the SenderRow component to show actions only on hover
const SenderRow = memo(({ 
  sender, 
  isSelected, 
  onToggleSelect, 
  copiedEmail,
  onCopyQuery,
  onDelete,
  index,
  allEmails,
  userEmail
}: { 
  sender: SenderData;
  isSelected: boolean;
  onToggleSelect: (email: string, shiftKey: boolean, index: number) => void;
  copiedEmail: string | null;
  onCopyQuery: (email: string) => void;
  onDelete: (operation: 'Delete' | 'Archive' | 'Label' | 'Analyze', count: number) => void;
  index: number;
  allEmails: SenderData[];
  userEmail: string;
}) => {
  return (
    <TableRow 
      className="group hover:bg-blue-50/50 cursor-pointer select-none"
      onClick={(e) => {
        const shiftKey = e.shiftKey;
        onToggleSelect(sender.email, shiftKey, index);
      }}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={(checked) => {
              const shiftKey = (window.event as KeyboardEvent | undefined)?.shiftKey ?? false;
              onToggleSelect(sender.email, shiftKey, index);
            }}
            className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-100/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyQuery(sender.email);
                  }}
                >
                  {copiedEmail === sender.email ? (
                    <Check className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy Gmail search query for this sender</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
      <TableCell className="font-medium max-w-[250px] truncate">
        {sender.name}
      </TableCell>
      <TableCell className="max-w-[200px] truncate">
        <span className="opacity-70">{sender.email}</span>
      </TableCell>
      <TableCell className="text-right font-medium text-blue-700">
        {sender.count.toLocaleString()}
      </TableCell>
      <TableCell></TableCell>
      <TableCell>
        {sender.unsubscribeLink ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 h-7"
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <a href={sender.unsubscribeLink} target="_blank" rel="noopener noreferrer">
              Unsubscribe
            </a>
          </Button>
        ) : (
          <span className="text-sm text-slate-400">Not available</span>
        )}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://mail.google.com/mail/u/${userEmail}/#search/from:${encodeURIComponent(sender.email)}`, '_blank');
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View in Gmail</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete('Delete', sender.count);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete all from sender</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-600 hover:text-slate-700"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  /* TODO: Implement delete with exceptions */
                }}
              >
                <FilterX className="h-4 w-4 mr-2 text-slate-600" />
                Delete with Exceptions
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer text-amber-600"
                onClick={(e) => {
                  e.stopPropagation();
                  /* TODO: Implement block sender */
                }}
              >
                <Ban className="h-4 w-4 mr-2" />
                Block Sender
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
});

SenderRow.displayName = 'SenderRow';

export default function EmailAnalyzer({ accessToken, onResetPermissions, onSignOut }: EmailAnalyzerProps) {
  const [emailCounts, setEmailCounts] = useState<EmailCounts>({ messages: null, threads: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  
  // Move lastCheckedEmail hook inside component
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string | null>(null);
  
  // Add state to control showing filter options
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  
  // Add debug state to track component lifecycle
  const [debugInfo, setDebugInfo] = useState<{stage: string, data?: any}>({stage: 'initializing'});
  
  // Processing state
  const [processingOptions, setProcessingOptions] = useState<EmailProcessingOptions>({
    excludeSentByMe: true,
    onlyUnsubscribe: false
  });
  const [progress, setProgress] = useState<ProcessingProgress>({
    processed: 0,
    total: null,
    status: 'idle'
  });
  const [senderSummary, setSenderSummary] = useState<SenderSummary>({});
  const [sortConfig, setSortConfig] = useState<{
    key: 'email' | 'name' | 'count';
    direction: 'ascending' | 'descending';
  }>({
    key: 'count',
    direction: 'descending'
  });
  const [filterText, setFilterText] = useState('');
  const [hasMetadataScopeIssue, setHasMetadataScopeIssue] = useState(false);
  const [processingRate, setProcessingRate] = useState<number | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [totalEmailsProcessed, setTotalEmailsProcessed] = useState<number>(0);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null);
  
  const processingCancelRef = useRef<boolean>(false);
  const processingStartTimeRef = useRef<number | null>(null);
  const lastProcessedCountRef = useRef<number>(0);
  const processingRateIntervalRef = useRef<number | null>(null);
  const currentSummaryRef = useRef<SenderSummary>({});
  
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 3);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update carousel transform based on current step
  const getCarouselStyle = () => ({
    transform: `translateX(-${currentStep * 100}%)`
  });

  // Add console logging for debugging
  useEffect(() => {
    console.log("EmailAnalyzer mounted with accessToken:", accessToken ? "present" : "missing");
    setDebugInfo({stage: 'component_mounted'});
    
    // Load cached data on component mount
    try {
      // First, get the cached user email
      const cachedUserEmail = localStorage.getItem(CACHE_USER_KEY);
      
      // Load cached summary data only if we have matching user email
      const cachedSummary = localStorage.getItem(getUserCacheKey(CACHE_SUMMARY_KEY, cachedUserEmail));
      if (cachedSummary && cachedUserEmail) {
        try {
          const parsed = JSON.parse(cachedSummary);
          setSenderSummary(parsed.data);
          setAnalysisTimestamp(new Date(parsed.timestamp));
          currentSummaryRef.current = parsed.data;
          console.log("Loaded cached summary data for user:", cachedUserEmail);
        } catch (err) {
          console.error('Failed to parse cached summary:', err);
          clearAllCachedData();
        }
      }

      // Load cached email counts
      const cachedCounts = localStorage.getItem(getUserCacheKey(CACHE_EMAIL_COUNTS_KEY, cachedUserEmail));
      if (cachedCounts && cachedUserEmail) {
        try {
          const counts = JSON.parse(cachedCounts);
          // Only use cached counts if they match the current user
          if (counts.emailAddress === cachedUserEmail) {
            setEmailCounts(counts);
            setLoading(false);
            console.log("Loaded cached email counts for user:", cachedUserEmail);
            setDebugInfo({stage: 'loaded_from_cache'});
          } else {
            console.log("Cached counts belong to different user, fetching fresh data");
            clearAllCachedData();
            fetchEmailCounts();
          }
        } catch (err) {
          console.error('Failed to parse cached email counts:', err);
          clearAllCachedData();
          fetchEmailCounts();
        }
      } else {
        console.log("No cached data, fetching email counts");
        fetchEmailCounts();
      }
    } catch (error) {
      console.error("Error in initialization:", error);
      setError("Failed to initialize component: " + (error instanceof Error ? error.message : String(error)));
      setLoading(false);
      setDebugInfo({stage: 'initialization_error', data: error});
    }
  }, [accessToken]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (processingRateIntervalRef.current) {
        window.clearInterval(processingRateIntervalRef.current);
      }
    };
  }, []);

  // Update fetchEmailCounts to handle caching with user email
  async function fetchEmailCounts() {
    try {
      setLoading(true);
      setDebugInfo({stage: 'fetching_email_counts'});
      console.log("Fetching email counts with token:", accessToken ? "present" : "missing");
      
      const counts = await getEmailCounts(accessToken);
      console.log("Email counts fetched:", counts);
      
      setEmailCounts(counts);
      setDebugInfo({stage: 'email_counts_fetched', data: counts});
      
      // Cache the email counts with user email
      if (counts.emailAddress) {
        localStorage.setItem(CACHE_USER_KEY, counts.emailAddress);
        localStorage.setItem(
          getUserCacheKey(CACHE_EMAIL_COUNTS_KEY, counts.emailAddress),
          JSON.stringify(counts)
        );
      }
    } catch (err) {
      console.error('Failed to fetch email counts:', err);
      setError('Failed to load email information. Please try again.');
      setDebugInfo({stage: 'email_counts_error', data: err});
    } finally {
      setLoading(false);
    }
  }

  // Handle option changes
  const handleOptionChange = (option: keyof EmailProcessingOptions) => {
    setProcessingOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Calculate and update processing rate
  const startProcessingRateCalculation = () => {
    processingStartTimeRef.current = Date.now();
    lastProcessedCountRef.current = 0;
    
    // Set up interval to calculate processing rate every 2 seconds
    if (processingRateIntervalRef.current) {
      window.clearInterval(processingRateIntervalRef.current);
    }
    
    processingRateIntervalRef.current = window.setInterval(() => {
      if (progress.status === 'processing' && progress.processed > 0) {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - (processingStartTimeRef.current || currentTime)) / 1000;
        if (elapsedSeconds > 0) {
          // Calculate emails per second
          const rate = progress.processed / elapsedSeconds;
          setProcessingRate(rate);
          
          // Calculate rate for just the last interval
          const recentRate = (progress.processed - lastProcessedCountRef.current) / 2; // 2 seconds interval
          lastProcessedCountRef.current = progress.processed;
          
          // If rate drops significantly, show warning about rate limiting
          if (recentRate < rate / 2 && progress.processed > 100) {
            toast({
              title: "Processing Slowing Down",
              description: "Gmail may be rate limiting requests. Consider stopping and trying again later.",
              duration: 5000,
            });
          }
        }
      }
    }, 2000);
  };

  // Stop processing rate calculation
  const stopProcessingRateCalculation = () => {
    if (processingRateIntervalRef.current) {
      window.clearInterval(processingRateIntervalRef.current);
      processingRateIntervalRef.current = null;
    }
    setProcessingRate(null);
  };

  // Update sender summary with new batch data
  const updateSenderSummary = (newBatchData: SenderSummary) => {
    const updatedSummary = { ...currentSummaryRef.current };
    
    Object.entries(newBatchData).forEach(([email, data]) => {
      if (updatedSummary[email]) {
        updatedSummary[email].count += data.count;
      } else {
        updatedSummary[email] = { ...data };
      }
    });
    
    setSenderSummary(updatedSummary);
    currentSummaryRef.current = updatedSummary;
    
    // Cache the updated summary with user email
    const userEmail = emailCounts.emailAddress;
    if (userEmail) {
      localStorage.setItem(
        getUserCacheKey(CACHE_SUMMARY_KEY, userEmail),
        JSON.stringify({
          data: updatedSummary,
          timestamp: analysisTimestamp
        })
      );
    }
    
    return updatedSummary;
  };

  // Handle process emails button click
  const handleProcessEmails = async () => {
    try {
      // Reset any previous results and errors
      setError(null);
      setHasMetadataScopeIssue(false);
      processingCancelRef.current = false;
      
      // Reset the current summary if starting fresh
      if (progress.status !== 'processing' && progress.status !== 'stopping') {
        currentSummaryRef.current = {};
        setSenderSummary({});
      }
      
      setProgress({
        processed: 0,
        total: null,
        status: 'processing'
      });
      
      // Create a queue item for the analysis operation
      const analysisQueueItem: QueueItem = {
        id: Date.now().toString(),
        operation: 'Analyze',
        targetName: 'Inbox',
        targetCount: emailCounts.messages || 0,
        status: 'active',
        startTime: new Date(),
        progress: {
          processed: 0,
          total: emailCounts.messages || 0
        }
      };
      
      // Add to queue
      const analysisItemId = analysisQueueItem.id;
      setProcessingQueue(prev => ({
        items: [analysisQueueItem, ...prev.items],
        active: prev.active + 1,
        pending: prev.pending
      }));
      
      // Start tracking processing rate
      startProcessingRateCalculation();
      setAnalysisTimestamp(new Date());
      
      // Start processing emails
      const summary = await processEmails(
        accessToken,
        processingOptions,
        (progressUpdate) => {
          setProgress(progressUpdate);
          
          // Also update the queue item
          setProcessingQueue(prev => {
            const updatedItems = prev.items.map(item => {
              if (item.id === analysisItemId) {
                let newStatus: 'active' | 'completed' | 'error' | 'pending';
                
                if (progressUpdate.status === 'completed') {
                  newStatus = 'completed';
                } else if (progressUpdate.status === 'error') {
                  newStatus = 'error';
                } else if (progressUpdate.status === 'stopping') {
                  newStatus = 'error';
                } else {
                  newStatus = 'active';
                }
                
                return {
                  ...item,
                  progress: {
                    processed: progressUpdate.processed,
                    total: progressUpdate.total || item.targetCount
                  },
                  status: newStatus
                };
              }
              return item;
            });
            
            // Update active/pending counts based on status changes
            const activeCount = updatedItems.filter(item => item.status === 'active').length;
            const pendingCount = updatedItems.filter(item => item.status === 'pending').length;
            
            return {
              items: updatedItems,
              active: activeCount,
              pending: pendingCount
            };
          });
          
          if (progressUpdate.status === 'completed') {
            setTotalEmailsProcessed(progressUpdate.processed);
          }
          
          // Check if processing was cancelled
          if (processingCancelRef.current) {
            throw new Error("Processing cancelled by user");
          }
        },
        // Add batch size and delay parameters to avoid rate limiting
        {
          batchSize: 45,  // Process 45 emails at a time
          delayBetweenBatches: 1000,  // Wait 1 second between batches
          onBatchProcessed: (batchSummary) => {
            // Update the sender summary with each batch
            updateSenderSummary(batchSummary);
          }
        }
      );
      
      // Final update to the sender summary
      updateSenderSummary(summary);
      
      toast({
        title: "Processing Complete",
        description: `Successfully analyzed ${totalEmailsProcessed.toLocaleString()} emails.`,
      });
      
    } catch (err) {
      console.error('Failed to process emails:', err);
      
      // Update queue item to error state
      setProcessingQueue(prev => {
        const updatedItems = prev.items.map(item => {
          if (item.operation === 'Analyze' && item.status === 'active') {
            return {
              ...item,
              status: 'error' as 'error' | 'active' | 'pending' | 'completed'
            };
          }
          return item;
        });
        
        const activeCount = updatedItems.filter(item => item.status === 'active').length;
        
        return {
          items: updatedItems,
          active: activeCount,
          pending: prev.pending
        };
      });
      
      // Check if the error is related to scope limitations
      if (err instanceof Error && err.message.includes("Metadata scope does not support 'q' parameter")) {
        setHasMetadataScopeIssue(true);
        toast({
          title: "Permission Error",
          description: "Your current authentication doesn't have permission to use filters. Please use the 'Reset Permissions' option and sign in again.",
          variant: "destructive",
        });
      } else if (err instanceof Error && err.message === "Processing cancelled by user") {
        // When cancelled, we still want to keep the data we've processed so far
        toast({
          title: "Processing Stopped",
          description: `Stopped after processing ${progress.processed.toLocaleString()} emails.`,
        });
      } else {
        setError('Failed to process emails. Please try again.');
        toast({
          title: "Error",
          description: "Failed to process emails. Please try again.",
          variant: "destructive",
        });
      }
      
      setProgress(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    } finally {
      stopProcessingRateCalculation();
    }
  };

  // Handle stop processing
  const handleStopProcessing = () => {
    processingCancelRef.current = true;
    setProgress(prev => ({
      ...prev,
      status: 'stopping'
    }));
  };

  // Handle sorting
  const handleSort = (key: 'email' | 'name' | 'count') => {
    setSortConfig(prev => ({
      key,
      direction: 
        prev.key === key && prev.direction === 'ascending' 
          ? 'descending' 
          : 'ascending'
    }));
  };

  // Handle CSV download
  const handleDownloadCSV = () => {
    const csvData = generateCSV(senderSummary);
    downloadCSV(csvData);
  };

  // Handle copy to clipboard
  const handleCopySearchQuery = async (email: string) => {
    const query = createGmailSearchQuery(email);
    await navigator.clipboard.writeText(query);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Get sorted and filtered sender data
  const getSortedSenders = () => {
    // Ensure senderSummary is an object, default to empty object if null/undefined
    const summary = senderSummary || {};
    
    const senders = Object.entries(summary).map(([email, data]) => ({
      email,
      name: data.name || '',
      count: data.count || 0,
      domain: getDomainFromEmail(email),
      unsubscribeLink: data.unsubscribeLink
    }));
    
    // Apply filter
    const filteredSenders = filterText
      ? senders.filter(sender => 
          sender.email.toLowerCase().includes(filterText.toLowerCase()) ||
          sender.name.toLowerCase().includes(filterText.toLowerCase()) ||
          sender.domain.toLowerCase().includes(filterText.toLowerCase())
        )
      : senders;
    
    // Apply sorting
    const sortedSenders = filteredSenders.sort((a, b) => {
      const key = sortConfig.key;
      
      if (key === 'count') {
        return sortConfig.direction === 'ascending'
          ? a.count - b.count
          : b.count - a.count;
      } else {
        // For text-based columns
        const aValue = a[key]?.toLowerCase() || '';
        const bValue = b[key]?.toLowerCase() || '';
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      }
    });

    // Apply pagination
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return {
      items: sortedSenders.slice(startIndex, endIndex),
      totalItems: sortedSenders.length,
      totalPages: Math.ceil(sortedSenders.length / ITEMS_PER_PAGE)
    };
  };

  // Memoize the sorted and paginated results
  const sortedAndPaginatedData = useMemo(() => getSortedSenders(), [
    senderSummary,
    filterText,
    sortConfig,
    currentPage
  ]);

  // Format time remaining (based on processing rate only, not total)
  const formatEstimatedTimeRemaining = () => {
    if (!processingRate || processingRate <= 0) return null;
    
    // Estimate based on email count and current rate
    const estimatedTotalEmails = emailCounts.messages || 10000; // Use a fallback if count unknown
    const processedSoFar = progress.processed;
    const remainingEmails = estimatedTotalEmails - processedSoFar;
    
    if (remainingEmails <= 0) return null;
    
    const remainingSeconds = remainingEmails / processingRate;
    
    if (remainingSeconds < 60) {
      return `~${Math.round(remainingSeconds)} seconds at current rate`;
    } else if (remainingSeconds < 3600) {
      return `~${Math.round(remainingSeconds / 60)} minutes at current rate`;
    } else {
      return `~${(remainingSeconds / 3600).toFixed(1)} hours at current rate`;
    }
  };

  // Get filter description
  const getFilterDescription = () => {
    const filters = [];
    if (processingOptions.excludeSentByMe) filters.push("Excluding sent emails");
    if (processingOptions.onlyUnsubscribe) filters.push("Unsubscribe only");
    return filters.length > 0 ? filters.join(" • ") : "No filters";
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Add new state
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Add pagination controls component
  const PaginationControls = ({ totalPages }: { totalPages: number }) => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between px-2 py-4 border-t">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    );
  };

  // Add new state for active tab
  const [activeTab, setActiveTab] = useState('analysis');

  // Add processing queue state 
  const [processingQueue, setProcessingQueue] = useState<ProcessingQueue>({
    items: [],
    active: 0,
    pending: 0,
  });

  // Add queue helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-amber-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatEstimatedTime = (item: QueueItem) => {
    if (item.status === 'completed') {
      return 'Completed';
    }
    
    if (item.status === 'pending') {
      return 'Waiting to start';
    }
    
    if (item.status === 'active' && item.estimatedEndTime) {
      const minutesRemaining = Math.max(0, Math.round((item.estimatedEndTime.getTime() - Date.now()) / 60000));
      return minutesRemaining > 0 ? `${minutesRemaining} min remaining` : 'Finishing soon';
    }
    
    return '';
  };

  const addToProcessingQueue = (operation: 'Delete' | 'Archive' | 'Label' | 'Analyze', count: number) => {
    const newItem: QueueItem = {
      id: Date.now().toString(),
      operation,
      targetName: selectedEmails.size > 0 
        ? `${Array.from(selectedEmails).join(' OR ')}`
        : 'Unknown',
      targetCount: count,
      status: 'pending',
      progress: {
        processed: 0,
        total: count
      }
    };
    
    setProcessingQueue(prev => ({
      items: [newItem, ...prev.items],
      active: prev.active,
      pending: prev.pending + 1
    }));
    
    toast({
      title: "Operation Queued",
      description: `${operation} operation for ${count} emails has been added to the queue.`,
    });
    
    // Clear selected emails after queueing operation
    setSelectedEmails(new Set());
  };

  // New function to show filter options
  const handleShowFilterOptions = () => {
    setShowFilterOptions(true);
  };

  // New function to start processing after filter options are set
  const handleStartProcessing = () => {
    setShowFilterOptions(false);
    handleProcessEmails();
  };

  // Clear cache on sign out
  const handleSignOut = () => {
    clearAllCachedData();
    onSignOut();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading your email data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] max-w-md mx-auto text-center">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          <Button variant="outline" onClick={onResetPermissions}>Reset Permissions</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Modern header with subtle shadow */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm pt-2 rounded-lg">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-32">
                <div className="flex items-center">
                  <div className="bg-blue-600 text-white rounded-md p-1.5 mr-2">
                    <Mail className="h-5 w-5" />
          </div>
                  <span className="font-semibold text-lg text-slate-800">MailMop</span>
        </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                  <div className="flex items-center pl-3 cursor-pointer">
                    <Avatar className="h-9 w-9 border-2 border-white">
                      <AvatarImage src="/images/avatar.png" />
                      <AvatarFallback className="bg-blue-600 text-white text-sm flex items-center justify-center">
                        {emailCounts.emailAddress ? 
                          emailCounts.emailAddress.split('@')[0].substring(0, 2).toUpperCase() : 
                          'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-2 hidden md:block">
                      <p className="text-sm font-medium text-slate-800">Neil Bhammar</p>
                      <p className="text-xs text-slate-500">{emailCounts.emailAddress || 'Your Account'}</p>
                    </div>
                  </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onResetPermissions} className="cursor-pointer">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <span>Revoke Gmail Access</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
                  <div className="px-3 py-2">
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-slate-500" />
                      <span className="text-sm">My Plan:  <span className="text-blue-600"> Free</span></span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
        </div>
      </header>

      <div className="container mx-auto pt-8 px-4 sm:px-6 pb-16">
        {/* Title section with stats underneath */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Email Analysis</h1>
          <p className="text-slate-500 mt-1">Analyze and clean your inbox</p>
          
          <div className="mt-4 flex items-center gap-8 text-sm">
            <div>
              <span className="text-slate-500">Total Emails</span>
              <p className="font-medium text-slate-800">{emailCounts.messages?.toLocaleString() || '...'}</p>
                </div>
            <div>
              <span className="text-slate-500">Threads</span>
              <p className="font-medium text-slate-800">{emailCounts.threads?.toLocaleString() || '...'}</p>
              </div>
            <div>
              <span className="text-slate-500">Analyzed</span>
              <p className="font-medium text-slate-800">{(senderSummary && Object.keys(senderSummary).length > 0) ? totalEmailsProcessed.toLocaleString() : '0'}</p>
                </div>
            <div className="text-xs text-slate-500 ml-auto">
              {analysisTimestamp ? `Last analyzed: ${new Date(analysisTimestamp).toLocaleDateString()}` : 'Not analyzed yet'}
            </div>
          </div>
        </div>

        {/* Authentication status alert - show when there are API errors */}
        {(error || hasMetadataScopeIssue) && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <div className="text-amber-500 shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-amber-800 mb-1">Authentication Issue</h3>
              <p className="text-sm text-amber-700 mb-3">
                {hasMetadataScopeIssue 
                  ? "Your current authentication doesn't have permission to use filters."
                  : "There was a problem connecting to your Gmail account. Your session may have expired."}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-amber-200 text-amber-800 hover:bg-amber-100"
                onClick={onResetPermissions}
              >
                Reset Permissions
              </Button>
            </div>
          </div>
        )}

        {/* Filter Options Modal */}
        {showFilterOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Analysis Options</h3>
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="modal-exclude-sent" 
                    checked={processingOptions.excludeSentByMe}
                    onCheckedChange={() => handleOptionChange('excludeSentByMe')}
                    className="border-slate-300 data-[state=checked]:bg-blue-600"
                  />
                  <label htmlFor="modal-exclude-sent" className="text-sm text-slate-700">
                    Exclude emails sent by me
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="modal-only-unsubscribe" 
                    checked={processingOptions.onlyUnsubscribe}
                    onCheckedChange={() => handleOptionChange('onlyUnsubscribe')}
                    className="border-slate-300 data-[state=checked]:bg-blue-600"
                  />
                  <label htmlFor="modal-only-unsubscribe" className="text-sm text-slate-700">
                    Only include emails with "unsubscribe"
                  </label>
                </div>
                      </div>
              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setShowFilterOptions(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleStartProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Analysis
                </Button>
                        </div>
                    </div>
                    </div>
        )}

        {/* Main content area with guided workflow */}
        {!senderSummary || !Object.keys(senderSummary).length ? (
          // First-time setup - Simple, focused on starting analysis
          <Card className="border rounded-xl shadow-sm bg-white">
            <CardContent className="p-8">
              <div className="max-w-2xl mx-auto text-center">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6 mx-auto">
                  <Mail className="h-10 w-10 text-blue-300" />
                      </div>
                <h2 className="text-2xl font-semibold text-slate-800 mb-3">Start by Analyzing Your Inbox</h2>
                <p className="text-slate-500 mb-8">
                  We'll scan your inbox to find all the senders, so you can clean up unwanted emails in bulk.
                  {emailCounts.messages && (
                    <span className="block mt-2 text-sm">
                      We'll analyze {emailCounts.messages.toLocaleString()} emails in your account.
                    </span>
                  )}
                </p>
                
                <div className="bg-slate-50 rounded-lg p-6 mb-8">
                  <h3 className="text-sm font-medium text-slate-700 mb-4">Options (optional)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="exclude-sent" 
                        checked={processingOptions.excludeSentByMe}
                        onCheckedChange={() => handleOptionChange('excludeSentByMe')}
                        className="border-slate-300 data-[state=checked]:bg-blue-600"
                      />
                      <label htmlFor="exclude-sent" className="text-sm text-slate-700">
                        Exclude emails sent by me
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="only-unsubscribe" 
                        checked={processingOptions.onlyUnsubscribe}
                        onCheckedChange={() => handleOptionChange('onlyUnsubscribe')}
                        className="border-slate-300 data-[state=checked]:bg-blue-600"
                      />
                      <label htmlFor="only-unsubscribe" className="text-sm text-slate-700">
                        Only include emails with "unsubscribe"
                      </label>
                    </div>
                  </div>
                </div>
                    
                    <Button 
                  onClick={handleProcessEmails}
                  className="bg-blue-600 hover:bg-blue-700 w-full max-w-sm"
                  size="lg"
                >
                  Start Analysis
                    </Button>

                {/* Auth help */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500">Having trouble? Try:</p>
                  <button 
                    onClick={onResetPermissions}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 hover:underline"
                  >
                    Reset authentication
                  </button>
                  </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Analysis complete - Results view with clear workflow
          <div className="space-y-6">
            {/* Analysis controls bar - Simple but powerful */}
            <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
                {/* Start/restart analysis */}
                <div>
                  <Button 
                    onClick={handleShowFilterOptions}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={progress.status === 'processing' || progress.status === 'stopping'}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {progress.status === 'idle' ? 'Reanalyze Inbox' : 'Processing...'}
                  </Button>
        </div>

                {/* Progress indicator (only shown when processing) */}
                {(progress.status === 'processing' || progress.status === 'stopping') && (
                  <div className="min-w-[200px] sm:flex-1 max-w-md space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Processing emails...</span>
                      <span className="text-blue-600 font-medium">
                        {progress.processed.toLocaleString()} of {progress.total ? progress.total.toLocaleString() : '?'}
                      </span>
            </div>
                    <Progress 
                      value={progress.total ? (progress.processed / progress.total) * 100 : undefined}
                      className="h-2"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        {formatEstimatedTimeRemaining() || 'Calculating...'}
                      </span>
                      {(progress.status === 'processing' || progress.status === 'stopping') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStopProcessing}
                          disabled={progress.status === 'stopping'}
                          className="h-7 px-2 py-0 text-xs"
                        >
                          {progress.status === 'stopping' ? 'Stopping...' : 'Stop'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Queue summary - collapsed version */}
                {processingQueue.items.length > 0 && (
                  <div className="min-w-[180px]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="border-slate-200 w-full justify-between"
                        >
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${processingQueue.active > 0 ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'}`}></div>
                            <span>Queue: {processingQueue.active + processingQueue.pending} items</span>
                    </div>
                          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80">
                        <div className="px-2 py-1.5 text-sm font-medium">Processing Queue</div>
                        <DropdownMenuSeparator />
                        <div className="max-h-[300px] overflow-y-auto p-1">
                          {processingQueue.items.map((item, index) => (
                            <div key={index} className={`p-2 rounded-md mb-1 ${item.status === 'active' ? 'bg-blue-50' : 'bg-slate-50'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(item.status)}`}></div>
                                  <span className="font-medium">{item.operation}</span>
                  </div>
                                <Badge variant={getBadgeVariant(item.status)} className="capitalize text-xs">
                                  {item.status}
                                </Badge>
                </div>
                              {item.status === 'active' && (
                                <Progress 
                                  value={(item.progress.processed / item.targetCount) * 100} 
                                  className="h-1 mt-2"
                                />
                              )}
                    </div>
                          ))}
                  </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="justify-center text-slate-500 cursor-pointer"
                          onClick={() => {
                            setProcessingQueue({
                              items: [],
                              active: 0,
                              pending: 0
                            });
                            toast({
                              title: "Queue Cleared",
                              description: "All operations have been cleared."
                            });
                          }}
                        >
                          Clear All
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                )}
                    </div>
                  </div>
            
            {/* Results table with simplified interface */}
            <Card className="border rounded-xl shadow-sm bg-white">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-800">Email Senders</h2>
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="text-slate-400 hover:text-slate-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="16" x2="12" y2="12"></line>
                              <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-0 w-[280px] overflow-hidden rounded-lg">
                          <div className="bg-white px-4 py-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <p className="font-medium text-sm">Analysis Details</p>
                            </div>
                          </div>
                          <div className="px-4 py-3 space-y-3 bg-slate-50">
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Last Analysis</p>
                              <p className="text-sm text-slate-700">{analysisTimestamp ? new Date(analysisTimestamp).toLocaleString() : 'Not analyzed yet'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Active Filters</p>
                              <div className="flex flex-wrap gap-1.5">
                                {processingOptions.excludeSentByMe && (
                                  <div className="bg-white text-xs px-2 py-1 rounded border border-slate-200 text-slate-700">
                                    Excluding sent emails
                                  </div>
                                )}
                                {processingOptions.onlyUnsubscribe && (
                                  <div className="bg-white text-xs px-2 py-1 rounded border border-slate-200 text-slate-700">
                                    Unsubscribe only
                                  </div>
                                )}
                                {!processingOptions.excludeSentByMe && !processingOptions.onlyUnsubscribe && (
                                  <div className="text-xs text-slate-500">No filters applied</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                </div>
                  {selectedEmails.size > 0 && (
                    <div className="flex items-center gap-3 ml-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">{selectedEmails.size} selected</span>
              </div>
                      <Separator orientation="vertical" className="h-6" />
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            const gmailUrl = `https://mail.google.com/mail/u/${emailCounts?.emailAddress || '0'}/#search/from:(${Array.from(selectedEmails).join(' OR ')})`;
                            window.open(gmailUrl, '_blank');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View in Gmail
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            const query = `{from:(${Array.from(selectedEmails).join(' OR ')})}`; 
                            navigator.clipboard.writeText(query);
                            toast({
                              title: "Copied Search Query",
                              description: `Search query for ${selectedEmails.size} senders copied to clipboard`,
                            });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Query
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700 hover:bg-red-50"
                          onClick={() => {
                            const totalEmails = Array.from(selectedEmails).reduce((total, email) => {
                              const sender = sortedAndPaginatedData.items.find(s => s.email === email);
                              return total + (sender?.count || 0);
                            }, 0);
                            addToProcessingQueue('Delete', totalEmails);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-600 hover:text-slate-700"
                            >
                              <MoreHorizontal className="h-4 w-4 mr-2" />
                              More
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                /* TODO: Implement delete with exceptions */
                              }}
                            >
                              <FilterX className="h-4 w-4 mr-2 text-slate-600" />
                              Delete with Exceptions
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer text-amber-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                /* TODO: Implement block sender */
                              }}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Block Sender
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
      </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                  <input
                    type="text"
                      placeholder="Search senders..."
                      className="w-64 h-9 px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
              <div className="relative">
                <div className="overflow-auto max-h-[600px] relative">
                  <Table className="relative">
                    <TableHeader className="bg-white sticky top-0 z-20">
                      <TableRow className="hover:bg-slate-100 after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1px] after:bg-slate-200">
                    <TableHead className="w-[50px]">
                      {selectedEmails.size > 0 ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-4 w-4 border border-slate-300 rounded flex items-center justify-center cursor-pointer"
                                onClick={() => setSelectedEmails(new Set())}
                              >
                                <div className="h-[2px] w-2 bg-slate-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead 
                          className="cursor-pointer hover:text-blue-700 text-slate-600 font-medium"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name
                        {sortConfig.key === 'name' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                          className="cursor-pointer hover:text-blue-700 text-slate-600 font-medium"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Email
                        {sortConfig.key === 'email' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                          className="cursor-pointer text-right hover:text-blue-700 text-slate-600 font-medium w-[100px]"
                      onClick={() => handleSort('count')}
                    >
                      <div className="flex items-center justify-end">
                        Count
                        {sortConfig.key === 'count' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                        <TableHead className="w-[20px]"></TableHead>
                        <TableHead className="text-slate-600 font-medium w-[150px]">
                          Unsubscribe
                        </TableHead>
                        <TableHead className="w-[120px] text-center text-slate-600 font-medium">
                          Actions
                        </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {sortedAndPaginatedData.items.map((sender: SenderData, index) => (
                    <SenderRow
                      key={sender.email}
                      sender={sender}
                      isSelected={selectedEmails.has(sender.email)}
                      onToggleSelect={(email, shiftKey, currentIndex) => {
                        if (shiftKey && lastCheckedEmail) {
                          const emails = sortedAndPaginatedData.items;
                          const lastIndex = emails.findIndex(s => s.email === lastCheckedEmail);
                          const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
                          
                          setSelectedEmails(prev => {
                            const next = new Set(prev);
                            const isAdding = !prev.has(email);
                            
                            for (let i = start; i <= end; i++) {
                              if (isAdding) {
                                next.add(emails[i].email);
                              } else {
                                next.delete(emails[i].email);
                              }
                            }
                            return next;
                          });
                        } else {
                          setSelectedEmails(prev => {
                            const next = new Set(prev);
                            if (next.has(email)) {
                              next.delete(email);
                            } else {
                              next.add(email);
                            }
                            return next;
                          });
                        }
                        setLastCheckedEmail(email);
                      }}
                      copiedEmail={copiedEmail}
                      onCopyQuery={handleCopySearchQuery}
                      onDelete={addToProcessingQueue}
                      index={index}
                      allEmails={sortedAndPaginatedData.items}
                      userEmail={emailCounts?.emailAddress || '0'}
                    />
                  ))}
                </TableBody>
              </Table>
                </div>
              </div>

              {/* Pagination controls */}
              {sortedAndPaginatedData.totalPages > 1 && (
                <div className="mt-4">
              <PaginationControls totalPages={sortedAndPaginatedData.totalPages} />
            </div>
              )}
        </Card>
          </div>
      )}
      </div>
    </div>
  );
} 