export type Sender = {
  name: string
  email: string
  lastEmail: string
  count: number
  hasUnsubscribe: boolean
  actionsTaken: Array<'unsubscribe' | 'delete' | 'markUnread' | 'block'>
}

export const mockSenders: Sender[] = [
  {
    name: "LinkedInLinkedInLinkedInLinkedInLinkedInLinkedIn",
    email: "notificationsnotificationsnotificationsnotifications@linkedin.com",
    lastEmail: "Apr 15, 2025",
    count: 847,
    hasUnsubscribe: true,
    actionsTaken: ['unsubscribe']
  },
  {
    name: "Amazon Orders",
    email: "auto-confirm@amazon.com",
    lastEmail: "Apr 14, 2025", 
    count: 632,
    hasUnsubscribe: true,
    actionsTaken: []
  },
  {
    name: "Spotify",
    email: "no-reply@spotify.com",
    lastEmail: "Apr 13, 2025",
    count: 521,
    hasUnsubscribe: true,
    actionsTaken: ['markUnread']
  },
  {
    name: "GitHub",
    email: "noreply@github.com",
    lastEmail: "Apr 12, 2025",
    count: 489,
    hasUnsubscribe: true,
    actionsTaken: ['delete']
  },
  {
    name: "Netflix",
    email: "info@netflix.com",
    lastEmail: "Apr 11, 2025",
    count: 456,
    hasUnsubscribe: true,
    actionsTaken: []
  },
  {
    name: "Apple",
    email: "no_reply@email.apple.com",
    lastEmail: "Apr 10, 2025",
    count: 423,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Google Calendar",
    email: "calendar-notification@google.com",
    lastEmail: "Apr 9, 2025",
    count: 398,
    hasUnsubscribe: false,
    actionsTaken: ['markUnread']
  },
  {
    name: "Dropbox",
    email: "no-reply@dropbox.com",
    lastEmail: "Apr 8, 2025",
    count: 367,
    hasUnsubscribe: true,
    actionsTaken: []
  },
  {
    name: "Twitter",
    email: "info@twitter.com",
    lastEmail: "Apr 7, 2025",
    count: 345,
    hasUnsubscribe: true,
    actionsTaken: ['block']
  },
  {
    name: "PayPal",
    email: "service@paypal.com",
    lastEmail: "Apr 6, 2025",
    count: 312,
    hasUnsubscribe: true,
    actionsTaken: []
  },
  {
    name: "Slack",
    email: "notifications@slack.com",
    lastEmail: "Apr 5, 2025",
    count: 289,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Adobe Creative Cloud",
    email: "mail@adobe.com",
    lastEmail: "Apr 4, 2025",
    count: 267,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Microsoft Office",
    email: "office@microsoft.com",
    lastEmail: "Apr 3, 2025",
    count: 245,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Zoom",
    email: "no-reply@zoom.us",
    lastEmail: "Apr 2, 2025",
    count: 234,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Discord",
    email: "noreply@discord.com",
    lastEmail: "Apr 1, 2025",
    count: 212,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Uber Receipts",
    email: "uber.us@uber.com",
    lastEmail: "Mar 31, 2025",
    count: 198,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "DoorDash",
    email: "no-reply@doordash.com",
    lastEmail: "Mar 30, 2025",
    count: 187,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Chase Bank",
    email: "alerts@chase.com",
    lastEmail: "Mar 29, 2025",
    count: 176,
    hasUnsubscribe: true,
    actionsTaken: []
  },
  {
    name: "Airbnb",
    email: "automated@airbnb.com",
    lastEmail: "Mar 2 8, 2025",
    count: 165,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Instagram",
    email: "no-reply@instagram.com",
    lastEmail: "Mar 27, 2025",
    count: 154,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Fastly",
    email: "support@fastly.com",
    lastEmail: "Jan 13, 2025",
    count: 89,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Akamai",
    email: "info@akamai.com",
    lastEmail: "Jan 12, 2025",
    count: 67,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Imperva",
    email: "info@imperva.com",
    lastEmail: "Jan 11, 2025",
    count: 45,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Cisco",
    email: "noreply@cisco.com",
    lastEmail: "Jan 10, 2025",
    count: 23,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Fortinet",
    email: "no-reply@fortinet.com",
    lastEmail: "Jan 9, 2025",
    count: 12,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Palo Alto Networks",
    email: "info@paloaltonetworks.com",
    lastEmail: "Jan 8, 2025",
    count: 8,
    hasUnsubscribe: false,
    actionsTaken: []
  },
  {
    name: "Check Point",
    email: "info@checkpoint.com",
    lastEmail: "Jan 7, 2025",
    count: 4,
    hasUnsubscribe: false,
    actionsTaken: []
  },
] 