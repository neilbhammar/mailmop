export const landingFeatures = [
  { title: 'Analyze by sender', desc: 'See who fills your inbox — grouped and sortable.' },
  { title: 'Bulk delete', desc: 'Remove thousands of emails in a few taps (Pro).' },
  { title: 'One-click unsubscribe', desc: 'Stop newsletters without hunting for links.' },
  { title: 'Privacy-first', desc: 'Analysis runs on your device. Emails stay with you.' },
];

export const howItWorksSteps = [
  { step: 1, title: 'Connect Gmail', desc: 'Authorize read access to email metadata only.' },
  { step: 2, title: 'Run analysis', desc: 'MailMop scans your inbox locally, grouped by sender.' },
  { step: 3, title: 'Take action', desc: 'Bulk delete, unsubscribe, block, or label — your call.' },
];

export const landingFaqs = [
  {
    id: 'why-exist',
    question: 'Why does MailMop exist?',
    answer:
      "I built this for myself — I needed a better, more secure way to clean up my inbox. Figured I'd make it available to everyone else, too!",
  },
  {
    id: 'local-processing',
    question: 'What does "emails processed locally" mean?',
    answer:
      'Traditional email tools store and analyze your emails on their servers. MailMop processes everything on your device.',
  },
  {
    id: 'safety',
    question: 'How do I know MailMop is safe?',
    answer:
      "You can read all our code on GitHub. We also passed Google's Third Party CASA Certification.",
  },
  {
    id: 'paid-plan',
    question: 'Why is there a paid plan?',
    answer:
      'Just to cover costs — hosting and Google\'s annual security audit. Not trying to build a business here.',
  },
];

export const privacyPoints = [
  { title: 'Local processing', desc: 'Your emails never leave your device during analysis.' },
  { title: 'Metadata-first', desc: 'We primarily read headers — sender, subject, date.' },
  { title: 'Revoke anytime', desc: 'Disconnect Gmail with one tap whenever you want.' },
];

export const pricingPlans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    features: ['Full inbox analysis', 'Unsubscribe', 'CSV export'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$22.68/yr',
    features: ['Bulk delete', 'Apply labels', 'Block senders', 'Create filters'],
    highlighted: true,
  },
];

export const globalStats = {
  analyzedEmails: 500000,
  cleanedEmails: 300000,
  hoursSaved: 3000,
};
