export type Sender = {
  name: string
  email: string
  lastEmail: string
  count: number
}

export const mockSenders: Sender[] = [
  {
    name: "LinkedIn",
    email: "notifications@linkedin.com",
    lastEmail: "Apr 15, 2025",
    count: 847
  },
  {
    name: "Amazon Orders",
    email: "auto-confirm@amazon.com",
    lastEmail: "Apr 14, 2025", 
    count: 632
  },
  {
    name: "Spotify",
    email: "no-reply@spotify.com",
    lastEmail: "Apr 13, 2025",
    count: 521
  },
  {
    name: "GitHub",
    email: "noreply@github.com",
    lastEmail: "Apr 12, 2025",
    count: 489
  },
  {
    name: "Netflix",
    email: "info@netflix.com",
    lastEmail: "Apr 11, 2025",
    count: 456
  },
  {
    name: "Apple",
    email: "no_reply@email.apple.com",
    lastEmail: "Apr 10, 2025",
    count: 423
  },
  {
    name: "Google Calendar",
    email: "calendar-notification@google.com",
    lastEmail: "Apr 9, 2025",
    count: 398
  },
  {
    name: "Dropbox",
    email: "no-reply@dropbox.com",
    lastEmail: "Apr 8, 2025",
    count: 367
  },
  {
    name: "Twitter",
    email: "info@twitter.com",
    lastEmail: "Apr 7, 2025",
    count: 345
  },
  {
    name: "PayPal",
    email: "service@paypal.com",
    lastEmail: "Apr 6, 2025",
    count: 312
  },
  {
    name: "Slack",
    email: "notifications@slack.com",
    lastEmail: "Apr 5, 2025",
    count: 289
  },
  {
    name: "Adobe Creative Cloud",
    email: "mail@adobe.com",
    lastEmail: "Apr 4, 2025",
    count: 267
  },
  {
    name: "Microsoft Office",
    email: "office@microsoft.com",
    lastEmail: "Apr 3, 2025",
    count: 245
  },
  {
    name: "Zoom",
    email: "no-reply@zoom.us",
    lastEmail: "Apr 2, 2025",
    count: 234
  },
  {
    name: "Discord",
    email: "noreply@discord.com",
    lastEmail: "Apr 1, 2025",
    count: 212
  },
  {
    name: "Uber Receipts",
    email: "uber.us@uber.com",
    lastEmail: "Mar 31, 2025",
    count: 198
  },
  {
    name: "DoorDash",
    email: "no-reply@doordash.com",
    lastEmail: "Mar 30, 2025",
    count: 187
  },
  {
    name: "Chase Bank",
    email: "alerts@chase.com",
    lastEmail: "Mar 29, 2025",
    count: 176
  },
  {
    name: "Airbnb",
    email: "automated@airbnb.com",
    lastEmail: "Mar 28, 2025",
    count: 165
  },
  {
    name: "Instagram",
    email: "no-reply@instagram.com",
    lastEmail: "Mar 27, 2025",
    count: 154
  },
  {
    name: "Medium Daily Digest",
    email: "digest@medium.com",
    lastEmail: "Mar 26, 2025",
    count: 143
  },
  {
    name: "Notion",
    email: "team@notion.com",
    lastEmail: "Mar 25, 2025",
    count: 132
  },
  {
    name: "AWS Notifications",
    email: "aws-marketing-email-replies@amazon.com",
    lastEmail: "Mar 24, 2025",
    count: 121
  },
  {
    name: "Figma",
    email: "support@figma.com",
    lastEmail: "Mar 23, 2025",
    count: 119
  },
  {
    name: "Google Drive",
    email: "drive-shares-noreply@google.com",
    lastEmail: "Mar 22, 2025",
    count: 118
  },
  {
    name: "Asana",
    email: "notifications@asana.com",
    lastEmail: "Mar 21, 2025",
    count: 107
  },
  {
    name: "Canva",
    email: "no-reply@canva.com",
    lastEmail: "Mar 20, 2025",
    count: 98
  },
  {
    name: "Stripe",
    email: "receipts@stripe.com",
    lastEmail: "Mar 19, 2025",
    count: 96
  },
  {
    name: "Grammarly",
    email: "support@grammarly.com",
    lastEmail: "Mar 18, 2025",
    count: 87
  },
  {
    name: "Coursera",
    email: "no-reply@coursera.org",
    lastEmail: "Mar 17, 2025",
    count: 85
  },
  {
    name: "Duolingo",
    email: "no-reply@duolingo.com",
    lastEmail: "Mar 16, 2025",
    count: 82
  },
  {
    name: "Trello",
    email: "taco@trello.com",
    lastEmail: "Mar 15, 2025",
    count: 78
  },
  {
    name: "Shopify",
    email: "notifications@shopify.com",
    lastEmail: "Mar 14, 2025",
    count: 76
  },
  {
    name: "DocuSign",
    email: "dse@docusign.net",
    lastEmail: "Mar 13, 2025",
    count: 73
  },
  {
    name: "Mailchimp",
    email: "admin@mailchimp.com",
    lastEmail: "Mar 12, 2025",
    count: 71
  },
  {
    name: "Calendly",
    email: "no-reply@calendly.com",
    lastEmail: "Mar 11, 2025",
    count: 68
  },
  {
    name: "Typeform",
    email: "notifications@typeform.com",
    lastEmail: "Mar 10, 2025",
    count: 65
  },
  {
    name: "Squarespace",
    email: "no-reply@squarespace.com",
    lastEmail: "Mar 9, 2025",
    count: 63
  },
  {
    name: "Wix",
    email: "support@wix.com",
    lastEmail: "Mar 8, 2025",
    count: 61
  },
  {
    name: "Airtable",
    email: "team@airtable.com",
    lastEmail: "Mar 7, 2025",
    count: 58
  },
  {
    name: "Webflow",
    email: "notifications@webflow.com",
    lastEmail: "Mar 6, 2025",
    count: 56
  },
  {
    name: "Miro",
    email: "noreply@miro.com",
    lastEmail: "Mar 5, 2025",
    count: 54
  },
  {
    name: "Loom",
    email: "no-reply@loom.com",
    lastEmail: "Mar 4, 2025",
    count: 52
  },
  {
    name: "Zendesk",
    email: "support@zendesk.com",
    lastEmail: "Mar 3, 2025",
    count: 49
  },
  {
    name: "Intercom",
    email: "team@intercom.com",
    lastEmail: "Mar 2, 2025",
    count: 47
  },
  {
    name: "Hubspot",
    email: "notifications@hubspot.com",
    lastEmail: "Mar 1, 2025",
    count: 45
  },
  {
    name: "Atlassian",
    email: "noreply@atlassian.com",
    lastEmail: "Feb 28, 2025",
    count: 43
  },
  {
    name: "Salesforce",
    email: "noreply@salesforce.com",
    lastEmail: "Feb 27, 2025",
    count: 41
  },
  {
    name: "Box",
    email: "no-reply@box.com",
    lastEmail: "Feb 26, 2025",
    count: 39
  },
  {
    name: "Evernote",
    email: "no-reply@evernote.com",
    lastEmail: "Feb 25, 2025",
    count: 37
  },
  {
    name: "LastPass",
    email: "noreply@lastpass.com",
    lastEmail: "Feb 24, 2025",
    count: 35
  },
  {
    name: "1Password",
    email: "support@1password.com",
    lastEmail: "Feb 23, 2025",
    count: 33
  },
  {
    name: "Dashlane",
    email: "support@dashlane.com",
    lastEmail: "Feb 22, 2025",
    count: 31
  },
  {
    name: "Twilio",
    email: "notifications@twilio.com",
    lastEmail: "Feb 21, 2025",
    count: 29
  },
  {
    name: "DigitalOcean",
    email: "noreply@digitalocean.com",
    lastEmail: "Feb 20, 2025",
    count: 27
  },
  {
    name: "Heroku",
    email: "noreply@heroku.com",
    lastEmail: "Feb 19, 2025",
    count: 25
  },
  {
    name: "MongoDB",
    email: "notifications@mongodb.com",
    lastEmail: "Feb 18, 2025",
    count: 23
  },
  {
    name: "Firebase",
    email: "firebase-noreply@google.com",
    lastEmail: "Feb 17, 2025",
    count: 21
  },
  {
    name: "Vercel",
    email: "support@vercel.com",
    lastEmail: "Feb 16, 2025",
    count: 19
  },
  {
    name: "Netlify",
    email: "team@netlify.com",
    lastEmail: "Feb 15, 2025",
    count: 17
  },
  {
    name: "CircleCI",
    email: "notifications@circleci.com",
    lastEmail: "Feb 14, 2025",
    count: 15
  },
  {
    name: "Jenkins",
    email: "notifications@jenkins.io",
    lastEmail: "Feb 13, 2025",
    count: 13
  },
  {
    name: "GitLab",
    email: "gitlab@gitlab.com",
    lastEmail: "Feb 12, 2025",
    count: 11
  },
  {
    name: "Bitbucket",
    email: "noreply@bitbucket.org",
    lastEmail: "Feb 11, 2025",
    count: 9
  },
  {
    name: "npm",
    email: "support@npmjs.com",
    lastEmail: "Feb 10, 2025",
    count: 7
  },
  {
    name: "Yarn",
    email: "noreply@yarnpkg.com",
    lastEmail: "Feb 9, 2025",
    count: 5
  },
  {
    name: "Docker",
    email: "noreply@docker.com",
    lastEmail: "Feb 8, 2025",
    count: 4
  },
  {
    name: "Kubernetes",
    email: "kubernetes-dev@googlegroups.com",
    lastEmail: "Feb 7, 2025",
    count: 3
  },
  {
    name: "Terraform",
    email: "notifications@hashicorp.com",
    lastEmail: "Feb 6, 2025",
    count: 2
  },
  {
    name: "Ansible",
    email: "info@ansible.com",
    lastEmail: "Feb 5, 2025",
    count: 1
  },
  {
    name: "New Relic",
    email: "support@newrelic.com",
    lastEmail: "Feb 4, 2025",
    count: 42
  },
  {
    name: "Datadog",
    email: "support@datadoghq.com",
    lastEmail: "Feb 3, 2025",
    count: 38
  },
  {
    name: "Sentry",
    email: "noreply@sentry.io",
    lastEmail: "Feb 2, 2025",
    count: 36
  },
  {
    name: "PagerDuty",
    email: "noreply@pagerduty.com",
    lastEmail: "Feb 1, 2025",
    count: 34
  },
  {
    name: "Splunk",
    email: "noreply@splunk.com",
    lastEmail: "Jan 31, 2025",
    count: 32
  },
  {
    name: "Grafana",
    email: "contact@grafana.com",
    lastEmail: "Jan 30, 2025",
    count: 30
  },
  {
    name: "Prometheus",
    email: "prometheus-notifications@googlegroups.com",
    lastEmail: "Jan 29, 2025",
    count: 28
  },
  {
    name: "Elasticsearch",
    email: "elastic@elastic.co",
    lastEmail: "Jan 28, 2025",
    count: 26
  },
  {
    name: "Kibana",
    email: "kibana@elastic.co",
    lastEmail: "Jan 27, 2025",
    count: 24
  },
  {
    name: "Logstash",
    email: "logstash@elastic.co",
    lastEmail: "Jan 26, 2025",
    count: 22
  },
  {
    name: "Redis Labs",
    email: "no-reply@redislabs.com",
    lastEmail: "Jan 25, 2025",
    count: 20
  },
  {
    name: "PostgreSQL",
    email: "pgsql-announce@postgresql.org",
    lastEmail: "Jan 24, 2025",
    count: 18
  },
  {
    name: "MySQL",
    email: "mysql@oracle.com",
    lastEmail: "Jan 23, 2025",
    count: 16
  },
  {
    name: "MariaDB",
    email: "info@mariadb.org",
    lastEmail: "Jan 22, 2025",
    count: 14
  },
  {
    name: "SQLite",
    email: "drh@sqlite.org",
    lastEmail: "Jan 21, 2025",
    count: 12
  },
  {
    name: "Cassandra",
    email: "cassandra-user@apache.org",
    lastEmail: "Jan 20, 2025",
    count: 10
  },
  {
    name: "Couchbase",
    email: "info@couchbase.com",
    lastEmail: "Jan 19, 2025",
    count: 8
  },
  {
    name: "Neo4j",
    email: "info@neo4j.com",
    lastEmail: "Jan 18, 2025",
    count: 6
  },
  {
    name: "Supabase",
    email: "support@supabase.io",
    lastEmail: "Jan 17, 2025",
    count: 4
  },
  {
    name: "Auth0",
    email: "support@auth0.com",
    lastEmail: "Jan 16, 2025",
    count: 2
  },
  {
    name: "Okta",
    email: "noreply@okta.com",
    lastEmail: "Jan 15, 2025",
    count: 1
  },
  {
    name: "Cloudflare",
    email: "notifications@cloudflare.com",
    lastEmail: "Jan 14, 2025",
    count: 156
  },
  {
    name: "Fastly",
    email: "support@fastly.com",
    lastEmail: "Jan 13, 2025",
    count: 89
  },
  {
    name: "Akamai",
    email: "info@akamai.com",
    lastEmail: "Jan 12, 2025",
    count: 67
  },
  {
    name: "Imperva",
    email: "info@imperva.com",
    lastEmail: "Jan 11, 2025",
    count: 45
  },
  {
    name: "Cisco",
    email: "noreply@cisco.com",
    lastEmail: "Jan 10, 2025",
    count: 23
  },
  {
    name: "Fortinet",
    email: "no-reply@fortinet.com",
    lastEmail: "Jan 9, 2025",
    count: 12
  },
  {
    name: "Palo Alto Networks",
    email: "info@paloaltonetworks.com",
    lastEmail: "Jan 8, 2025",
    count: 8
  },
  {
    name: "Check Point",
    email: "info@checkpoint.com",
    lastEmail: "Jan 7, 2025",
    count: 4
  },
  {
    name: "Symantec",
    email: "noreply@symantec.com",
    lastEmail: "Jan 6, 2025",
    count: 2
  },
  {
    name: "McAfee",
    email: "noreply@mcafee.com",
    lastEmail: "Jan 5, 2025",
    count: 1
  }
] 