window.APP_DATA = {
  site: {
    name: 'CreateInvoiceFast',
    shortName: 'CIF',
    domain: 'createinvoicefast.com',
    email: 'hello@createinvoicefast.com',
    phone: '+1 (555) 120-2026',
    city: 'San Francisco, CA'
  },
  templates: [
    {
      id: 'modern',
      name: 'Modern',
      summary: 'Bold green accent, spacious layout, and strong hierarchy.',
      accent: '#22c55e'
    },
    {
      id: 'classic',
      name: 'Classic',
      summary: 'Elegant serif style with a traditional billing layout.',
      accent: '#64748b'
    },
    {
      id: 'minimal',
      name: 'Minimal',
      summary: 'Clean, lightweight, and focused on clarity.',
      accent: '#111827'
    },
    {
      id: 'corporate',
      name: 'Corporate',
      summary: 'Finance-ready blue structure, crisp tables, and trust-first tone.',
      accent: '#2563eb'
    },
    {
      id: 'executive',
      name: 'Executive',
      summary: 'Dark header band with gold trim—ideal for premium services.',
      accent: '#0f172a'
    },
    {
      id: 'slate',
      name: 'Slate Pro',
      summary: 'Cool slate palette for consulting and SaaS teams.',
      accent: '#334155'
    },
    {
      id: 'ocean',
      name: 'Ocean',
      summary: 'Teal-forward layout with a calm, trustworthy visual tone.',
      accent: '#0f766e'
    },
    {
      id: 'sunrise',
      name: 'Sunrise',
      summary: 'Warm amber highlights with balanced typography and spacing.',
      accent: '#b45309'
    },
    {
      id: 'berry',
      name: 'Berry',
      summary: 'Confident rose accent suitable for creative studios.',
      accent: '#be185d'
    },
    {
      id: 'graphite',
      name: 'Graphite',
      summary: 'Low-saturation neutral theme for enterprise billing.',
      accent: '#1f2937'
    },
    {
      id: 'forest',
      name: 'Forest',
      summary: 'Deep green professional palette optimized for readability.',
      accent: '#166534'
    },
    {
      id: 'nightfall',
      name: 'Nightfall',
      summary: 'High-contrast dark style for premium executive invoices.',
      accent: '#0b1324'
    }
  ],
  features: [
    {
      icon: '✦',
      title: 'Fast invoice builder',
      text: 'Build clean invoices with editable client details, line items, taxes, and notes.'
    },
    {
      icon: 'PDF',
      title: 'Reliable PDF output',
      text: 'Export invoice layouts that stay clean in print and PDF without extra plugins.'
    },
    {
      icon: '☼',
      title: 'Light and dark mode',
      text: 'Switch themes instantly while preserving contrast and readability on every page.'
    },
    {
      icon: '↔',
      title: 'Account dashboard',
      text: 'Track invoices, clients, and payment status from one clear Supabase-backed view.'
    },
    {
      icon: '↗',
      title: 'Social sharing',
      text: 'Share invoices and blog posts to WhatsApp, Facebook, Reddit, X, and LinkedIn.'
    },
    {
      icon: 'SEO',
      title: 'Search-ready structure',
      text: 'Use clean URLs, proper metadata, and article pages designed for indexing.'
    }
  ],
  faq: [
    {
      question: 'Does this include a backend?',
      answer: 'Yes. The project now uses Supabase for authentication and database storage of invoices and client records.'
    },
    {
      question: 'How do I add a blog post?',
      answer: 'Open /admin and manage posts from the blog editor. You can create, edit, publish, and update post images there.'
    },
    {
      question: 'How are PDFs created?',
      answer: 'The invoice page uses a print-optimized layout, so users can save a clean PDF directly from the browser dialog.'
    }
  ],
  blogPosts: [
    {
      slug: 'invoice-pricing-tips',
      title: '7 Invoice Pricing Tips That Improve Cash Flow',
      description: 'Practical billing habits that help small businesses collect faster and present work more professionally.',
      date: '2026-04-01',
      category: 'Billing',
      readingTime: '5 min read',
      coverImage: '/assets/img/blog-pricing.svg',
      coverAlt: 'Invoice pricing and billing strategy illustration',
      contentHtml: `
        <p>Pricing is more than a number. The way you structure an invoice can influence how quickly a client approves and pays it. Clear billing reduces friction and makes your work look more professional.</p>
        <h2>1. Use line items that match the scope</h2>
        <p>Break the work into understandable units so the client can see what was delivered. This helps justify the price and makes later conversations easier.</p>
        <h2>2. Separate deposits from final billing</h2>
        <p>If your project uses a deposit, show it as a distinct line item and keep the remaining balance obvious. Clients are less likely to dispute a transparent structure.</p>
        <h2>3. Keep taxes and discounts visible</h2>
        <p>Surprising totals are one of the fastest ways to delay payment. Put the discount and tax logic in the summary section so the client can verify the total quickly.</p>
        <h2>4. Choose payment terms that are easy to understand</h2>
        <p>Write due dates in plain language and place them near the total. The invoice should answer the question: how much, when, and how should this be paid?</p>
        <h2>5. Use template design to build trust</h2>
        <p>A modern layout signals care. A classic layout can feel more formal. A minimal layout can be ideal for fast approvals. Pick the one that fits the client relationship.</p>
        <h2>6. Reuse saved clients</h2>
        <p>Keeping a client list lowers mistakes and speeds up new invoices. That also gives you better record keeping across projects.</p>
        <h2>7. Follow up politely</h2>
        <p>Even a good invoice needs a reminder. Keep follow-up emails short, respectful, and consistent.</p>
      `
    },
    {
      slug: 'client-invoicing-guide',
      title: 'Client Invoicing Guide for Freelancers and Agencies',
      description: 'A simple framework for clear scope, line items, payment terms, and follow-up emails.',
      date: '2026-04-03',
      category: 'Operations',
      readingTime: '6 min read',
      coverImage: '/assets/img/blog-client-guide.svg',
      coverAlt: 'Client invoicing workflow and process graphic',
      contentHtml: `
        <p>Professional invoicing is part communication and part organization. The cleaner the process, the less time you spend chasing details after the work is complete.</p>
        <h2>Start with scope</h2>
        <p>Write the deliverables in a way that mirrors the original proposal. If the project changed, reflect the change clearly so the invoice matches what was approved.</p>
        <h2>Use client-specific details</h2>
        <p>The client name, billing address, email, and invoice number should be easy to verify. Reusing saved client data prevents mistakes and keeps the workflow fast.</p>
        <h2>Choose sensible payment terms</h2>
        <p>Many freelancers use 7, 14, or 30 day terms. For larger projects, deposits and milestone billing can reduce risk and improve cash flow.</p>
        <h2>Keep follow-ups short</h2>
        <p>A reminder message should reference the invoice number, amount due, and due date. Short messages are easier to act on than long explanations.</p>
        <h2>Build a repeatable system</h2>
        <p>Templates, saved invoices, and a dashboard of clients make the process easier each time you invoice. That saves hours over the course of a year.</p>
      `
    },
    {
      slug: 'invoice-design-best-practices',
      title: 'Invoice Design Best Practices for Trust and Clarity',
      description: 'How to layout branding, totals, and callouts so your invoice looks polished and easy to pay.',
      date: '2026-04-05',
      category: 'Design',
      readingTime: '4 min read',
      coverImage: '/assets/img/blog-design.svg',
      coverAlt: 'Invoice layout and design best practices illustration',
      contentHtml: `
        <p>Invoice design affects how quickly someone understands the work and how confident they feel about paying it. A structured layout can remove uncertainty before it becomes a delay.</p>
        <h2>Lead with identity</h2>
        <p>Place your brand name, invoice number, and date near the top. This helps the client orient themselves immediately.</p>
        <h2>Use strong visual hierarchy</h2>
        <p>Make the total amount easier to scan than the line items. The point of the invoice is to show what was done, then show what is due.</p>
        <h2>Keep spacing generous</h2>
        <p>Invoices should feel readable at a glance. White space is not wasted space; it helps the document feel calm and professional.</p>
        <h2>Show payment information clearly</h2>
        <p>Include due dates, accepted payment methods, and any tax or discount notes in a place that is hard to miss.</p>
        <h2>Keep the layout flexible</h2>
        <p>Not every project needs the same tone. A classic template can feel more formal, while a minimal template can work well for quick approvals.</p>
      `
    }
  ]
};
