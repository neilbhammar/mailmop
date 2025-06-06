"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Mail, Plus, PlusCircle, Tag, X, Loader2, ChevronRight, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchLabels, getStoredLabels } from "@/lib/gmail/fetchLabels"
import { createSimpleLabel } from "@/lib/gmail/createLabel"
import { getAccessToken as libGetAccessToken } from '@/lib/gmail/token'
import { GmailLabel, TokenStatus } from "@/types/gmail"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

// Add new imports for hooks
import { useModifyLabel } from "@/hooks/useModifyLabel"
import { useQueue } from "@/hooks/useQueue"
import { estimateRuntimeMs } from "@/lib/utils/estimateRuntime"

// Import for reauth dialog
import { ReauthDialog } from '@/components/modals/ReauthDialog';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'; // Import the hook

// Import validation utility
import { validateLabelName } from '@/lib/utils/inputValidation'

interface ApplyLabelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  senderCount: number
  emailCount: number
  senders?: string[]
  emailCountMap?: Record<string, number>
  onConfirm?: (options: { 
    actionType: 'add' | 'remove'
    labelIds: string[]
    labelNames: string[]
    createNewLabels: string[]
    applyToFuture: boolean 
  }) => Promise<void>
}

type SelectedLabel = {
  id: string;
  name: string;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
  isNew?: boolean;
};

// ReauthModalState - can be defined here or imported if global
interface ReauthModalState {
  isOpen: boolean;
  type: 'expired' | 'will_expire_during_operation';
  eta?: string;
}

// Label sections for organization
type LabelSection = {
  title: string;
  type: 'system' | 'user';
  expanded: boolean;
};

// Labels to exclude from options
const EXCLUDED_LABELS = ["CHAT", "DRAFT", "SENT"];

