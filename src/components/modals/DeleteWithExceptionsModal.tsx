"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { 
  X, 
  Search, 
  Mail, 
  MailOpen, 
  Star, 
  Clock, 
  CalendarRange, 
  Calendar as CalendarIcon, 
  Paperclip, 
  PlusCircle, 
  Trash2, 
  Info,
  FilterX,
  Check,
  ChevronDown,
  Text,
  MessageCircleMore,
  FileText,
  Plus,
  SlashIcon,
  SlidersHorizontal,
  Zap
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useViewInGmail } from '@/hooks/useViewInGmail'
import { useQueue } from "@/hooks/useQueue"
import { estimateRuntimeMs } from "@/lib/utils/estimateRuntime"
import { buildQuery } from "@/lib/gmail/buildQuery"
import { validateFilterConditionValue, validateDateInput } from '@/lib/utils/inputValidation'
import { toast } from "sonner"

// Operator types
type Operator = 'and' | 'or';

// Condition types
type ConditionType = 
  | 'contains' 
  | 'not-contains'
  | 'date-after' 
  | 'date-before'
  | 'is-unread'
  | 'is-read'
  | 'has-attachment'
  | 'no-attachment';

// Search location
type SearchLocation = 'anywhere' | 'subject' | 'body';

// Condition definition
interface Condition {
  id: string;
  type: ConditionType;
  value: string | Date | null;
  isValid: boolean;
}

// Rule group - uses AND/OR logic between conditions
interface RuleGroup {
  id: string;
  operator: Operator;
  conditions: Condition[];
}

interface DeleteWithExceptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailCount: number;
  senderCount: number;
  onConfirm?: (ruleGroups: RuleGroup[]) => Promise<void>;
  senders?: string[];
  emailCountMap?: Record<string, number>;
}

// Helper to generate a new condition
const createCondition = (type: ConditionType = 'contains', value: string | Date | null = ''): Condition => ({
  id: crypto.randomUUID(),
  type,
  value,
  isValid: 
    type === 'is-unread' || 
    type === 'is-read' || 
    type === 'has-attachment' || 
    type === 'no-attachment' ||
    (type === 'date-after' || type === 'date-before' ? true : 
    typeof value === 'string' ? value.trim().length > 0 : value !== null)
});

// Create a separate component for date inputs to properly manage hooks
const DateInput = ({ 
  condition, 
  groupId, 
  updateConditionValue 
}: { 
  condition: Condition;
  groupId: string;
  updateConditionValue: (groupId: string, conditionId: string, value: string | Date | null) => void;
}) => {
  const [inputValue, setInputValue] = useState(() => 
    condition.value instanceof Date 
      ? format(condition.value, "MM/dd/yyyy")
      : ""
  );
  
  // Update local state when condition.value changes
  useEffect(() => {
    if (condition.value instanceof Date) {
      setInputValue(format(condition.value, "MM/dd/yyyy"));
    } else if (condition.value === null || condition.value === undefined) {
      setInputValue("");
    }
  }, [condition.value]);
  
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="relative flex-1 min-w-[180px]">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <CalendarIcon className="h-4 w-4 text-gray-400 dark:text-slate-400" />
        </div>
        <Input
          type="text"
          placeholder={condition.type === 'date-after' ? "Date after (MM/DD/YYYY)" : "Date before (MM/DD/YYYY)"}
          className="pl-9 pr-3 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:placeholder-slate-500"
          value={inputValue}
          onChange={(e) => {
            const dateStr = e.target.value;
            // Always update the local state first
            setInputValue(dateStr);
            
            // Handle empty case
            if (!dateStr.trim()) {
              updateConditionValue(groupId, condition.id, null);
              return;
            }
            
            // Try to parse the date in MM/DD/YYYY format
            const dateParts = dateStr.split(/[\/\-\.]/);
            
            if (dateParts.length === 3) {
              const month = parseInt(dateParts[0]) - 1; // 0-indexed month
              const day = parseInt(dateParts[1]);
              const year = parseInt(dateParts[2]);
              
              if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                const date = new Date(year, month, day);
                
                // Validate the date makes sense (handles invalid dates like 02/31/2023)
                if (date.getMonth() === month && date.getDate() === day && date.getFullYear() === year) {
                  updateConditionValue(groupId, condition.id, date);
                  return;
                }
              }
            }
            
            // If we get here, it's not a valid date yet - just update with string
            updateConditionValue(groupId, condition.id, dateStr);
          }}
        />
      </div>
    </div>
  );
};

