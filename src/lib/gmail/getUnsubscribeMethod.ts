import { SenderResult } from "@/types/gmail";

// This should match the UnsubscribeMethodDetails in useUnsubscribe.ts for consistency
export interface UnsubscribeMethodDetails {
  type: "url" | "mailto";
  value: string; // URL string or mailto: string
  requiresPost?: boolean; // From SenderResult.unsubscribe.requiresPost
}

/**
 * Determines the best unsubscribe method from the sender's unsubscribe details.
 * Prefers URL over mailto if both are present.
 * Includes the requiresPost flag.
 *
 * @param senderUnsubscribeDetails - The unsubscribe object from SenderResult.
 * @returns UnsubscribeMethodDetails if a method is found, otherwise null.
 */
export function getUnsubscribeMethod(
  senderUnsubscribeDetails?: SenderResult['unsubscribe']
): UnsubscribeMethodDetails | null {
  if (!senderUnsubscribeDetails) {
    return null;
  }

  const { url, mailto, requiresPost } = senderUnsubscribeDetails;

  if (url) {
    return {
      type: "url",
      value: url,
      requiresPost: requiresPost ?? false,
    };
  }

  if (mailto) {
    return {
      type: "mailto",
      value: mailto,
      requiresPost: requiresPost ?? false, // Mailto links can also be one-click with List-Unsubscribe-Post
    };
  }

  return null;
} 