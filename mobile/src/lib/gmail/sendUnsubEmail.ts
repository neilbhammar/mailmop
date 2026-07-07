// Placeholder for sendUnsubEmail.ts
// This utility will wrap gmail.users.messages.send for sending unsubscribe emails.

interface SendEmailParams {
  accessToken: string; // Needed to authorize the gapi call
  to: string;
  subject: string;
  body: string;
}

/**
 * Sends an email using the Gmail API.
 * Used for sending unsubscribe requests via mailto links.
 * @param params - Parameters for sending the email.
 */
export async function sendUnsubEmail(params: SendEmailParams): Promise<void> {
  const { accessToken, to, subject, body } = params;

  // Access gapi through window to avoid potential type conflicts if not perfectly set up
  const gapiInstance = (window as any).gapi;

  if (!gapiInstance?.client?.gmail) {
    console.error("Gmail API client not loaded. Ensure GAPI script is loaded and client is initialized.");
    throw new Error("Gmail API client not loaded. Cannot send email.");
  }
  
  // The gapi client should ideally be initialized with the token elsewhere (e.g., AuthProvider or GmailPermissionsProvider)
  // Calling gapiInstance.client.setToken({ access_token: accessToken }) here might be redundant or interfere
  // if the token is already managed by the gapi.client.init or a similar setup.
  // We are proceeding with the assumption that the client is ready and authorized.

  const emailLines = [];
  emailLines.push(`To: ${to}`);
  emailLines.push(`Subject: ${subject}`);
  emailLines.push("Content-Type: text/plain; charset=utf-8"); // Corrected charset
  emailLines.push(""); 
  emailLines.push(body);

  const email = emailLines.join("\r\n");

  const base64EncodedEmail = btoa(unescape(encodeURIComponent(email))) // Ensure proper UTF-8 handling before btoa
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    // Use the correctly typed gapiInstance here
    const response = await gapiInstance.client.gmail.users.messages.send({
      userId: "me",
      resource: {
        raw: base64EncodedEmail,
      },
    });
    console.log("Unsubscribe email sent successfully:", response);
  } catch (error) {
    console.error("Error sending unsubscribe email:", error);
    const gapiError = error as any;
    let message = "Failed to send unsubscribe email.";
    if (gapiError.result?.error?.message) {
      message += ` ${gapiError.result.error.message}`;
    }
    throw new Error(message);
  }
}

// Removed the standalone ensureGapiClientLoaded and the `declare global { const gapi: any; }`
// as it was causing redeclaration errors. Accessing via `(window as any).gapi` is a common workaround.
// Proper GAPI type setup in tsconfig.json is the best long-term solution.

// If GAPI types are correctly installed (e.g., @types/gapi, @types/gapi.client.gmail)
// and included in tsconfig compilerOptions.types, then direct `gapi` usage should work
// without `(window as any)`. The current approach is for resilience. 