export function DeleteWithExceptionsModal({
  open,
  onOpenChange,
  emailCount,
  senderCount,
  onConfirm,
  senders = [],
  emailCountMap = {}
}: DeleteWithExceptionsModalProps) {
  const { viewFilteredEmailsInGmail } = useViewInGmail();
  const { enqueue } = useQueue();

  // Date presets for quick filters
  const datePresets = [
    { name: 'Older than 1 year', months: 12 }
  ];

  // Rule groups - we maintain a single state for all filters
  const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([
    { 
      id: crypto.randomUUID(), 
      operator: 'and', 
      conditions: []
    }
  ]);
  
  // Selected filters for simplified UI
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  // Keyword filter state
  const [keywordFilter, setKeywordFilter] = useState({
    text: "",
    isExclude: false
  });
  
  // Advanced mode toggle
  const [advancedMode, setAdvancedMode] = useState(false);
  
  // Is deleting state
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Format sender info
  const senderDisplay = senderCount === 1 
    ? senders[0]
    : `${senderCount} senders`;
  
  // Filter expression is valid if we have any valid conditions
  const hasValidFilters = ruleGroups.some(group => 
    group.conditions.some(c => c.isValid)
  );
  
  // For input refs
  const keywordInputRef = useRef<HTMLInputElement>(null);
  
  // Add mode change tracking
  const [isChangingMode, setIsChangingMode] = useState(false);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Clear state on modal close with a slight delay to prevent flicker
      const timer = setTimeout(() => {
        setSelectedFilters([]);
        setKeywordFilter({
          text: "",
          isExclude: false
        });
        setRuleGroups([{ 
          id: crypto.randomUUID(), 
          operator: 'and', 
          conditions: []
        }]);
        setAdvancedMode(false);
        setIsDeleting(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open]);
  
  // Focus the keyword input when opened
  useEffect(() => {
    if (open && keywordInputRef.current) {
      setTimeout(() => {
        keywordInputRef.current?.focus();
      }, 100);
    }
  }, [open]);
  
  // Remove the separate sync effects and combine them into one
  useEffect(() => {
    if (!open) return;
    
    // If we're in advanced mode, don't auto-sync the rule groups
    if (advancedMode) return;
    
    // Build base conditions that will apply to all groups
    const baseConditions: Condition[] = [];
    
    // Handle date presets and other filters that should apply to all groups
    selectedFilters.forEach(filter => {
      if (filter === 'is-read') {
        baseConditions.push(createCondition('is-read', null));
      }
      else if (filter === 'is-unread') {
        baseConditions.push(createCondition('is-unread', null));
      }
      else if (filter === 'has-attachment') {
        baseConditions.push(createCondition('has-attachment', null));
      }
      else if (filter === 'no-attachment') {
        baseConditions.push(createCondition('no-attachment', null));
      }
      else if (filter.startsWith('older-than-')) {
        const months = parseInt(filter.replace('older-than-', ''));
        if (!isNaN(months)) {
          const date = new Date();
          date.setMonth(date.getMonth() - months);
          baseConditions.push(createCondition('date-before', date));
        }
      }
    });
    
    // Handle keyword filter
    if (keywordFilter.text.trim()) {
      // Split by commas and process each keyword separately
      const keywords = keywordFilter.text
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      if (keywords.length > 0) {
        if (keywordFilter.isExclude) {
          // For "Doesn't contain" - add each keyword as a separate AND condition to base conditions
          keywords.forEach(keyword => {
            baseConditions.push(createCondition('not-contains', keyword));
          });
          
          // Update the first group with all conditions
          setRuleGroups([{
            id: crypto.randomUUID(),
            operator: 'and',
            conditions: baseConditions
          }]);
        } else {
          // For "Contains" - create a separate group for each keyword, including base conditions
          const newGroups: RuleGroup[] = keywords.map(keyword => ({
            id: crypto.randomUUID(),
            operator: 'and',
            conditions: [
              ...baseConditions,
              createCondition('contains', keyword)
            ]
          }));
          
          setRuleGroups(newGroups);
        }
      } else if (baseConditions.length > 0) {
        // If we only have base conditions, update first group
        setRuleGroups([{
          id: crypto.randomUUID(),
          operator: 'and',
          conditions: baseConditions
        }]);
      }
    } else if (baseConditions.length > 0) {
      // If we only have base conditions, update first group
      setRuleGroups([{
        id: crypto.randomUUID(),
        operator: 'and',
        conditions: baseConditions
      }]);
    } else {
      // Reset to empty state in simple mode
      setRuleGroups([{ 
        id: crypto.randomUUID(), 
        operator: 'and', 
        conditions: []
      }]);
    }
  }, [selectedFilters, keywordFilter, open, advancedMode]);
  
  // Handle mode switch
  const handleModeSwitch = () => {
    if (!advancedMode) {
      // Switching to advanced mode - keep current rule groups
      setAdvancedMode(true);
    } else {
      // Switching to simple mode - extract filters from first group
      const firstGroup = ruleGroups[0];
      if (firstGroup) {
        const newSelectedFilters: string[] = [];
        let newKeywordFilter = { text: "", isExclude: false };
        
        firstGroup.conditions.forEach(condition => {
          switch (condition.type) {
            case 'is-read':
              newSelectedFilters.push('is-read');
              break;
            case 'is-unread':
              newSelectedFilters.push('is-unread');
              break;
            case 'has-attachment':
              newSelectedFilters.push('has-attachment');
              break;
            case 'no-attachment':
              newSelectedFilters.push('no-attachment');
              break;
            case 'date-before':
              if (condition.value instanceof Date) {
                const monthsDiff = Math.round(
                  (new Date().getTime() - condition.value.getTime()) / 
                  (30 * 24 * 60 * 60 * 1000)
                );
                if (Math.abs(monthsDiff - 12) <= 2) {
                  newSelectedFilters.push('older-than-12');
                }
              }
              break;
            case 'contains':
            case 'not-contains':
              if (typeof condition.value === 'string') {
                newKeywordFilter = {
                  text: condition.value,
                  isExclude: condition.type === 'not-contains'
                };
              }
              break;
          }
        });
        
        setSelectedFilters(newSelectedFilters);
        setKeywordFilter(newKeywordFilter);
      }
      
      setAdvancedMode(false);
    }
  };

  // Add a new condition to a rule group
  const addCondition = (groupId: string, type: ConditionType = 'contains') => {
    setRuleGroups(prev => 
      prev.map(group => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          conditions: [...group.conditions, createCondition(type)]
        };
      })
    );
  };

  // Add a new rule group
  const addRuleGroup = () => {
    setRuleGroups(prev => [
      ...prev, 
      { 
        id: crypto.randomUUID(), 
        operator: 'and', 
        conditions: [createCondition()]
      }
    ]);
  };

  // Remove a condition from a group
  const removeCondition = (groupId: string, conditionId: string) => {
    setRuleGroups(prev => 
      prev.map(group => {
        if (group.id !== groupId) return group;
        
        // Don't remove if it's the only condition and not the first group
        if (group.conditions.length === 1 && prev.indexOf(group) !== 0) return group;
        
        return {
          ...group,
          conditions: group.conditions.filter(c => c.id !== conditionId)
        };
      })
    );
  };

  // Remove a rule group
  const removeRuleGroup = (groupId: string) => {
    setRuleGroups(prev => {
      // Don't remove the first group
      if (prev.length === 1 || prev[0].id === groupId) return prev;
      return prev.filter(group => group.id !== groupId);
    });
  };

  // Update a condition's type
  const updateConditionType = (groupId: string, conditionId: string, type: ConditionType) => {
    setRuleGroups(prev => 
      prev.map(group => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          conditions: group.conditions.map(condition => {
            if (condition.id !== conditionId) return condition;
            
            // Set appropriate default value based on type
            let value = condition.value;
            
            if (type === 'date-after' || type === 'date-before') {
              value = new Date();
            } else if (type === 'is-unread' || type === 'is-read' || 
                       type === 'has-attachment' || type === 'no-attachment') {
              value = null;
            } else if (typeof value !== 'string') {
              value = '';
            }
            
            return { 
              ...condition, 
              type, 
              value, 
              isValid: type === 'is-unread' || type === 'is-read' || 
                       type === 'has-attachment' || type === 'no-attachment' ||
                       (type === 'date-after' || type === 'date-before') ||
                       (typeof value === 'string' && value.trim().length > 0)
            };
          })
        };
      })
    );
  };

  // Update a condition's value with validation
  const updateConditionValue = (groupId: string, conditionId: string, value: string | Date | null) => {
    setRuleGroups(prev => 
      prev.map(group => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          conditions: group.conditions.map(condition => {
            if (condition.id !== conditionId) return condition;
            
            let finalValue = value;
            let isValid = false;
            
            // Validate based on condition type
            if (condition.type === 'contains' || condition.type === 'not-contains') {
              if (typeof value === 'string') {
                const validation = validateFilterConditionValue(value, condition.type);
                finalValue = validation.sanitized;
                isValid = validation.isValid;
                
                // Show error if validation failed
                if (!validation.isValid && validation.error) {
                  toast.error(`Filter validation: ${validation.error}`);
                }
              }
            } else if (value instanceof Date) {
              isValid = true;
            } else if (value === null) {
              isValid = true;
            } else if (typeof value === 'string') {
              isValid = value.trim().length > 0;
            }
            
            return { ...condition, value: finalValue, isValid };
          })
        };
      })
    );
  };

  // Toggle the operator for a rule group
  const toggleGroupOperator = (groupId: string) => {
    setRuleGroups(prev => 
      prev.map(group => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          operator: group.operator === 'and' ? 'or' : 'and'
        };
      })
    );
  };

  // Toggle a filter in the selection
  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev => {
      if (prev.includes(filterId)) {
        return prev.filter(id => id !== filterId);
      } else {
        return [...prev, filterId];
      }
    });
  };
  
  // Handle confirmation
  const handleConfirm = async () => {
    if (onConfirm) {
      // Legacy path - use provided onConfirm function
      try {
        setIsDeleting(true);
        
        // Get valid rule groups (with at least one valid condition)
        const validGroups = ruleGroups.filter(
          group => group.conditions.some(c => c.isValid)
        );
        
        // If we have no filters, create a "match all" condition
        if (validGroups.length === 0) {
          const defaultGroup: RuleGroup = {
            id: crypto.randomUUID(),
            operator: 'and' as Operator,
            conditions: [{
              id: crypto.randomUUID(),
              type: 'contains' as ConditionType,
              value: '',
              isValid: true
            }]
          };
          
          await onConfirm([defaultGroup]);
        } else {
          await onConfirm(validGroups);
        }
        
        onOpenChange(false);
      } catch (error) {
        console.error("Error during deletion with exceptions:", error);
      } finally {
        setIsDeleting(false);
      }
    } else {
      // New queue path - add job to queue
      try {
        setIsDeleting(true);
        
        // Get valid rule groups (with at least one valid condition)
        const validGroups = ruleGroups.filter(
          group => group.conditions.some(c => c.isValid)
        );
        
        // If we have no filters, create a "match all" condition
        let finalRules = validGroups;
        if (validGroups.length === 0) {
          const defaultGroup: RuleGroup = {
            id: crypto.randomUUID(),
            operator: 'and' as Operator,
            conditions: [{
              id: crypto.randomUUID(),
              type: 'contains' as ConditionType,
              value: '',
              isValid: true
            }]
          };
          finalRules = [defaultGroup];
        }
        
        // Convert senders to the format expected by the queue
        const sendersForQueue = senders.map(email => ({
          email,
          count: emailCountMap[email] || Math.floor(emailCount / senders.length) || 0
        }));
        
        // Calculate initial ETA for stable display
        const initialEtaMs = estimateRuntimeMs({
          operationType: 'delete',
          emailCount,
          mode: 'single'
        });
        
        // Add job to queue
        enqueue('deleteWithExceptions', {
          senders: sendersForQueue,
          filterRules: finalRules,
          initialEtaMs
        });
        
        // Close modal immediately - user can track progress in ProcessQueue
        onOpenChange(false);
      } catch (error) {
        console.error("Error adding delete with exceptions job to queue:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Render a condition input based on its type
  const renderConditionInput = (condition: Condition, groupId: string) => {
    switch (condition.type) {
      case 'contains':
      case 'not-contains':
        return (
          <Input
            value={condition.value as string || ''}
            onChange={(e) => updateConditionValue(groupId, condition.id, e.target.value)}
            placeholder="Enter text..."
            className="flex-1 min-w-[200px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:placeholder-slate-500"
          />
        );
      
      case 'date-after':
      case 'date-before':
        return <DateInput condition={condition} groupId={groupId} updateConditionValue={updateConditionValue} />;
      
      // No input needed for these types
      case 'is-unread':
      case 'is-read':
      case 'has-attachment':
      case 'no-attachment':
      default:
        return null;
    }
  };

  // Generate human-readable filter summary
  const getFilterSummary = (): string => {
    if (!hasValidFilters) return `all ${emailCount} emails`;
    
    // Define a function to describe a condition
    const describeCondition = (condition: Condition): string => {
      if (!condition.isValid) return '';
      
      switch (condition.type) {
        case 'contains':
          return `contain "${condition.value}"`;
        case 'not-contains':
          return `don't contain "${condition.value}"`;
        case 'date-after':
          return `were sent after ${condition.value instanceof Date 
            ? format(condition.value, "MMM d, yyyy") 
            : "date"}`;
        case 'date-before':
          return `were sent before ${condition.value instanceof Date 
            ? format(condition.value, "MMM d, yyyy") 
            : "date"}`;
        case 'is-unread':
          return `are unread`;
        case 'is-read':
          return `are already read`;
        case 'has-attachment':
          return `have attachments`;
        case 'no-attachment':
          return `don't have attachments`;
        default:
          return '';
      }
    };
    
    // Build a summary from the rule groups
    const groupDescriptions: string[] = [];
    
    ruleGroups.forEach(group => {
      const validConditions = group.conditions.filter(c => c.isValid);
      
      if (validConditions.length === 0) return;
      
      const conditionDescriptions = validConditions.map(describeCondition).filter(Boolean);
      if (conditionDescriptions.length === 0) return;
      
      if (conditionDescriptions.length === 1) {
        groupDescriptions.push(conditionDescriptions[0]);
      } else {
        // Join conditions with the appropriate operator
        const joiner = group.operator === 'and' ? ' and ' : ' or ';
        groupDescriptions.push(`(${conditionDescriptions.join(joiner)})`);
      }
    });
    
    if (groupDescriptions.length === 0) {
      return `all ${emailCount} emails`;
    } else if (groupDescriptions.length === 1) {
      return `emails that ${groupDescriptions[0]}`;
    } else {
      // Between groups it's always OR
      return `emails that ${groupDescriptions.join(' or ')}`;
    }
  };

  // Render filter chip cards
  const renderFilterCard = (id: string, label: string, icon: React.ReactNode, description?: string) => {
    const isSelected = selectedFilters.includes(id);
    
    return (
      <button
        key={id}
        type="button"
        onClick={() => toggleFilter(id)}
        className={cn(
          "relative group rounded-lg border flex items-start gap-2 p-3 transition-all outline-none",
          isSelected 
            ? "border-blue-500 bg-blue-50 ring-0 dark:border-blue-500 dark:bg-slate-700" 
            : "border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
        )}
      >
        <div className={cn(
          "flex justify-center items-center h-8 w-8 rounded-full flex-shrink-0 transition-colors",
          isSelected ? "bg-blue-500 text-white dark:bg-blue-500 dark:text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:group-hover:bg-slate-600"
        )}>
          {icon}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1">
            <p className="font-medium text-gray-900 dark:text-slate-100">{label}</p>
            {isSelected && (
              <Check className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 ml-0.5" />
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </button>
    );
  };

  // NEW: Function to build Gmail Query
  const buildGmailQuery = useCallback((targetSenders: string[], rules: RuleGroup[]): string => {
    // Part 1: Build the sender query part (e.g., from:a OR from:b)
    let senderQuery = ''
    if (targetSenders.length > 0) {
      senderQuery = `(${targetSenders.map(s => `from:${s}`).join(' OR ')})`
    }
    
    // Part 2: Build the filter query part from rules
    const validGroups = rules.filter(group => group.conditions.some(c => c.isValid));
    let filterQuery = ''
    
    if (validGroups.length > 0) {
      const groupQueries = validGroups.map(group => {
        const validConditions = group.conditions.filter(c => c.isValid);
        const conditionStrings = validConditions.map(condition => {
          switch (condition.type) {
            case 'contains':
              return `"${condition.value}"`;
            case 'not-contains':
              return `-"${condition.value}"`;
            case 'date-after':
              return `after:${format(condition.value as Date, 'yyyy/MM/dd')}`;
            case 'date-before':
              return `before:${format(condition.value as Date, 'yyyy/MM/dd')}`;
            case 'is-unread':
              return 'is:unread';
            case 'is-read':
              return 'is:read';
            case 'has-attachment':
              return 'has:attachment';
            case 'no-attachment':
              return '-has:attachment'; // Assuming -has:attachment works, might need verification
            default:
              return '';
          }
        }).filter(Boolean); // Remove empty strings
        
        // Join conditions within the group
        if (conditionStrings.length === 0) return '';
        const joiner = group.operator === 'and' ? ' ' : ' OR '; // Space for AND, OR for OR
        return `(${conditionStrings.join(joiner)})`;
      }).filter(Boolean); // Remove empty group queries
      
      // Join different groups with OR
      if (groupQueries.length > 0) {
        filterQuery = groupQueries.join(' OR ');
      }
    }
    
    // Part 3: Combine sender and filter queries
    if (senderQuery && filterQuery) {
      return `${senderQuery} ${filterQuery}`; // Combine with space (implicit AND)
    } else if (senderQuery) {
      return senderQuery;
    } else if (filterQuery) {
      // This case might not happen if modal always has senders, but handle it
      return filterQuery;
    } else {
      return ''; // No valid query parts
    }
  }, []);

  // NEW: Handler for the Preview button
  const handlePreview = () => {
    const query = buildGmailQuery(senders, ruleGroups);
    if (query) {
      viewFilteredEmailsInGmail(query);
    } else {
      // Maybe show a toast if no valid filters are set?
      // For now, do nothing if query is empty
      console.log("Preview clicked, but no valid filters or senders to generate query.");
    }
  };

  // NEW: Handler for the Estimate button
  const handleEstimate = () => {
    // Calculate initial ETA for the estimation
    const initialEtaMs = estimateRuntimeMs({
      operationType: 'delete',
      emailCount,
      mode: 'single'
    });
    console.log(`Estimated runtime: ${initialEtaMs} ms`);
  };

  // Handle keyword filter changes - no sanitization needed as buildQuery.ts handles escaping
  const handleKeywordFilterChange = (text: string) => {
    setKeywordFilter(prev => ({ ...prev, text }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white dark:bg-slate-900 dark:border dark:border-slate-700 max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-xl font-semibold dark:text-slate-100">
              Delete from {senderDisplay}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Filter Section */}
          <div className="flex-1 overflow-auto min-h-0 pt-3 px-0.5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Delete emails that match these criteria:
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-slate-700 gap-1"
                onClick={handleModeSwitch}
              >
                {advancedMode ? "Quick Filters" : "Advanced Filters"}
                <SlidersHorizontal className="h-3 w-3" />
              </Button>
            </div>

            {!advancedMode ? (
              <div className="space-y-4">
                {/* Keyword Filter */}
                <div className="space-y-2 mb-4">
                  <Label 
                    htmlFor="keyword-filter" 
                    className="text-sm text-gray-600 dark:text-slate-400"
                  >
                    Filter by Keywords
                  </Label>
                  
                  <div className="flex gap-2 items-center">
                    <Select 
                      value={keywordFilter.isExclude ? "exclude" : "include"}
                      onValueChange={(value) => 
                        setKeywordFilter(prev => ({ 
                          ...prev, 
                          isExclude: value === "exclude" 
                        }))
                      }
                    >
                      <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 dark:border-slate-600">
                        <SelectItem value="include" className="dark:text-slate-300 dark:hover:bg-slate-700">Contains</SelectItem>
                        <SelectItem value="exclude" className="dark:text-slate-300 dark:hover:bg-slate-700">Doesn't contain</SelectItem>
                      </SelectContent>
                    </Select>
                  
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                      </div>
                      <Input
                        id="keyword-filter"
                        ref={keywordInputRef}
                        value={keywordFilter.text}
                        onChange={(e) => handleKeywordFilterChange(e.target.value)}
                        placeholder="Enter keywords..."
                        className="pl-7 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:placeholder-slate-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Templates */}
                <div className="grid grid-cols-2 gap-2 overflow-y-auto">
                  {/* Date Filters */}
                  {datePresets.map((preset, idx) => (
                    renderFilterCard(
                      `older-than-${preset.months}`,
                      preset.name,
                      <CalendarRange className="h-4 w-4" />,
                      `Emails from before ${format(new Date(new Date().setMonth(new Date().getMonth() - preset.months)), "MMM yyyy")}`
                    )
                  ))}
                  
                  {/* Email Status Filters */}
                  {renderFilterCard(
                    'is-read',
                    'Already Read',
                    <MailOpen className="h-4 w-4" />,
                    'Emails you have already opened'
                  )}
                  
                  {renderFilterCard(
                    'is-unread',
                    'Unread Only',
                    <Mail className="h-4 w-4" />,
                    'Only emails you haven\'t opened yet'
                  )}
                  
                  {/* Attachment Filter */}
                  {renderFilterCard(
                    'has-attachment',
                    'Has Attachments',
                    <Paperclip className="h-4 w-4" />,
                    'Emails with files attached'
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col max-h-[300px]">
                <ScrollArea className="pr-2 flex-1 overflow-auto max-h-[260px]">
                  {ruleGroups.map((group, groupIndex) => (
                    <div 
                      key={group.id} 
                      className="border border-gray-200 dark:border-slate-700 rounded-md p-3 bg-white dark:bg-slate-800 shadow-sm dark:shadow-md dark:shadow-black/20 mb-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {groupIndex > 0 && (
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 uppercase text-xs">
                              OR
                            </Badge>
                          )}
                          <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">
                            {groupIndex === 0 ? "Where email:" : "Or where email:"}
                          </h3>
                        </div>
                        
                        {groupIndex > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-slate-700"
                            onClick={() => removeRuleGroup(group.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {group.conditions.map((condition, condIndex) => (
                          <div key={condition.id} className="flex items-center gap-2">
                            {condIndex > 0 && (
                              <div className="flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleGroupOperator(group.id)}
                                  className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    group.operator === 'and' 
                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30" 
                                      : "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:hover:bg-orange-500/30"
                                  )}
                                >
                                  {group.operator === 'and' ? 'AND' : 'OR'}
                                </button>
                              </div>
                            )}
                            
                            <div className="flex-shrink-0">
                              <Select
                                value={condition.type}
                                onValueChange={(value) => updateConditionType(group.id, condition.id, value as ConditionType)} 
                              >
                                <SelectTrigger className="min-w-[130px] bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 dark:border-slate-600">
                                  <SelectItem value="contains" className="dark:text-slate-300 dark:hover:bg-slate-700">Contains</SelectItem>
                                  <SelectItem value="not-contains" className="dark:text-slate-300 dark:hover:bg-slate-700">Doesn't contain</SelectItem>
                                  <SelectItem value="date-after" className="dark:text-slate-300 dark:hover:bg-slate-700">Sent after</SelectItem>
                                  <SelectItem value="date-before" className="dark:text-slate-300 dark:hover:bg-slate-700">Sent before</SelectItem>
                                  <SelectItem value="is-unread" className="dark:text-slate-300 dark:hover:bg-slate-700">Is unread</SelectItem>
                                  <SelectItem value="is-read" className="dark:text-slate-300 dark:hover:bg-slate-700">Is read</SelectItem>
                                  <SelectItem value="has-attachment" className="dark:text-slate-300 dark:hover:bg-slate-700">Has attachment</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {renderConditionInput(condition, group.id)}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0 rounded-full text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-slate-700",
                                group.conditions.length === 1 && groupIndex === 0 && "opacity-50 cursor-not-allowed"
                              )}
                              onClick={() => removeCondition(group.id, condition.id)}
                              disabled={group.conditions.length === 1 && groupIndex === 0}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1 mt-3 w-full dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-slate-700"
                          onClick={() => addCondition(group.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Condition
                        </Button>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm gap-1 mt-3 w-full dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  onClick={addRuleGroup}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add "OR" Group
                </Button>
              </div>
            )}
          </div>

          {/* Current Filter Summary */}
          {hasValidFilters && (
            <div className="pt-3 pb-1">
              <div className="bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-md p-2.5">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Applied Filters:</p>
                    <p className="mt-0.5">{getFilterSummary()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Action warning - always visible */}
        <div className="bg-red-50 border border-red-100 dark:bg-red-500/10 dark:border-red-500/20 rounded-md p-3 mt-3">
          <div className="flex items-start">
            <Trash2 className="h-4 w-4 mr-2 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="w-full">
              <p className="font-medium text-red-700 dark:text-red-300 text-sm">
                {hasValidFilters 
                  ? `About to delete ${getFilterSummary()}`
                  : `About to delete all ${emailCount} emails`}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                This action is permanent and cannot be undone.{" "}
                <button
                  type="button"
                  className="underline hover:text-red-800 dark:hover:text-red-200"
                  onClick={() => {
                    handlePreview();
                  }}
                >
                  Preview impacted emails.
                </button>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-3">
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
              className="dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
            >
              Cancel
            </Button>
          </DialogClose>
          
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600 dark:text-red-100"
            disabled={isDeleting || (!hasValidFilters && emailCount > 100)}
            onClick={handleConfirm}
            size="sm"
          >
            {isDeleting ? (
              <span className="flex items-center">
                <span className="animate-pulse">{onConfirm ? 'Deleting' : 'Adding to Queue'}</span>
                <span className="animate-pulse">...</span>
              </span>
            ) : (
              <>Delete {hasValidFilters ? 'Selected' : 'All'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}