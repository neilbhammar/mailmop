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
import { Settings, Download, RefreshCw, ChevronDown, Search, ArrowUpDown, StopCircle, Copy, Check, Group, Mail, Trash2, ArrowRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

// Local storage keys
const CACHE_SUMMARY_KEY = 'mailmop_summary';
const CACHE_EMAIL_COUNTS_KEY = 'mailmop_email_counts';

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
}

function getDomainFromEmail(email: string): string {
  return email.split('@')[1] || email;
}

function createGmailSearchQuery(email: string): string {
  return `from:(${email})`;
}

// Add SenderRow component before EmailAnalyzer
const SenderRow = memo(({ 
  sender, 
  isSelected, 
  onToggleSelect, 
  copiedEmail,
  onCopyQuery 
}: { 
  sender: SenderData;
  isSelected: boolean;
  onToggleSelect: (email: string) => void;
  copiedEmail: string | null;
  onCopyQuery: (email: string) => void;
}) => {
  return (
    <TableRow 
      className="group hover:bg-blue-50/50"
      onClick={() => onToggleSelect(sender.email)}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={isSelected}
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
    </TableRow>
  );
});

SenderRow.displayName = 'SenderRow';

export default function EmailAnalyzer({ accessToken, onResetPermissions, onSignOut }: EmailAnalyzerProps) {
  const [emailCounts, setEmailCounts] = useState<EmailCounts>({ messages: null, threads: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 200;
  
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
      // Load cached summary data
      const cachedSummary = localStorage.getItem(CACHE_SUMMARY_KEY);
      if (cachedSummary) {
        try {
          const parsedSummary = JSON.parse(cachedSummary);
          setSenderSummary(parsedSummary);
          currentSummaryRef.current = parsedSummary;
          console.log("Loaded cached summary data");
        } catch (err) {
          console.error('Failed to parse cached summary:', err);
        }
      }

      // Load cached email counts
      const cachedCounts = localStorage.getItem(CACHE_EMAIL_COUNTS_KEY);
      if (cachedCounts) {
        try {
          setEmailCounts(JSON.parse(cachedCounts));
          setLoading(false);
          console.log("Loaded cached email counts");
          setDebugInfo({stage: 'loaded_from_cache'});
        } catch (err) {
          console.error('Failed to parse cached email counts:', err);
          fetchEmailCounts(); // Fetch fresh data if cache parsing fails
        }
      } else {
        console.log("No cached data, fetching email counts");
        fetchEmailCounts(); // Fetch fresh data if no cache exists
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

  // Fetch email counts from the API
  async function fetchEmailCounts() {
    try {
      setLoading(true);
      setDebugInfo({stage: 'fetching_email_counts'});
      console.log("Fetching email counts with token:", accessToken ? "present" : "missing");
      
      const counts = await getEmailCounts(accessToken);
      console.log("Email counts fetched:", counts);
      
      setEmailCounts(counts);
      setDebugInfo({stage: 'email_counts_fetched', data: counts});
      
      // Cache the email counts
      localStorage.setItem(CACHE_EMAIL_COUNTS_KEY, JSON.stringify(counts));
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
    // Merge the new batch data with the current summary
    const updatedSummary = { ...currentSummaryRef.current };
    
    // Add or update each sender from the new batch
    Object.entries(newBatchData).forEach(([email, data]) => {
      if (updatedSummary[email]) {
        updatedSummary[email].count += data.count;
      } else {
        updatedSummary[email] = { ...data };
      }
    });
    
    // Update the state and ref
    setSenderSummary(updatedSummary);
    currentSummaryRef.current = updatedSummary;
    
    // Cache the updated summary
    localStorage.setItem(CACHE_SUMMARY_KEY, JSON.stringify(updatedSummary));
    
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
      
      // Start tracking processing rate
      startProcessingRateCalculation();
      setAnalysisTimestamp(new Date());
      
      // Start processing emails
      const summary = await processEmails(
        accessToken,
        processingOptions,
        (progressUpdate) => {
          setProgress(progressUpdate);
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
          batchSize: 75,  // Process 100 emails at a time
          delayBetweenBatches: 2500,  // Wait 2 seconds between batches
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
    const senders = Object.entries(senderSummary).map(([email, data]) => ({
      email,
      name: data.name,
      count: data.count,
      domain: getDomainFromEmail(email)
    }));
    
    // Apply filter
    const filteredSenders = filterText
      ? senders.filter(sender => 
          sender.email.toLowerCase().includes(filterText.toLowerCase()) ||
          sender.name.toLowerCase().includes(filterText.toLowerCase())
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
        const aValue = a[key].toLowerCase();
        const bValue = b[key].toLowerCase();
        
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
    <div className="container mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Debug info */}
      {/* <div className="text-xs text-muted-foreground mb-2">
        Debug: {debugInfo.stage} | Token: {accessToken ? "present" : "missing"}
      </div> */}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="flex flex-col items-start gap-0">
          <div className="w-40 h-22 cursor-pointer" onClick={onSignOut}>
            <img src="/images/logo.png" alt="MailMop Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:border-blue-200 transition-all">
                <Settings className="h-4 w-4 mr-2" />
                Settings
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onResetPermissions} className="text-muted-foreground">
                Reset Permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Separator className="bg-gradient-to-r from-blue-100 to-transparent" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="border-blue-100 hover:border-blue-200 transition-all">
            <CardHeader className="pb-4">
              <CardTitle className="text-blue-900">Account Summary</CardTitle>
              <CardDescription>Overview of your Gmail account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {emailCounts.emailAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium text-blue-700">{emailCounts.emailAddress}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Emails:</span>
                <span className="font-medium text-blue-700">{emailCounts.messages?.toLocaleString() || 'Unknown'}</span>
              </div>
              {emailCounts.threads !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Conversations:</span>
                  <span className="font-medium text-blue-700">{emailCounts.threads.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full hover:bg-blue-50 hover:border-blue-200 transition-all">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-blue-100 hover:border-blue-200 transition-all">
            <CardHeader className="pb-4">
              <CardTitle className="text-blue-900">Email Processing Options</CardTitle>
              <CardDescription>Configure how emails are analyzed</CardDescription>
            </CardHeader>
            <div className="flex flex-col h-[calc(100%-theme(spacing.14))]">
              <CardContent className="flex-1 space-y-4 pb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="exclude-sent" 
                    checked={processingOptions.excludeSentByMe}
                    onCheckedChange={() => handleOptionChange('excludeSentByMe')}
                    className="border-blue-200 data-[state=checked]:bg-blue-600"
                  />
                  <label
                    htmlFor="exclude-sent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Exclude emails sent by me
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="only-unsubscribe" 
                    checked={processingOptions.onlyUnsubscribe}
                    onCheckedChange={() => handleOptionChange('onlyUnsubscribe')}
                    className="border-blue-200 data-[state=checked]:bg-blue-600"
                  />
                  <label
                    htmlFor="only-unsubscribe"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Only include emails with "unsubscribe"
                  </label>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                {progress.status === 'processing' || progress.status === 'stopping' ? (
                  <div className="space-y-4 w-full">
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium text-blue-700">{progress.processed.toLocaleString()}</span> emails processed
                        {progress.status === 'processing' && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Please do not close this tab until processing is complete)
                          </span>
                        )}
                      </div>
                      
                      {processingRate && (
                        <div className="text-xs text-muted-foreground">
                          {processingRate.toFixed(1)} emails/sec
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full bg-blue-50 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full animate-pulse"
                        style={{ width: '100%' }}
                      ></div>
                    </div>
                    
                    {formatEstimatedTimeRemaining() && (
                      <div className="text-xs text-muted-foreground text-center">
                        {formatEstimatedTimeRemaining()}
                      </div>
                    )}
                    
                    <Button 
                      variant="destructive"
                      onClick={handleStopProcessing}
                      disabled={progress.status === 'stopping'}
                      className="w-full"
                    >
                      <StopCircle className="h-4 w-4 mr-2" />
                      {progress.status === 'stopping' ? 'Stopping...' : 'Stop Processing'}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleProcessEmails}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg hover:shadow-blue-200/50"
                  >
                    Analyze Emails
                  </Button>
                )}
              </CardFooter>
            </div>
          </Card>
        </div>

        <Card className="border-blue-100 hover:border-blue-200 transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-semibold">How it Works</h2>
              <a 
                href="https://www.youtube.com/watch?v=IfTeb3zfTL4" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-sm text-blue-500 hover:text-blue-700"
              >
                (watch video)
              </a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative overflow-hidden flex flex-col min-h-[400px]">
              <div 
                className="flex-1 flex transition-transform duration-500 ease-in-out"
                style={getCarouselStyle()}
              >
                <div className="w-full flex-shrink-0 p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 shadow-lg">1</span>
                    <div>
                      <h4 className="font-medium mb-1 text-blue-900">Identify</h4>
                      <p className="text-sm text-muted-foreground">MailMop identifies the senders who are cluttering your inbox most</p>
                    </div>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-white rounded-lg flex items-center justify-center border border-blue-100 shadow-lg">
                    <div className="w-full h-full rounded-lg overflow-hidden">
                      <img 
                        src="/gifs/identify.gif" 
                        alt="Identify step demonstration"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-full flex-shrink-0 p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 shadow-lg">2</span>
                    <div>
                      <h4 className="font-medium mb-1 text-blue-900">Search</h4>
                      <p className="text-sm text-muted-foreground">Copy and paste the search query to find all emails from a sender</p>
                    </div>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-white rounded-lg flex items-center justify-center border border-blue-100 shadow-lg">
                    <div className="w-full h-full rounded-lg overflow-hidden">
                      <img 
                        src="/gifs/search.gif" 
                        alt="Search step demonstration"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-full flex-shrink-0 p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 shadow-lg">3</span>
                    <div>
                      <h4 className="font-medium mb-1 text-blue-900">Clean Up</h4>
                      <p className="text-sm text-muted-foreground">Delete or archive all emails from that sender and repeat the process</p>
                    </div>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-white rounded-lg flex items-center justify-center border border-blue-100 shadow-lg">
                    <div className="w-full h-full rounded-lg overflow-hidden">
                      <img 
                        src="/gifs/cleanup.gif" 
                        alt="Clean up step demonstration"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-2 left-0 right-0 flex justify-center gap-2">
                {[0, 1, 2].map((step) => (
                  <button
                    key={step}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      currentStep === step 
                        ? 'bg-blue-600 shadow-sm' 
                        : 'bg-blue-100 hover:bg-blue-200'
                    }`}
                    onClick={() => setCurrentStep(step)}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(senderSummary).length > 0 && (
        <Card className="border-blue-100 hover:border-blue-200 transition-all">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="mb-1 text-blue-900">Sender Analysis</CardTitle>
                <CardDescription>
                  <span className="font-medium text-blue-700">{Object.keys(senderSummary).length.toLocaleString()} Senders</span>
                  {analysisTimestamp && ` • Run at ${formatTimestamp(analysisTimestamp)}`}
                  {` • ${getFilterDescription()}`}
                  {totalEmailsProcessed > 0 && ` • ${totalEmailsProcessed.toLocaleString()} emails analyzed`}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter senders..."
                    className="pl-8 h-9 w-full sm:w-[200px] rounded-md border border-blue-100 bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 hover:border-blue-200"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="hover:bg-blue-50 hover:border-blue-200 transition-all">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-blue-50/50">
                    <TableHead className="w-[50px]">
                      {selectedEmails.size > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const query = `{from:(${Array.from(selectedEmails).join(' OR ')})}`; 
                                  navigator.clipboard.writeText(query);
                                  toast({
                                    title: "Copied Search Query",
                                    description: `Search query for ${selectedEmails.size} senders copied to clipboard`,
                                  });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy search query for {selectedEmails.size} selected senders</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="h-8 w-8" />
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap w-[250px] hover:text-blue-700"
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
                      className="cursor-pointer whitespace-nowrap hover:text-blue-700"
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
                      className="cursor-pointer text-right whitespace-nowrap w-[100px] hover:text-blue-700"
                      onClick={() => handleSort('count')}
                    >
                      <div className="flex items-center justify-end">
                        Count
                        {sortConfig.key === 'count' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndPaginatedData.items.map((sender: SenderData) => (
                    <SenderRow
                      key={sender.email}
                      sender={sender}
                      isSelected={selectedEmails.has(sender.email)}
                      onToggleSelect={(email) => {
                        setSelectedEmails(prev => {
                          const next = new Set(prev);
                          if (next.has(email)) {
                            next.delete(email);
                          } else {
                            next.add(email);
                          }
                          return next;
                        });
                      }}
                      copiedEmail={copiedEmail}
                      onCopyQuery={handleCopySearchQuery}
                    />
                  ))}
                  {sortedAndPaginatedData.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No results found. Try adjusting your filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <PaginationControls totalPages={sortedAndPaginatedData.totalPages} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 