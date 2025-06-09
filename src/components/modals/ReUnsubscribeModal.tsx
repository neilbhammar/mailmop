"use client"

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, Mail, RotateCcw, AlertCircle } from "lucide-react"
import { getUnsubscribeMethod } from '@/lib/gmail/getUnsubscribeMethod';
import { enrichSender } from '@/lib/gmail/enrichSender';
import { toast } from 'sonner';
import { useGmailPermissions } from '@/context/GmailPermissionsProvider';
import { useAuth } from '@/context/AuthProvider';
import { getSenderByEmail } from '@/lib/storage/senderAnalysis';
import { logger } from '@/lib/utils/logger';

// --- Queue Integration ---
import { useQueue } from "@/hooks/useQueue";
import { estimateRuntimeMs } from "@/lib/utils/estimateRuntime";

interface ReUnsubscribeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  senderEmail: string
  messageId: string
}

export function ReUnsubscribeModal({
  open,
  onOpenChange,
  senderEmail,
  messageId,
}: ReUnsubscribeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessToken, hasRefreshToken: isGmailConnected } = useGmailPermissions();
  const { user } = useAuth();
  const { enqueue } = useQueue();

  // Get the unsubscribe methods available for this sender
  const [senderData, setSenderData] = useState<any>(null);
  const [hasUrlMethod, setHasUrlMethod] = useState(false);
  const [hasMailtoMethod, setHasMailtoMethod] = useState(false);

  // Load sender data when modal opens
  React.useEffect(() => {
    if (open && senderEmail) {
      getSenderByEmail(senderEmail).then(data => {
        setSenderData(data);
        if (data?.unsubscribe) {
          const method = getUnsubscribeMethod(data.unsubscribe);
          setHasUrlMethod(!!method && method.type === 'url');
          setHasMailtoMethod(!!data.unsubscribe.mailto);
        }
      });
    }
  }, [open, senderEmail]);

  const handleOpenLink = async () => {
    if (!senderData?.unsubscribe) {
      toast.error("No unsubscribe data available");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Try enrichment first if we have messageId
      let urlToOpen = null;
      let wasEnriched = false;
      
      if (messageId) {
        try {
          const accessToken = await getAccessToken();
          const enrichmentResult = await enrichSender(accessToken, messageId);
          
          if (enrichmentResult.enrichedUrl) {
            urlToOpen = enrichmentResult.enrichedUrl;
            wasEnriched = true;
          }
        } catch (enrichmentError) {
          logger.debug('Enrichment failed, using fallback', { error: enrichmentError });
        }
      }

      // Fallback to header URL if no enriched URL
      if (!urlToOpen) {
        const method = getUnsubscribeMethod(senderData.unsubscribe);
        if (method?.type === 'url') {
          urlToOpen = method.value;
          wasEnriched = false;
        }
      }

      if (urlToOpen) {
        // Show informative toast about which type of link is being opened
        if (wasEnriched) {
          toast.info(`Opening enriched unsubscribe link for ${senderEmail}`);
        } else {
          toast.info(`Opening header unsubscribe link for ${senderEmail}`);
        }
        
        const newWindow = window.open(urlToOpen, "_blank", "noopener,noreferrer");
        onOpenChange(false);
      } else {
        toast.error("No URL unsubscribe method available");
      }
      
    } catch (error: any) {
      logger.error('Error opening unsubscribe link', { error: error.message });
      toast.error(error.message || "Failed to open unsubscribe link");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendEmail = async () => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    if (!isGmailConnected) {
      toast.error("Gmail not connected. Please reconnect to send unsubscribe email.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Get the sender data to get unsubscribe details
      const senderData = await getSenderByEmail(senderEmail);
      if (!senderData?.unsubscribe) {
        toast.error("No unsubscribe data available for this sender");
        return;
      }

      // Get the mailto method directly (don't use getUnsubscribeMethod which prioritizes URLs)
      if (!senderData.unsubscribe.mailto) {
        toast.error("No email unsubscribe method available for this sender");
        return;
      }
      
      const method = {
        type: "mailto" as const,
        value: senderData.unsubscribe.mailto,
        requiresPost: senderData.unsubscribe.requiresPost ?? false
      };

      // Calculate initial ETA for unsubscribe operation
      const unsubscribeEtaMs = estimateRuntimeMs({
        operationType: 'mark', // Similar complexity to marking
        emailCount: 1, // Unsubscribe is a single operation
        mode: 'single'
      });

      // Add unsubscribe job to queue instead of sending directly
      enqueue('unsubscribe', {
        senderEmail,
        methodDetails: method,
        initialEtaMs: unsubscribeEtaMs
      });

      toast.info(`📧 Added ${senderEmail} to unsubscribe queue`);
      onOpenChange(false);
      
    } catch (error: any) {
      logger.error('Error enqueuing unsubscribe email', { 
        component: 'ReUnsubscribeModal',
        error: error.message 
      });
      toast.error(error.message || "Failed to add to unsubscribe queue");
    } finally {
      setIsProcessing(false);
    }
  }

  // Extract domain for cleaner display
  const senderDomain = senderEmail.split('@')[1] || senderEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center dark:text-slate-100">
            <RotateCcw className="h-5 w-5 mr-2 text-orange-500 dark:text-orange-400" />
            Try Unsubscribing Again
          </DialogTitle>
          <DialogDescription className="pt-2 text-slate-600 dark:text-slate-400">
            You've already sent an unsubscribe request to{" "}
            <strong className="text-gray-700 dark:text-slate-300">{senderEmail}</strong>.
            <br />
            Would you like to try again using a different method?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {hasUrlMethod && (
            <Button
              onClick={handleOpenLink}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-500"
              size="default"
            >
              <ExternalLink className="h-4 w-4" />
              Open Unsubscribe Link
            </Button>
          )}
          
          {hasMailtoMethod && (
            <Button
              onClick={handleSendEmail}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
              size="default"
            >
              <Mail className="h-4 w-4" />
              Send Unsubscribe Email
            </Button>
          )}
          
          {!hasUrlMethod && !hasMailtoMethod && (
            <div className="flex items-center justify-center gap-2 py-6 text-center text-slate-500 dark:text-slate-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No alternative unsubscribe methods available.</span>
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
} 