export function ApplyLabelModal({
  open,
  onOpenChange,
  senderCount,
  emailCount,
  senders = [],
  emailCountMap = {},
  onConfirm,
}: ApplyLabelModalProps) {
  // Add hooks
  const { startModifyLabel, progress: modifyProgress } = useModifyLabel()
  const { enqueue } = useQueue()
  
  // Get GmailPermissions context
  const { getAccessToken, tokenStatus } = useGmailPermissions();

  // State for the modal controls
  const [actionType, setActionType] = useState<'add' | 'remove'>('add')
  const [selectedLabels, setSelectedLabels] = useState<SelectedLabel[]>([])
  const [applyToFuture, setApplyToFuture] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [availableLabels, setAvailableLabels] = useState<GmailLabel[]>([])
  const [isLoadingLabels, setIsLoadingLabels] = useState(false)
  const [isCreatingLabel, setIsCreatingLabel] = useState(false)
  const [labelSections, setLabelSections] = useState<LabelSection[]>([
    { title: 'System Labels', type: 'system', expanded: true },
    { title: 'User Labels', type: 'user', expanded: true }
  ])
  const [inputFocused, setInputFocused] = useState(false)
  
  // State for reauth modal
  const [reauthModal, setReauthModal] = useState<ReauthModalState>({
    isOpen: false,
    type: 'expired',
  });

  // Ref for the input field and container
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch labels when the modal opens
  useEffect(() => {
    if (open) {
      fetchGmailLabels();
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setActionType('add')
      setSelectedLabels([])
      setApplyToFuture(false)
      setIsProcessing(false)
      setSearchValue("")
      setInputFocused(false)
      // Close reauth modal if it was open
      setReauthModal(prev => ({ ...prev, isOpen: false }));
    }
  }, [open])
  
  // Handle clicks outside the container to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setInputFocused(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to fetch Gmail labels
  const fetchGmailLabels = async () => {
    setIsLoadingLabels(true);
    
    try {
      // Check for cached labels first
      const cachedLabels = getStoredLabels();
      if (cachedLabels && cachedLabels.length > 0) {
        setAvailableLabels(cachedLabels);
      }
      
      // Get token
      let accessTokenForFetch: string | null = null;
      try {
        accessTokenForFetch = await getAccessToken();
      } catch (error) {
        console.error("Error getting access token for fetching labels:", error);
        toast.error("Gmail authentication failed. Please reconnect.");
        setReauthModal({ isOpen: true, type: 'expired' });
        setIsLoadingLabels(false); // Ensure loading state is reset
        return;
      }

      if (!accessTokenForFetch) { // Should be redundant if getAccessToken throws on failure
        toast.error("Your Gmail session has expired. Please reconnect.");
        setReauthModal({ isOpen: true, type: 'expired' });
        setIsLoadingLabels(false);
        return;
      }
      
      // Fetch fresh labels
      const labels = await fetchLabels(accessTokenForFetch);
      setAvailableLabels(labels);
    } catch (error) {
      console.error("Error fetching labels:", error);
      toast.error("Failed to load labels. Please try again.");
    } finally {
      setIsLoadingLabels(false);
    }
  };

  // Toggle section expanded state
  const toggleSectionExpanded = (sectionType: 'system' | 'user') => {
    setLabelSections(prev => 
      prev.map(section => 
        section.type === sectionType 
          ? { ...section, expanded: !section.expanded } 
          : section
      )
    );
  };

  // Handle confirmation
  const handleConfirm = async () => {
    if (selectedLabels.length === 0) return
    
    setIsProcessing(true)
    try {
      if (onConfirm) {
        // Legacy path - use provided onConfirm function
        const newLabels = selectedLabels.filter(label => label.isNew).map(label => label.name)
        await onConfirm({
          actionType,
          labelIds: selectedLabels.map(label => label.id),
          labelNames: selectedLabels.map(label => label.name),
          createNewLabels: newLabels,
          applyToFuture
        })
      } else {
        // Queue path - use queue system
        console.log('[ApplyLabelModal] Using queue system for label modification');
        
        // Prepare the sender data for the queue
        const sendersToModify = senders.map(email => ({
          email,
          emailCount: emailCountMap[email] || 0
        }));

        // Calculate initial ETA for stable display
        const totalEmailCount = sendersToModify.reduce((sum, sender) => sum + sender.emailCount, 0);
        const initialEtaMs = estimateRuntimeMs({
          operationType: 'mark', // Label modification is similar to mark
          emailCount: totalEmailCount,
          mode: 'single'
        });

        // Add label modification job to queue
        enqueue('modifyLabel', {
          senders: sendersToModify,
          labelIds: selectedLabels.map(label => label.id),
          actionType,
          initialEtaMs
        });

        // If apply to future is checked, create the filter
        if (applyToFuture) {
          // Calculate initial ETA for filter creation (quick operation)
          const filterEtaMs = estimateRuntimeMs({
            operationType: 'mark', // Similar complexity to marking
            emailCount: 1, // Filter creation is a single operation
            mode: 'single'
          });

          // Add filter creation job to queue
          enqueue('createFilter', {
            senders: senders,
            labelIds: selectedLabels.map(label => label.id),
            actionType,
            initialEtaMs: filterEtaMs
          });
        }
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Error applying labels:", error)
      toast.error("Failed to apply labels. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle search input changes - no sanitization needed for client-side search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
  };

  // Create a new label with validation
  const handleCreateLabel = async () => {
    if (!searchValue.trim()) return;
    
    // Validate the label name before creating
    const validation = validateLabelName(searchValue.trim());
    
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid label name');
      // Update search value to the sanitized version
      setSearchValue(validation.sanitized);
      return;
    }
    
    setIsCreatingLabel(true);
    try {
      // Get token
      let accessTokenForCreate: string | null = null;
      try {
        accessTokenForCreate = await getAccessToken();
      } catch (error) {
        console.error("Error getting access token for creating label:", error);
        toast.error("Gmail authentication failed. Please reconnect.");
        setReauthModal({ isOpen: true, type: 'expired' });
        setIsCreatingLabel(false); // Ensure loading state is reset
        return;
      }

      if (!accessTokenForCreate) { // Should be redundant
        toast.error("Your Gmail session has expired. Please reconnect.");
        setReauthModal({ isOpen: true, type: 'expired' });
        setIsCreatingLabel(false);
        return;
      }
      
      // Create the label using the validated/sanitized name
      const newLabel = await createSimpleLabel(accessTokenForCreate, validation.sanitized);
      
      if (newLabel) {
        // Add to available labels
        setAvailableLabels(prev => [...prev, newLabel]);
        
        // Add to selected labels
        setSelectedLabels(prev => [...prev, {
          id: newLabel.id,
          name: newLabel.name,
          color: newLabel.color
        }]);
        
        toast.success(`Label "${validation.sanitized}" created successfully`);
      } else {
        // If null is returned, the label already exists but wasn't in our list
        // Refresh the labels to get the existing one
        await fetchGmailLabels();
        
        // Find the label in the refreshed list
        const existingLabel = getStoredLabels()?.find(
          label => label.name.toLowerCase() === validation.sanitized.toLowerCase()
        );
        
        if (existingLabel) {
          setSelectedLabels(prev => [...prev, {
            id: existingLabel.id,
            name: existingLabel.name,
            color: existingLabel.color
          }]);
          
          toast.info(`Label "${validation.sanitized}" already exists and has been selected`);
        } else {
          toast.error(`Failed to create or find label "${validation.sanitized}"`);
        }
      }
      
      // Clear the search
      setSearchValue("");
    } catch (error) {
      console.error("Error creating label:", error);
      toast.error(`Failed to create label "${validation.sanitized}". Please try again.`);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  // Group labels by their type (system or user)
  const groupedLabels = useMemo(() => {
    const systemLabels: GmailLabel[] = [];
    const userLabels: GmailLabel[] = [];

    availableLabels.forEach(label => {
      // Skip excluded labels
      if (EXCLUDED_LABELS.includes(label.id)) {
        return;
      }
      
      if (label.type === 'system') {
        systemLabels.push(label);
      } else {
        userLabels.push(label);
      }
    });

    return {
      system: systemLabels,
      user: userLabels
    };
  }, [availableLabels]);

  // Filter labels based on search and selection
  const getFilteredLabels = (type: 'system' | 'user') => {
    return (type === 'system' ? groupedLabels.system : groupedLabels.user).filter(label => {
      // Filter by search value
      const matchesSearch = label.name.toLowerCase().includes(searchValue.toLowerCase());
      // Don't show labels that are already selected
      const notSelected = !selectedLabels.some(selected => selected.id === label.id);
      // Don't show system labels when removing (unless it's explicitly a system label section)
      const isAllowedForAction = actionType === 'add' || type === 'user' || (type === 'system' && label.type === 'system');
      
      return matchesSearch && notSelected && isAllowedForAction;
    });
  };

  const showCreateOption = searchValue && !availableLabels.some(
    label => label.name.toLowerCase() === searchValue.toLowerCase()
  ) && !selectedLabels.some(label => 
    label.name.toLowerCase() === searchValue.toLowerCase()
  );

  const handleAddLabel = (label: GmailLabel) => {
    setSelectedLabels(prev => [...prev, {
      id: label.id,
      name: label.name,
      color: label.color
    }]);
    setSearchValue(""); 
    
    // Focus the input to continue adding labels
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  const handleRemoveLabel = (labelId: string) => {
    setSelectedLabels(prev => prev.filter(label => label.id !== labelId));
  }

  // Get email count for a sender
  const getEmailCountForSender = (sender: string): number => {
    return emailCountMap[sender] || 0;
  }
  
  // Sort senders by email count (highest first)
  const sortedSenders = [...senders].sort((a, b) => {
    const countA = getEmailCountForSender(a);
    const countB = getEmailCountForSender(b);
    return countB - countA;
  });
  
  // Handle key presses in the input field
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Create new label on Enter if text exists
    if (e.key === 'Enter' && searchValue.trim()) {
      e.preventDefault();
      
      // Check if label exists to select it
      const existingLabel = availableLabels.find(
        label => label.name.toLowerCase() === searchValue.toLowerCase()
      );
      
      if (existingLabel) {
        handleAddLabel(existingLabel);
      } else if (showCreateOption) {
        handleCreateLabel();
      }
    }
    
    // Remove last label on Backspace if input is empty
    if (e.key === 'Backspace' && !searchValue && selectedLabels.length > 0) {
      handleRemoveLabel(selectedLabels[selectedLabels.length - 1].id);
    }
    
    // Close dropdown on Escape
    if (e.key === 'Escape') {
      setInputFocused(false);
    }
  };

  // Helper to get label color display
  const getLabelColor = (label: SelectedLabel) => {
    if (label.color) {
      return label.color.backgroundColor;
    }
    // Default color if none specified
    return "#a78bfa";
  };

  // Find a system label section
  const systemSection = labelSections.find(s => s.type === 'system');
  // Find a user label section
  const userSection = labelSections.find(s => s.type === 'user');

  // Callback to close reauth modal
  const closeReauthModal = () => {
    setReauthModal(prev => ({ ...prev, isOpen: false }));
    // Optionally, re-attempt the action that failed, or prompt user to retry manually
    // For simplicity, here we just close it. The user might need to retry the operation.
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900 shadow-lg dark:border dark:border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Tag className="h-4 w-4 text-purple-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-lg font-semibold dark:text-slate-100">
              {actionType === 'add' ? 'Apply Labels' : 'Remove Labels'}
            </DialogTitle>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            This will affect emails from {senderCount} {senderCount === 1 ? 'sender' : 'senders'}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Selected Senders - Moved to top */}
          {senders && senders.length > 0 && (
            <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="p-2.5 border-b dark:border-b-slate-600 bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Selected Senders</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{senderCount} {senderCount === 1 ? 'sender' : 'senders'}</span>
                </div>
              </div>
              <div className="max-h-[100px] overflow-y-auto p-2.5 bg-white dark:bg-slate-800">
                <div className="space-y-1.5">
                  {sortedSenders.map(sender => {
                    const emailCount = getEmailCountForSender(sender);
                    return (
                      <div 
                        key={sender} 
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex flex-col flex-1 min-w-0 mr-4">
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{sender}</span>
                        </div>
                        {emailCount > 0 && (
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                            {emailCount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Label Selection Area */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Select Labels
            </label>
            
            <div className="flex gap-2 items-start">
              {/* Action Type Selector */}
              <Select 
                value={actionType} 
                onValueChange={(value: 'add' | 'remove') => setActionType(value)}
              >
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 dark:text-slate-300">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 dark:border-slate-600">
                  <SelectItem value="add" className="dark:text-slate-300 dark:hover:bg-slate-700">Add labels</SelectItem>
                  <SelectItem value="remove" className="dark:text-slate-300 dark:hover:bg-slate-700">Remove labels</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Label Input & Selection Area */}
              <div 
                ref={containerRef} 
                className="flex-1 relative"
              >
                {/* Input Field */}
                <div className="relative flex min-h-[36px] rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm dark:focus-within:border-blue-500">
                  <div className="flex flex-wrap gap-1 p-1.5 items-center w-full">
                    {/* Selected Labels */}
                    {selectedLabels.map(label => (
                      <div 
                        key={label.id}
                        className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-md pl-1.5 pr-0.5 py-0.5 text-sm"
                      >
                        <div 
                          className="h-2.5 w-2.5 rounded-full"
                          style={{backgroundColor: getLabelColor(label)}}
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">{label.name}</span>
                        <button
                          type="button"
                          className="h-4 w-4 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-600"
                          onClick={() => handleRemoveLabel(label.id)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="flex items-center flex-1 min-w-[80px]">
                      {searchValue.length === 0 && selectedLabels.length === 0 && (
                        <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 mr-1.5" />
                      )}
                      <input
                        ref={inputRef}
                        type="text"
                        value={searchValue}
                        onChange={handleSearchChange}
                        onFocus={() => setInputFocused(true)}
                        onKeyDown={handleInputKeyDown}
                        className="flex-1 bg-transparent outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50 p-0 text-sm"
                        placeholder={selectedLabels.length ? "Add more labels..." : "Type to search or create labels..."}
                        disabled={isLoadingLabels || isCreatingLabel}
                      />
                      
                      {/* Loading indicator */}
                      {(isLoadingLabels || isCreatingLabel) && (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400 dark:text-slate-500 ml-1" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Label Dropdown - Only visible when input is focused */}
                {inputFocused && (
                  <div className="absolute left-0 right-0 mt-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 shadow-md z-50">
                    {isLoadingLabels ? (
                      <div className="py-3 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-400 dark:text-slate-500" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Loading labels...</p>
                      </div>
                    ) : (
                      <Command className="bg-white dark:bg-slate-800">
                        <ScrollArea className="h-[180px]">
                          {/* Empty State */}
                          {getFilteredLabels('user').length === 0 && getFilteredLabels('system').length === 0 && !showCreateOption && (
                            <div className="py-3 text-center text-sm text-slate-500 dark:text-slate-400">
                              {searchValue 
                                ? 'No matching labels found.'
                                : 'Type to search for labels.'}
                            </div>
                          )}
                          
                          {/* User Labels Section */}
                          {getFilteredLabels('user').length > 0 && userSection && (
                            <>
                              <div 
                                className="flex items-center px-2 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 mt-1"
                                onClick={() => toggleSectionExpanded('user')}
                              >
                                {userSection.expanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 mr-1 text-slate-500 dark:text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 mr-1 text-slate-500 dark:text-slate-400" />
                                )}
                                <span>User Labels ({getFilteredLabels('user').length})</span>
                              </div>
                              
                              {userSection.expanded && (
                                <CommandGroup className="pt-0">
                                  {getFilteredLabels('user').map((label) => (
                                    <CommandItem
                                      key={label.id}
                                      value={label.name}
                                      onSelect={() => handleAddLabel(label)}
                                      className="py-2 bg-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                                    >
                                      <div className="flex items-center">
                                        <div 
                                          className="h-3 w-3 rounded-full mr-2"
                                          style={{backgroundColor: label.color?.backgroundColor || '#a78bfa'}}
                                        />
                                        <span className="dark:text-slate-200">{label.name}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </>
                          )}
                          
                          {/* System Labels Section */}
                          {getFilteredLabels('system').length > 0 && systemSection && (
                            <>
                              <div 
                                className="flex items-center px-2 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 mt-1"
                                onClick={() => toggleSectionExpanded('system')}
                              >
                                {systemSection.expanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 mr-1 text-slate-500 dark:text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 mr-1 text-slate-500 dark:text-slate-400" />
                                )}
                                <span>System Labels ({getFilteredLabels('system').length})</span>
                              </div>
                              
                              {systemSection.expanded && (
                                <CommandGroup className="pt-0">
                                  {getFilteredLabels('system').map((label) => (
                                    <CommandItem
                                      key={label.id}
                                      value={label.name}
                                      onSelect={() => handleAddLabel(label)}
                                      className="py-2 bg-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                                    >
                                      <div className="flex items-center">
                                        <div 
                                          className="h-3 w-3 rounded-full mr-2"
                                          style={{backgroundColor: label.color?.backgroundColor || '#cbd5e1'}}
                                        />
                                        <span className="dark:text-slate-200">{label.name}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </>
                          )}
                          
                          {/* Create Label Option */}
                          {showCreateOption && !isCreatingLabel && searchValue && (
                            <CommandItem
                              value={`create-${searchValue}`}
                              onSelect={handleCreateLabel}
                              className="py-2 mt-1 text-purple-600 dark:text-blue-400 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              <span>Create new label: <strong className="dark:text-blue-300">{searchValue}</strong></span>
                            </CommandItem>
                          )}
                        </ScrollArea>
                      </Command>
                    )}
                  </div>
                )}
                
                {showCreateOption && !isCreatingLabel && (
                  <p className="text-xs text-purple-600 dark:text-blue-400 mt-1">
                    Press Enter to create "{searchValue}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Future Apply Option */}
          <div className="flex items-start space-x-2 py-1">
            <div className="flex h-5 items-center">
              <Checkbox 
                id="apply-future" 
                checked={applyToFuture} 
                onCheckedChange={(checked) => setApplyToFuture(checked as boolean)}
                className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500 border-slate-300 dark:border-slate-600"
              />
            </div>
            <div>
              <Label 
                htmlFor="apply-future" 
                className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight cursor-pointer"
              >
                Also {actionType === 'add' ? 'apply' : 'remove'} for future emails
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Creates a Gmail filter to {actionType === 'add' ? 'add' : 'remove'} these labels for incoming emails
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-end gap-2 pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600 border-slate-200"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className={cn(
              actionType === 'add' ? "bg-purple-600 hover:bg-purple-700 dark:bg-blue-600 dark:hover:bg-blue-500" : "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 dark:text-red-100",
              "text-white dark:text-white"
            )}
            disabled={selectedLabels.length === 0 || isProcessing || isLoadingLabels || isCreatingLabel}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>{onConfirm ? 'Processing...' : 'Adding to Queue...'}</span>
              </div>
            ) : (
              <span>{actionType === 'add' ? 'Apply Labels' : 'Remove Labels'}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      {/* Add ReauthDialog to the modal */}
      <ReauthDialog
        open={reauthModal.isOpen}
        onOpenChange={(isOpen) => setReauthModal(prev => ({ ...prev, isOpen }))}
        type={reauthModal.type}
        eta={reauthModal.eta}
      />
    </Dialog>
  )
} 