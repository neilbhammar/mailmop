import { StartInboxAnalysis } from './StartInboxAnalysis';

export function InboxNextStep({ slug }: { slug: string }) {
  const unsubscribe = /subscription|unsubscribe|^stop-/.test(slug);
  return <aside aria-label="Try this in your inbox" className="not-prose my-8 rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6 dark:border-blue-800 dark:bg-slate-900">
    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{unsubscribe ? 'See which senders fill your inbox' : 'Find the senders worth cleaning up'}</h2>
    <p className="mt-2 mb-4 max-w-2xl text-base leading-relaxed text-slate-700 dark:text-slate-300">
      Analyze your Gmail by sender, then choose what to keep, unsubscribe from, or delete. Analysis is free and does not delete email.
    </p>
    <StartInboxAnalysis />
    <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">Connect with Google. Email analysis runs in your browser. Paid features are shown before use.</p>
  </aside>;
}
