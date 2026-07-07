import { SenderResult } from '@/types/gmail';
import { Profile } from '@/types/user';
import { GmailStats } from '@/lib/gmail/fetchGmailStats';

export const mockUser: Profile & { email: string; name: string } = {
  user_id: 'demo-user-id',
  email: 'you@gmail.com',
  name: 'Demo User',
  avatar_url: null,
  plan: 'pro',
  plan_expires_at: null,
  plan_updated_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  cancel_at_period_end: null,
  last_login: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockGmailStats: GmailStats = {
  emailAddress: 'you@gmail.com',
  totalEmails: 47832,
  totalThreads: 12456,
  lastUpdated: Date.now(),
};

const analysisId = 'demo-analysis-001';

export const mockSenders: SenderResult[] = [
  {
    senderEmail: 'newsletter@substack.com',
    senderName: 'Substack',
    count: 8421,
    unread_count: 1203,
    lastDate: new Date(Date.now() - 86400000).toISOString(),
    analysisId,
    hasUnsubscribe: true,
    unsubscribe: { url: 'https://example.com/unsub' },
    sampleSubjects: ['Your weekly digest', 'New post from a writer you follow'],
  },
  {
    senderEmail: 'no-reply@linkedin.com',
    senderName: 'LinkedIn',
    count: 5102,
    unread_count: 892,
    lastDate: new Date(Date.now() - 172800000).toISOString(),
    analysisId,
    hasUnsubscribe: true,
    sampleSubjects: ['You appeared in 12 searches', 'New connection request'],
  },
  {
    senderEmail: 'promotions@amazon.com',
    senderName: 'Amazon',
    count: 3890,
    unread_count: 0,
    lastDate: new Date(Date.now() - 604800000).toISOString(),
    analysisId,
    hasUnsubscribe: true,
    sampleSubjects: ['Deals based on your browsing', 'Your order has shipped'],
  },
  {
    senderEmail: 'updates@github.com',
    senderName: 'GitHub',
    count: 2144,
    unread_count: 45,
    lastDate: new Date(Date.now() - 3600000).toISOString(),
    analysisId,
    hasUnsubscribe: false,
    sampleSubjects: ['[mailmop] PR opened', 'Security alert'],
  },
  {
    senderEmail: 'hello@mailchimp.com',
    senderName: 'Mailchimp',
    count: 1876,
    unread_count: 312,
    lastDate: new Date(Date.now() - 259200000).toISOString(),
    analysisId,
    hasUnsubscribe: true,
    sampleSubjects: ['Campaign report ready', 'Tips for better open rates'],
  },
  {
    senderEmail: 'notifications@stripe.com',
    senderName: 'Stripe',
    count: 98,
    unread_count: 2,
    lastDate: new Date(Date.now() - 7200000).toISOString(),
    analysisId,
    hasUnsubscribe: false,
    sampleSubjects: ['Payment received', 'Invoice paid'],
  },
];
