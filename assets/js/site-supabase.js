(() => {
  const storageKeys = {
    theme: 'createinvoicefast-theme',
    invoiceDraft: 'createinvoicefast-invoice-draft'
  };

  const defaultDraft = () => ({
    invoiceNumber: 'INV-2026-001',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    paymentTerms: 'Net 14',
    poNumber: '',
    status: 'due',
    currency: 'USD',
    taxRate: 10,
    discount: 0,
    shipping: 0,
    amountPaid: 0,
    notes: 'Thank you for your business. Payment is due within 14 days.',
    template: 'modern',
    logoDataUrl: '',
    companyName: 'CreateInvoiceFast Studio',
    companyEmail: 'billing@example.com',
    companyAddress: '88 Market Street, Suite 400, San Francisco, CA',
    clientName: 'Acme Co.',
    clientEmail: 'accounts@acme.com',
    clientAddress: '1200 Mission Street, San Francisco, CA',
    shipTo: '',
    projectName: 'Brand system refresh',
    items: [
      { description: 'Discovery and scope planning', quantity: 2, rate: 180 },
      { description: 'UI design and invoice template setup', quantity: 3, rate: 240 }
    ]
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value || 0));
  const dateFormat = (value) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  };

  const slugify = (value) => String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const escapeHTML = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const notify = (title, message) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<strong>${escapeHTML(title)}</strong><div>${escapeHTML(message)}</div>`;
    document.body.appendChild(toast);
    window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = '0.2s ease';
      window.setTimeout(() => toast.remove(), 220);
    }, 2600);
  };

  const getTemplate = (templateId) => (window.APP_DATA?.templates || []).find((template) => template.id === templateId) || window.APP_DATA.templates[0];

  const projectUrl = window.SUPABASE_CONFIG?.url;
  const publishableKey = window.SUPABASE_CONFIG?.publishableKey;
  const supabase = window.supabase && projectUrl && publishableKey
    ? window.supabase.createClient(projectUrl, publishableKey)
    : null;

  let authUser = null;

  const getDraftKey = () => {
    const userKey = authUser?.id || 'guest';
    return `${storageKeys.invoiceDraft}:${userKey}`;
  };

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const getDraft = () => {
    const draft = readJSON(getDraftKey(), null);
    return draft ? { ...defaultDraft(), ...draft } : defaultDraft();
  };

  const saveDraft = (draft) => writeJSON(getDraftKey(), draft);

  const getInvoiceTotals = (draft) => {
    const subtotal = draft.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
    const discount = Number(draft.discount || 0);
    const shipping = Number(draft.shipping || 0);
    const taxable = Math.max(subtotal - discount, 0);
    const tax = taxable * (Number(draft.taxRate || 0) / 100);
    const total = taxable + tax + shipping;
    const amountPaid = Math.max(Number(draft.amountPaid || 0), 0);
    const balanceDue = total - amountPaid;
    return {
      subtotal,
      discount,
      shipping,
      tax,
      total,
      amountPaid,
      balanceDue
    };
  };

  const invoiceFileStem = (draft) => slugify(draft.invoiceNumber || 'invoice') || 'invoice';

  const triggerDownload = (blob, fileName) => {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  };

  const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

  const buildInvoiceCSV = (draft, totals) => {
    const rows = [
      ['Invoice Number', draft.invoiceNumber],
      ['Issue Date', draft.issueDate],
      ['Due Date', draft.dueDate],
      ['Status', draft.status],
      ['Payment Terms', draft.paymentTerms],
      ['PO Number', draft.poNumber],
      ['Company Name', draft.companyName],
      ['Company Email', draft.companyEmail],
      ['Company Address', draft.companyAddress],
      ['Client Name', draft.clientName],
      ['Client Email', draft.clientEmail],
      ['Client Address', draft.clientAddress],
      ['Ship To', draft.shipTo],
      ['Project Name', draft.projectName],
      ['Currency', draft.currency],
      ['Tax Rate', draft.taxRate],
      ['Discount', totals.discount],
      ['Shipping', totals.shipping],
      ['Amount Paid', totals.amountPaid],
      ['Subtotal', totals.subtotal],
      ['Tax', totals.tax],
      ['Total', totals.total],
      ['Balance Due', totals.balanceDue],
      [],
      ['Line Item Description', 'Quantity', 'Rate', 'Amount']
    ];

    draft.items.forEach((item) => {
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      rows.push([
        item.description,
        quantity,
        rate,
        quantity * rate
      ]);
    });

    return rows
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');
  };

  const downloadInvoiceJSON = (draft) => {
    const totals = getInvoiceTotals(draft);
    const payload = { ...draft, totals };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    triggerDownload(blob, `${invoiceFileStem(draft)}.json`);
    notify('Download ready', 'Invoice JSON file exported.');
  };

  const downloadInvoiceCSV = (draft) => {
    const totals = getInvoiceTotals(draft);
    const csv = buildInvoiceCSV(draft, totals);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, `${invoiceFileStem(draft)}.csv`);
    notify('Download ready', 'Invoice CSV file exported.');
  };

  const downloadInvoicePNG = async (draft) => {
    const preview = $('[data-invoice-preview]');
    if (!preview) return;
    if (!window.html2canvas) {
      notify('PNG unavailable', 'PNG export library did not load. Refresh and try again.');
      return;
    }

    try {
      if (document.fonts?.ready) await document.fonts.ready;

      const canvas = await window.html2canvas(preview, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY
      });

      if (!canvas.width || !canvas.height) {
        notify('PNG unavailable', 'Preview area is empty. Fill invoice data and try again.');
        return;
      }

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        notify('PNG unavailable', 'Could not generate image file.');
        return;
      }

      triggerDownload(blob, `${invoiceFileStem(draft)}.png`);
      notify('Download ready', 'Invoice PNG file exported.');
    } catch {
      notify('PNG unavailable', 'Could not render preview image. Please refresh and retry.');
    }
  };

  const downloadInvoicePDF = async (draft) => {
    const preview = $('[data-invoice-preview]');
    if (!preview) return;
    if (!window.html2canvas) {
      notify('PDF unavailable', 'Export library did not load. Refresh and try again.');
      return;
    }

    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      notify('PDF unavailable', 'PDF library did not load. Refresh and try again.');
      return;
    }

    try {
      if (document.fonts?.ready) await document.fonts.ready;

      const canvas = await window.html2canvas(preview, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY
      });

      if (!canvas.width || !canvas.height) {
        notify('PDF unavailable', 'Preview area is empty. Fill invoice data and try again.');
        return;
      }

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - (margin * 2);
      const printableHeight = pageHeight - (margin * 2);
      const imageHeight = (canvas.height * printableWidth) / canvas.width;

      let heightLeft = imageHeight;
      let offsetY = margin;

      pdf.addImage(imageData, 'PNG', margin, offsetY, printableWidth, imageHeight, undefined, 'FAST');
      heightLeft -= printableHeight;

      while (heightLeft > 0.1) {
        offsetY = margin - (imageHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', margin, offsetY, printableWidth, imageHeight, undefined, 'FAST');
        heightLeft -= printableHeight;
      }

      pdf.save(`${invoiceFileStem(draft)}.pdf`);
      notify('Download ready', 'Invoice PDF file exported.');
    } catch {
      notify('PDF unavailable', 'Could not generate PDF. Please refresh and retry.');
    }
  };

  const setInvoicePrintScale = () => {
    const preview = $('[data-invoice-preview]');
    if (!preview) return;

    document.documentElement.style.setProperty('--invoice-print-scale', '1');

    // A4 (297mm) with 12mm top/bottom margin in print CSS.
    const mmToPx = 96 / 25.4;
    const printableHeightPx = (297 - 24) * mmToPx;
    const contentHeight = preview.scrollHeight;
    if (!contentHeight) return;

    const rawScale = Math.min(1, printableHeightPx / contentHeight);
    const safeScale = Number.isFinite(rawScale) ? Math.max(0.64, rawScale) : 1;
    document.documentElement.style.setProperty('--invoice-print-scale', safeScale.toFixed(3));
  };

  const clearInvoicePrintScale = () => {
    document.documentElement.style.setProperty('--invoice-print-scale', '1');
  };

  const printInvoice = () => {
    setInvoicePrintScale();
    window.print();
  };

  window.addEventListener('beforeprint', setInvoicePrintScale);
  window.addEventListener('afterprint', clearInvoicePrintScale);

  const getCurrentInvoiceId = () => new URLSearchParams(window.location.search).get('invoice') || '';

  const authReady = async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    authUser = data?.user || null;
    return authUser;
  };

  const requireAuth = async (returnTo = null) => {
    const user = await authReady();
    if (user) return user;
    const target = returnTo || `${window.location.pathname}${window.location.search}`;
    window.location.href = `/login/?returnTo=${encodeURIComponent(target)}`;
    return null;
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    const toggle = $('[data-theme-toggle]');
    if (toggle) toggle.setAttribute('aria-label', `Theme: ${theme}`);
  };

  const setTheme = (value, persist = true) => {
    const nextTheme = value === 'light' || value === 'dark' ? value : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(nextTheme);
    if (persist) localStorage.setItem(storageKeys.theme, value || 'system');
  };

  const initTheme = () => {
    const stored = localStorage.getItem(storageKeys.theme) || 'system';
    if (stored === 'system') setTheme('system', false);
    else setTheme(stored);

    $('[data-theme-toggle]')?.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(current);
      notify('Theme updated', `Switched to ${current} mode.`);
    });
  };

  const setYear = () => {
    $$('.js-year').forEach((node) => { node.textContent = String(new Date().getFullYear()); });
  };

  const highlightCurrentNav = () => {
    const page = document.body.dataset.page || '';
    const activeMap = {
      home: '/',
      invoice: '/invoice/',
      dashboard: '/dashboard/',
      'blog-index': '/blog/',
      'blog-article': '/blog/',
      admin: '/admin/',
      about: '/about/',
      contact: '/contact/',
      privacy: '/privacy/',
      terms: '/terms/'
    };
    const activeHref = activeMap[page] || '';
    $$('.nav-links a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (activeHref && href === activeHref) link.classList.add('is-active');
    });
  };

  const renderAuthState = async () => {
    const user = await authReady();
    const profileName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Guest';

    $$('.js-auth-greeting').forEach((node) => {
      node.textContent = user ? `Hi, ${profileName}` : 'Welcome';
    });
    $$('.js-auth-name').forEach((node) => {
      node.textContent = user ? profileName : 'Guest';
    });
    $$('.js-auth-email').forEach((node) => {
      node.textContent = user ? user.email : 'Not signed in';
    });
    $$('.js-auth-nav').forEach((node) => node.classList.toggle('hidden', !user));
    $$('.js-guest-nav').forEach((node) => node.classList.toggle('hidden', !!user));

    $$('.js-sign-out').forEach((node) => {
      node.addEventListener('click', async () => {
        if (supabase) await supabase.auth.signOut();
        authUser = null;
        notify('Signed out', 'Your session was cleared.');
        setTimeout(() => { window.location.href = '/'; }, 300);
      });
    });
  };

  const setupShareButtons = (title, text) => {
    const currentUrl = window.location.href;
    const shareTargets = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title}\n${currentUrl}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
      reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(title)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} ${text || ''}`)}&url=${encodeURIComponent(currentUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`
    };

    $$('[data-share]').forEach((button) => {
      button.addEventListener('click', () => {
        const network = button.dataset.share || '';
        const url = shareTargets[network];
        if (url) window.open(url, '_blank', 'noopener,noreferrer,width=700,height=600');
      });
    });
  };

  const blogSelectColumns = 'id, author_id, slug, title, excerpt, content_html, category, reading_time, cover_image_url, cover_image_alt, seo_title, seo_description, status, published_at, created_at, updated_at';
  const blogImageFallbackMap = {
    'invoice-pricing-tips': '/assets/img/blog-pricing.svg',
    'client-invoicing-guide': '/assets/img/blog-client-guide.svg',
    'invoice-design-best-practices': '/assets/img/blog-design.svg'
  };

  const stripTags = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const toBlogPath = (slug) => `/blog/post/?slug=${encodeURIComponent(slug || '')}`;

  const normalizeArticleHtml = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '<p>No article content yet.</p>';
    if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
    return raw
      .split(/\n{2,}/)
      .map((block) => `<p>${escapeHTML(block).replaceAll('\n', '<br>')}</p>`)
      .join('');
  };

  const sanitizeArticleHtml = (value) => String(value || '').replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

  const resolveBlogCoverImage = (post) => {
    const direct = String(post.coverImage || post.cover_image_url || '').trim();
    if (direct) return direct;
    return blogImageFallbackMap[post.slug] || '/assets/img/blog-default.svg';
  };

  const normalizeFallbackBlogPost = (post) => {
    const publishedAt = post.date || new Date().toISOString().slice(0, 10);
    const contentHtml = normalizeArticleHtml(post.contentHtml || `<p>${escapeHTML(post.description || '')}</p>`);
    return {
      id: `fallback-${post.slug}`,
      slug: post.slug,
      title: post.title,
      description: post.description || '',
      contentHtml,
      category: post.category || 'General',
      readingTime: post.readingTime || '5 min read',
      coverImage: resolveBlogCoverImage(post),
      coverAlt: post.coverAlt || `${post.title} cover image`,
      seoTitle: post.title,
      seoDescription: post.description || '',
      status: 'published',
      date: publishedAt,
      updatedAt: publishedAt
    };
  };

  const mapBlogRowToPost = (row) => {
    const publishedAt = row.published_at || row.created_at || new Date().toISOString();
    const contentHtml = normalizeArticleHtml(row.content_html || row.excerpt || '');
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.excerpt || stripTags(contentHtml).slice(0, 190),
      contentHtml,
      category: row.category || 'General',
      readingTime: row.reading_time || '5 min read',
      coverImage: resolveBlogCoverImage({ slug: row.slug, coverImage: row.cover_image_url }),
      coverAlt: row.cover_image_alt || `${row.title} cover image`,
      seoTitle: row.seo_title || row.title,
      seoDescription: row.seo_description || row.excerpt || '',
      status: row.status || 'draft',
      date: String(publishedAt).slice(0, 10),
      updatedAt: row.updated_at || row.created_at || publishedAt
    };
  };

  const isMissingBlogTableError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return error?.code === '42P01' || (message.includes('blog_posts') && message.includes('does not exist'));
  };

  const getFallbackBlogPosts = () => (window.APP_DATA?.blogPosts || []).map(normalizeFallbackBlogPost);

  const fetchBlogPostsFromSupabase = async ({ includeDraft = false, onlyCurrentUser = false } = {}) => {
    if (!supabase) return null;

    let query = supabase
      .from('blog_posts')
      .select(blogSelectColumns)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (!includeDraft) query = query.eq('status', 'published');

    if (onlyCurrentUser) {
      const user = await authReady();
      if (!user) return [];
      query = query.eq('author_id', user.id);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingBlogTableError(error)) return null;
      notify('Blog error', error.message);
      return [];
    }

    return (data || []).map(mapBlogRowToPost);
  };

  const fetchBlogPostBySlug = async (slug, { includeDraft = false } = {}) => {
    if (!slug) return null;

    if (supabase) {
      let query = supabase.from('blog_posts').select(blogSelectColumns).eq('slug', slug).limit(1);
      if (!includeDraft) query = query.eq('status', 'published');

      const { data, error } = await query.maybeSingle();
      if (error && !isMissingBlogTableError(error)) {
        notify('Blog error', error.message);
      }
      if (data) return mapBlogRowToPost(data);
    }

    return getFallbackBlogPosts().find((post) => post.slug === slug) || null;
  };

  const getPublicBlogPosts = async () => {
    const cloudPosts = await fetchBlogPostsFromSupabase({ includeDraft: false });
    if (Array.isArray(cloudPosts) && cloudPosts.length) return cloudPosts;
    return getFallbackBlogPosts();
  };

  const blogCardMarkup = (post) => {
    const coverImage = resolveBlogCoverImage(post);
    const coverAlt = post.coverAlt || `${post.title} cover image`;
    const href = toBlogPath(post.slug);

    return `
      <article class="blog-card">
        <div class="thumb with-img"><img src="${escapeHTML(coverImage)}" alt="${escapeHTML(coverAlt)}" loading="lazy" decoding="async"></div>
        <div class="meta"><span>${escapeHTML(post.category)}</span><span>${dateFormat(post.date)}</span><span>${escapeHTML(post.readingTime)}</span></div>
        <h3><a href="${escapeHTML(href)}">${escapeHTML(post.title)}</a></h3>
        <p>${escapeHTML(post.description)}</p>
        <div class="inline-actions" style="margin-top:16px"><a class="btn btn-ghost" href="${escapeHTML(href)}">Read article</a></div>
      </article>
    `;
  };

  const populateBlogList = async () => {
    const list = $('[data-blog-list]');
    if (!list) return;
    const posts = await getPublicBlogPosts();
    list.innerHTML = posts.length
      ? posts.map(blogCardMarkup).join('')
      : '<article class="info-card"><h3>No posts yet</h3><p>Create your first post from /admin.</p></article>';
  };

  const populateSidebarArticles = async (currentSlug = '') => {
    const list = $('[data-related-posts]');
    if (!list) return;

    const posts = (await getPublicBlogPosts())
      .filter((post) => post.slug !== currentSlug)
      .slice(0, 3);

    list.innerHTML = posts.map((post) => `
      <a href="${escapeHTML(toBlogPath(post.slug))}" style="display:block;padding:12px 14px;border-radius:16px;border:1px solid var(--border);background:var(--bg-soft);font-weight:700">
        ${escapeHTML(post.title)}
      </a>
    `).join('');
  };

  const renderTemplatePreview = (draft) => {
    const preview = $('[data-invoice-preview]');
    if (!preview) return;

    const template = getTemplate(draft.template);
    const totals = getInvoiceTotals(draft);
    const status = totals.balanceDue <= 0 ? 'paid' : (draft.status || 'due');
    const logoMarkup = draft.logoDataUrl
      ? `<img src="${escapeHTML(draft.logoDataUrl)}" alt="${escapeHTML(draft.companyName || 'Company')} logo" class="preview-logo">`
      : '<img src="/assets/img/createinvoicefast-logo.svg" alt="CreateInvoiceFast logo" class="preview-logo">';

    preview.className = `invoice-preview ${draft.template}`;
    preview.style.setProperty('--template-accent', template.accent || '#22c55e');

    const rows = draft.items.map((item) => `
      <tr>
        <td>${escapeHTML(item.description)}</td>
        <td>${Number(item.quantity || 0)}</td>
        <td>${money(item.rate, draft.currency)}</td>
        <td>${money(Number(item.quantity || 0) * Number(item.rate || 0), draft.currency)}</td>
      </tr>
    `).join('');

    preview.innerHTML = `
      <div class="preview-head">
        <div class="preview-head-main">
          ${logoMarkup}
          <div>
            <div class="badge">${escapeHTML(template.name)} template</div>
            <h4 style="margin-top:12px;font-size:1.6rem">${escapeHTML(draft.companyName)}</h4>
            <div class="preview-meta">
              <span>${escapeHTML(draft.companyEmail)}</span>
              <span>${escapeHTML(draft.companyAddress)}</span>
            </div>
          </div>
        </div>
        <div class="preview-meta" style="text-align:right">
          <strong style="font-size:1.15rem">Invoice ${escapeHTML(draft.invoiceNumber)}</strong>
          <span>Issue date: ${dateFormat(draft.issueDate)}</span>
          <span>Due date: ${dateFormat(draft.dueDate)}</span>
          <span>Status: <span class="status ${escapeHTML(status)}">${escapeHTML(status)}</span></span>
        </div>
      </div>
      <div class="grid-2">
        <div>
          <h5 style="color:var(--muted);font-size:0.84rem;letter-spacing:0.08em;text-transform:uppercase">Bill To</h5>
          <strong>${escapeHTML(draft.clientName)}</strong>
          <div class="preview-meta">
            <span>${escapeHTML(draft.clientEmail)}</span>
            <span>${escapeHTML(draft.clientAddress)}</span>
            <span>Ship to: ${escapeHTML(draft.shipTo || draft.clientAddress || '—')}</span>
          </div>
        </div>
        <div>
          <h5 style="color:var(--muted);font-size:0.84rem;letter-spacing:0.08em;text-transform:uppercase">Project Details</h5>
          <strong>${escapeHTML(draft.projectName)}</strong>
          <div class="preview-meta">
            <span>Payment terms: ${escapeHTML(draft.paymentTerms || '—')}</span>
            <span>PO number: ${escapeHTML(draft.poNumber || '—')}</span>
            <span class="preview-kicker">Template accent: ${escapeHTML(template.accent)}</span>
          </div>
        </div>
      </div>
      <table class="line-table">
        <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="summary-box">
        <div class="summary-row"><span>Subtotal</span><strong>${money(totals.subtotal, draft.currency)}</strong></div>
        <div class="summary-row"><span>Discount</span><strong>- ${money(totals.discount, draft.currency)}</strong></div>
        <div class="summary-row"><span>Shipping</span><strong>${money(totals.shipping, draft.currency)}</strong></div>
        <div class="summary-row"><span>Tax</span><strong>${money(totals.tax, draft.currency)}</strong></div>
        <div class="summary-row"><span>Total</span><strong>${money(totals.total, draft.currency)}</strong></div>
        <div class="summary-row"><span>Amount paid</span><strong>${money(totals.amountPaid, draft.currency)}</strong></div>
        <div class="summary-row summary-row-balance"><span>Balance due</span><strong>${money(totals.balanceDue, draft.currency)}</strong></div>
      </div>
      <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)">
        <strong>Notes</strong>
        <p style="margin:8px 0 0;color:var(--muted)">${escapeHTML(draft.notes)}</p>
      </div>
    `;
  };

  const renderLineItems = (draft) => {
    const list = $('[data-items-list]');
    if (!list) return;
    list.innerHTML = draft.items.map((item, index) => `
      <div class="item-row" data-item-row="${index}">
        <div class="field"><label class="sr-only" for="item-description-${index}">Description</label><input id="item-description-${index}" data-item-field="description" data-item-index="${index}" value="${escapeHTML(item.description)}" placeholder="Item description"></div>
        <div class="field"><label class="sr-only" for="item-quantity-${index}">Quantity</label><input id="item-quantity-${index}" type="number" min="0" step="0.1" data-item-field="quantity" data-item-index="${index}" value="${Number(item.quantity || 0)}"></div>
        <div class="field"><label class="sr-only" for="item-rate-${index}">Rate</label><input id="item-rate-${index}" type="number" min="0" step="0.01" data-item-field="rate" data-item-index="${index}" value="${Number(item.rate || 0)}"></div>
        <button class="remove-item" type="button" data-remove-item="${index}" aria-label="Remove item">×</button>
      </div>
    `).join('');
  };

  const syncInvoiceFields = (draft) => {
    const mapping = {
      invoiceNumber: '[name="invoiceNumber"]',
      issueDate: '[name="issueDate"]',
      dueDate: '[name="dueDate"]',
      paymentTerms: '[name="paymentTerms"]',
      poNumber: '[name="poNumber"]',
      status: '[name="status"]',
      currency: '[name="currency"]',
      taxRate: '[name="taxRate"]',
      discount: '[name="discount"]',
      shipping: '[name="shipping"]',
      amountPaid: '[name="amountPaid"]',
      notes: '[name="notes"]',
      companyName: '[name="companyName"]',
      companyEmail: '[name="companyEmail"]',
      companyAddress: '[name="companyAddress"]',
      clientName: '[name="clientName"]',
      clientEmail: '[name="clientEmail"]',
      clientAddress: '[name="clientAddress"]',
      shipTo: '[name="shipTo"]',
      projectName: '[name="projectName"]'
    };

    Object.entries(mapping).forEach(([key, selector]) => {
      const field = $(selector);
      if (field && field.value !== String(draft[key] ?? '')) field.value = draft[key] ?? '';
    });
  };

  const readInvoiceForm = () => {
    const form = $('[data-invoice-form]');
    if (!form) return defaultDraft();
    const draft = getDraft();
    const formData = new FormData(form);
    const next = { ...draft };

    [
      'invoiceNumber', 'issueDate', 'dueDate', 'paymentTerms', 'poNumber', 'status', 'currency', 'taxRate',
      'discount', 'shipping', 'amountPaid', 'notes', 'template', 'companyName', 'companyEmail', 'companyAddress',
      'clientName', 'clientEmail', 'clientAddress', 'shipTo', 'projectName'
    ].forEach((key) => {
      const value = formData.get(key);
      if (value !== null) next[key] = value;
    });

    next.taxRate = Number(next.taxRate || 0);
    next.discount = Number(next.discount || 0);
    next.shipping = Number(next.shipping || 0);
    next.amountPaid = Number(next.amountPaid || 0);
    next.items = draft.items;
    return next;
  };

  const toInvoicePayload = (userId, draft, existingId = null) => {
    const totals = getInvoiceTotals(draft);
    const status = totals.balanceDue <= 0 ? 'paid' : (draft.status === 'draft' ? 'draft' : 'due');

    return {
      id: existingId || undefined,
      user_id: userId,
      invoice_number: draft.invoiceNumber,
      issue_date: draft.issueDate || null,
      due_date: draft.dueDate || null,
      status,
      currency: draft.currency,
      tax_rate: Number(draft.taxRate || 0),
      discount: Number(draft.discount || 0),
      company_name: draft.companyName,
      company_email: draft.companyEmail,
      company_address: draft.companyAddress,
      client_name: draft.clientName,
      client_email: draft.clientEmail,
      client_address: draft.clientAddress,
      project_name: draft.projectName,
      notes: draft.notes,
      template: draft.template,
      items: draft.items,
      totals: {
        ...totals,
        paymentTerms: draft.paymentTerms || '',
        poNumber: draft.poNumber || '',
        shipTo: draft.shipTo || '',
        logoDataUrl: draft.logoDataUrl || ''
      }
    };
  };

  const fromInvoiceRow = (row) => {
    const totals = row.totals || {};
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      status: row.status || 'due',
      currency: row.currency,
      taxRate: Number(row.tax_rate || 0),
      discount: Number(row.discount || 0),
      shipping: Number(totals.shipping || 0),
      amountPaid: Number(totals.amountPaid || 0),
      paymentTerms: totals.paymentTerms || '',
      poNumber: totals.poNumber || '',
      shipTo: totals.shipTo || '',
      logoDataUrl: totals.logoDataUrl || '',
      companyName: row.company_name || '',
      companyEmail: row.company_email || '',
      companyAddress: row.company_address || '',
      clientName: row.client_name || '',
      clientEmail: row.client_email || '',
      clientAddress: row.client_address || '',
      projectName: row.project_name || '',
      notes: row.notes || '',
      template: row.template || 'modern',
      items: Array.isArray(row.items) ? row.items : [],
      totals
    };
  };

  const saveInvoiceToSupabase = async () => {
    const user = await requireAuth('/invoice/');
    if (!user || !supabase) return;

    const draft = readInvoiceForm();
    const currentId = getCurrentInvoiceId();
    const payload = toInvoicePayload(user.id, draft, currentId || null);

    const { data, error } = await supabase
      .from('invoices')
      .upsert(payload)
      .select('id, invoice_number')
      .single();

    if (error) {
      notify('Save failed', error.message);
      return;
    }

    const clientKey = slugify(draft.clientEmail || draft.clientName || 'client');
    await supabase.from('clients').upsert({
      user_id: user.id,
      client_key: clientKey,
      name: draft.clientName || 'Client',
      email: draft.clientEmail || null,
      address: draft.clientAddress || null,
      last_invoice: draft.invoiceNumber,
      last_invoice_date: draft.issueDate || null
    }, { onConflict: 'user_id,client_key' });

    if (!currentId && data?.id) {
      const next = new URL(window.location.href);
      next.searchParams.set('invoice', data.id);
      history.replaceState(null, '', next.toString());
    }

    notify('Invoice saved', `Saved ${data?.invoice_number || draft.invoiceNumber} to your dashboard.`);
  };

  const bindInvoiceForm = () => {
    const form = $('[data-invoice-form]');
    if (!form) return;

    let draft = getDraft();
    const logoStatus = $('[data-logo-status]');
    const logoInput = $('[data-logo-upload]');
    const updateLogoStatus = (fileName = '') => {
      if (!logoStatus) return;
      if (draft.logoDataUrl) logoStatus.textContent = fileName ? `${fileName} ready` : 'Logo ready';
      else logoStatus.textContent = 'No logo selected';
    };
    const persistDraft = () => {
      saveDraft(draft);
      renderTemplatePreview(draft);
    };

    syncInvoiceFields(draft);
    renderLineItems(draft);
    renderTemplatePreview(draft);
    $$('.template-tab').forEach((button) => button.classList.toggle('is-active', button.dataset.template === draft.template));
    updateLogoStatus();
    setupShareButtons(draft.companyName, draft.projectName);

    const applyNamedField = (target) => {
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return false;
      if (!target.name) return false;
      const value = target.type === 'number' ? Number(target.value || 0) : target.value;
      draft = { ...draft, [target.name]: value };
      return true;
    };

    form.addEventListener('input', (event) => {
      if (!applyNamedField(event.target)) return;
      persistDraft();
    });

    form.addEventListener('change', (event) => {
      if (!applyNamedField(event.target)) return;
      persistDraft();
    });

    $('[data-items-list]')?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const index = Number(target.dataset.itemIndex);
      const field = target.dataset.itemField;
      if (!field || Number.isNaN(index)) return;
      draft.items[index] = { ...draft.items[index], [field]: field === 'description' ? target.value : Number(target.value) };
      persistDraft();
    });

    $('[data-items-list]')?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const removeIndex = target.dataset.removeItem;
      if (removeIndex === undefined) return;
      draft.items.splice(Number(removeIndex), 1);
      if (!draft.items.length) draft.items.push({ description: '', quantity: 1, rate: 0 });
      saveDraft(draft);
      renderLineItems(draft);
      renderTemplatePreview(draft);
    });

    $('[data-add-item]')?.addEventListener('click', () => {
      draft.items.push({ description: 'New service', quantity: 1, rate: 0 });
      saveDraft(draft);
      renderLineItems(draft);
      renderTemplatePreview(draft);
    });

    $('[data-template-tabs]')?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement) || !target.dataset.template) return;
      draft.template = target.dataset.template;
      saveDraft(draft);
      renderTemplatePreview(draft);
      $$('.template-tab').forEach((button) => button.classList.toggle('is-active', button.dataset.template === draft.template));
    });

    logoInput?.addEventListener('change', () => {
      const file = logoInput.files?.[0];
      if (!file) {
        draft.logoDataUrl = '';
        updateLogoStatus();
        persistDraft();
        return;
      }

      if (!file.type.startsWith('image/')) {
        notify('Invalid logo', 'Please select an image file.');
        logoInput.value = '';
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        notify('Logo too large', 'Please use an image smaller than 2MB.');
        logoInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        draft.logoDataUrl = typeof reader.result === 'string' ? reader.result : '';
        updateLogoStatus(file.name);
        persistDraft();
      };
      reader.onerror = () => notify('Upload failed', 'Could not read this image.');
      reader.readAsDataURL(file);
    });

    $('[data-clear-logo]')?.addEventListener('click', () => {
      draft.logoDataUrl = '';
      if (logoInput) logoInput.value = '';
      updateLogoStatus();
      persistDraft();
    });

    $('[data-reset-draft]')?.addEventListener('click', () => {
      draft = defaultDraft();
      if (logoInput) logoInput.value = '';
      saveDraft(draft);
      syncInvoiceFields(draft);
      renderLineItems(draft);
      renderTemplatePreview(draft);
      updateLogoStatus();
      $$('.template-tab').forEach((button) => button.classList.toggle('is-active', button.dataset.template === draft.template));
      notify('Draft reset', 'The invoice form was returned to default content.');
    });

    $('[data-save-invoice]')?.addEventListener('click', async () => saveInvoiceToSupabase());
    $('[data-download-pdf]')?.addEventListener('click', async () => downloadInvoicePDF(draft));
    $('[data-download-print]')?.addEventListener('click', () => printInvoice());
    $('[data-download-json]')?.addEventListener('click', () => downloadInvoiceJSON(draft));
    $('[data-download-csv]')?.addEventListener('click', () => downloadInvoiceCSV(draft));
    $('[data-download-png]')?.addEventListener('click', async () => downloadInvoicePNG(draft));
  };

  const populateInvoiceTemplatePicker = () => {
    const wrapper = $('[data-template-tabs]');
    if (!wrapper || !window.APP_DATA?.templates) return;
    const draft = getDraft();
    wrapper.innerHTML = window.APP_DATA.templates.map((template) => `
      <button class="template-tab ${template.id === draft.template ? 'is-active' : ''}" type="button" data-template="${template.id}">${escapeHTML(template.name)}</button>
    `).join('');
  };

  const populateInvoiceHeader = async () => {
    if (!supabase) return;
    const invoiceId = getCurrentInvoiceId();
    if (!invoiceId) return;

    const user = await requireAuth('/invoice/');
    if (!user) return;

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      notify('Load failed', error.message);
      return;
    }

    if (data) {
      const loaded = fromInvoiceRow(data);
      const draft = {
        ...defaultDraft(),
        ...loaded,
        items: loaded.items.length ? loaded.items : defaultDraft().items
      };
      saveDraft(draft);
      const title = $('[data-invoice-title]');
      if (title) title.textContent = `Edit invoice ${draft.invoiceNumber}`;
    }
  };

  const renderDashboard = async () => {
    const wrapper = $('[data-dashboard]');
    if (!wrapper) return;

    const user = await requireAuth('/dashboard/');
    if (!user || !supabase) return;

    const invoicesRes = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    const clientsRes = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (invoicesRes.error) {
      notify('Error', invoicesRes.error.message);
      return;
    }

    if (clientsRes.error) {
      notify('Error', clientsRes.error.message);
      return;
    }

    const invoices = invoicesRes.data || [];
    const clients = clientsRes.data || [];
    const totalBilled = invoices.reduce((sum, invoice) => sum + Number(invoice.totals?.total || 0), 0);
    const totalPaid = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.totals?.total || 0), 0);
    const dueCount = invoices.filter((invoice) => invoice.status !== 'paid').length;

    const stats = $('[data-dashboard-stats]');
    if (stats) {
      stats.innerHTML = `
        <div class="summary-card"><strong>${invoices.length}</strong><span>Invoices created</span></div>
        <div class="summary-card"><strong>${clients.length}</strong><span>Clients tracked</span></div>
        <div class="summary-card"><strong>${money(totalBilled)}</strong><span>Total billed</span></div>
        <div class="summary-card"><strong>${money(totalPaid)}</strong><span>Collected</span></div>
      `;
    }

    const invoicesTable = $('[data-dashboard-invoices]');
    if (invoicesTable) {
      invoicesTable.innerHTML = invoices.length ? invoices.map((invoice) => `
        <tr>
          <td><strong>${escapeHTML(invoice.invoice_number)}</strong><br><span class="field-hint">${escapeHTML(invoice.project_name || 'Invoice project')}</span></td>
          <td>${escapeHTML(invoice.client_name || '')}</td>
          <td>${dateFormat(invoice.issue_date)}<br><span class="field-hint">Due ${dateFormat(invoice.due_date)}</span></td>
          <td>${money(invoice.totals?.total || 0, invoice.currency || 'USD')}</td>
          <td><span class="status ${invoice.status || 'due'}">${escapeHTML(invoice.status || 'due')}</span></td>
          <td>
            <div class="table-actions">
              <a class="btn btn-ghost" href="/invoice/?invoice=${encodeURIComponent(invoice.id)}">Edit</a>
              <button class="btn btn-ghost" data-mark-paid="${invoice.id}">Mark paid</button>
              <button class="btn btn-ghost" data-delete-invoice="${invoice.id}">Delete</button>
            </div>
          </td>
        </tr>
      `).join('') : '<tr><td colspan="6">No invoices yet. Create the first invoice from the generator.</td></tr>';
    }

    const clientsTable = $('[data-dashboard-clients]');
    if (clientsTable) {
      clientsTable.innerHTML = clients.length ? clients.map((client) => `
        <tr>
          <td><strong>${escapeHTML(client.name)}</strong><br><span class="field-hint">${escapeHTML(client.email || '')}</span></td>
          <td>${escapeHTML(client.address || '—')}</td>
          <td>${escapeHTML(client.last_invoice || '—')}</td>
          <td>${dateFormat(client.last_invoice_date)}</td>
        </tr>
      `).join('') : '<tr><td colspan="4">No clients saved yet.</td></tr>';
    }

    const summary = $('[data-dashboard-summary-text]');
    if (summary) summary.textContent = `${dueCount} invoices currently pending payment.`;

    wrapper.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.deleteInvoice) {
        await supabase.from('invoices').delete().eq('id', target.dataset.deleteInvoice).eq('user_id', user.id);
        notify('Invoice deleted', 'The record was removed.');
        renderDashboard();
      }

      if (target.dataset.markPaid) {
        await supabase.from('invoices').update({ status: 'paid' }).eq('id', target.dataset.markPaid).eq('user_id', user.id);
        notify('Invoice updated', 'The invoice status is now paid.');
        renderDashboard();
      }
    }, { once: true });
  };

  const bindAuthForms = () => {
    const signup = $('[data-signup-form]');
    const login = $('[data-login-form]');

    if (signup) {
      signup.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!supabase) {
          notify('Supabase missing', 'Supabase client is not configured.');
          return;
        }

        const form = new FormData(signup);
        const name = String(form.get('name') || '').trim();
        const email = String(form.get('email') || '').trim().toLowerCase();
        const password = String(form.get('password') || '');

        if (!name || !email || password.length < 6) {
          notify('Check your details', 'Use valid name, email, and password with at least 6 characters.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });

        if (error) {
          notify('Sign up failed', error.message);
          return;
        }

        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: name });
        }

        notify('Account created', 'Your account is ready. If email confirmation is enabled, verify before login.');
        if (data.session) window.location.href = '/dashboard/';
        else window.location.href = '/login/';
      });
    }

    if (login) {
      login.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!supabase) {
          notify('Supabase missing', 'Supabase client is not configured.');
          return;
        }

        const form = new FormData(login);
        const email = String(form.get('email') || '').trim().toLowerCase();
        const password = String(form.get('password') || '');

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          notify('Login failed', error.message);
          return;
        }

        const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/dashboard/';
        window.location.href = returnTo;
      });
    }
  };

  const bindContactForm = () => {
    const form = $('[data-contact-form]');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const message = String(formData.get('message') || '').trim();
      if (!name || !email || !message) {
        notify('Missing fields', 'Please complete the contact form before sending.');
        return;
      }
      const mailto = `mailto:${window.APP_DATA.site.email}?subject=${encodeURIComponent(`Website inquiry from ${name}`)}&body=${encodeURIComponent(`${message}\n\nReply to: ${email}`)}`;
      window.location.href = mailto;
    });
  };

  const populateFeatureCards = () => {
    const grid = $('[data-feature-grid]');
    if (!grid || !window.APP_DATA?.features) return;
    grid.innerHTML = window.APP_DATA.features.map((feature) => `
      <article class="feature-card">
        <div class="feature-icon">${escapeHTML(feature.icon)}</div>
        <h3>${escapeHTML(feature.title)}</h3>
        <p>${escapeHTML(feature.text)}</p>
      </article>
    `).join('');
  };

  const templateMiniPreviewMarkup = (template) => {
    const templateId = template.id;
    const accent = template.accent || '#22c55e';
    const lines = `
      <div class="template-mini-line"><span>Design retainer</span><span>$1,320.00</span></div>
      <div class="template-mini-line"><span>Frontend QA</span><span>$1,320.00</span></div>
    `;
    const totalBlock = '<div class="template-mini-total"><span>Total</span><strong>$2,640.00</strong></div>';

    if (templateId === 'executive') {
      return `
        <div class="template-mini-preview invoice-preview executive" style="--template-accent:${escapeHTML(accent)}">
          <div class="mini-exec-head">
            <span class="mini-brand">Northline Creative</span>
            <span class="mini-inv">INV-112</span>
          </div>
          <div class="template-mini-body">
            <div class="template-mini-lines">${lines}</div>
            ${totalBlock}
          </div>
        </div>
      `;
    }

    return `
      <div class="template-mini-preview invoice-preview ${escapeHTML(templateId)}" style="--template-accent:${escapeHTML(accent)}">
        <div class="mini-row-top">
          <span class="mini-brand">Northline Creative</span>
          <span class="mini-inv">INV-2026-112</span>
        </div>
        <div class="template-mini-lines">${lines}</div>
        ${totalBlock}
      </div>
    `;
  };

  const populateTemplateShowcase = () => {
    const grid = $('[data-template-showcase]');
    if (!grid || !window.APP_DATA?.templates) return;
    grid.innerHTML = window.APP_DATA.templates.map((template) => `
      <article class="template-showcase-card">
        <div class="template-showcase-frame">
          ${templateMiniPreviewMarkup(template)}
        </div>
        <div class="template-showcase-meta">
          <h3>${escapeHTML(template.name)}</h3>
          <p>${escapeHTML(template.summary)}</p>
          <div class="template-showcase-footer">
            <span class="template-accent-swatch"><i style="background:${escapeHTML(template.accent)}"></i> Brand accent</span>
            <a class="btn btn-secondary" href="/invoice/">Use in editor</a>
          </div>
        </div>
      </article>
    `).join('');
  };

  const populateFaq = () => {
    const list = $('[data-faq-list]');
    if (!list || !window.APP_DATA?.faq) return;
    list.innerHTML = window.APP_DATA.faq.map((entry) => `
      <details class="feature-card">
        <summary style="font-weight:800;cursor:pointer">${escapeHTML(entry.question)}</summary>
        <p style="margin-top:10px">${escapeHTML(entry.answer)}</p>
      </details>
    `).join('');
  };

  const resolveArticleSlug = () => new URLSearchParams(window.location.search).get('slug') || document.body.dataset.slug || '';

  const renderArticlePagePost = (post) => {
    const titleNode = $('[data-article-title]');
    if (titleNode) titleNode.textContent = post.title;

    const metaNode = $('[data-article-meta]');
    if (metaNode) metaNode.textContent = `${post.category} · ${dateFormat(post.date)} · ${post.readingTime}`;

    const categoryNode = $('[data-article-category]');
    if (categoryNode) categoryNode.textContent = post.category;

    const readingTimeNode = $('[data-article-reading-time]');
    if (readingTimeNode) readingTimeNode.textContent = post.readingTime;

    const dateNode = $('[data-article-date]');
    if (dateNode) dateNode.textContent = dateFormat(post.date);

    const coverNode = $('[data-article-cover]');
    if (coverNode) {
      const image = resolveBlogCoverImage(post);
      const alt = post.coverAlt || `${post.title} cover image`;
      coverNode.innerHTML = `<img src="${escapeHTML(image)}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async">`;
    }

    const contentNode = $('[data-article-content]');
    if (contentNode) {
      contentNode.innerHTML = sanitizeArticleHtml(normalizeArticleHtml(post.contentHtml));
    }

    const description = post.seoDescription || post.description || '';
    document.title = `${post.seoTitle || post.title} | CreateInvoiceFast`;
    const descriptionMeta = $('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.setAttribute('content', description);

    setupShareButtons(post.title, description);
  };

  const populateArticlePage = async () => {
    const slug = resolveArticleSlug();
    if (!slug) return;

    const post = await fetchBlogPostBySlug(slug, { includeDraft: false });
    if (!post) {
      const contentNode = $('[data-article-content]');
      if (contentNode) {
        contentNode.innerHTML = '<p>This article was not found. Please return to the blog list.</p>';
      }
      return;
    }

    renderArticlePagePost(post);
    await populateSidebarArticles(post.slug);
  };

  const defaultAdminPost = () => ({
    id: '',
    title: '',
    slug: '',
    description: '',
    contentHtml: '<p>Start writing your article...</p>',
    category: 'General',
    readingTime: '5 min read',
    coverImage: '/assets/img/blog-default.svg',
    coverAlt: 'Blog cover image',
    seoTitle: '',
    seoDescription: '',
    status: 'draft',
    date: new Date().toISOString().slice(0, 10)
  });

  const toBlogPayload = (userId, post, forceStatus = null) => {
    const status = forceStatus || post.status || 'draft';
    const publishDate = post.date || new Date().toISOString().slice(0, 10);
    const publishedAt = status === 'published'
      ? new Date(`${publishDate}T12:00:00Z`).toISOString()
      : null;

    return {
      id: post.id || undefined,
      author_id: userId,
      slug: post.slug,
      title: post.title,
      excerpt: post.description,
      content_html: normalizeArticleHtml(post.contentHtml),
      category: post.category || 'General',
      reading_time: post.readingTime || '5 min read',
      cover_image_url: post.coverImage || resolveBlogCoverImage(post),
      cover_image_alt: post.coverAlt || `${post.title} cover image`,
      seo_title: post.seoTitle || post.title,
      seo_description: post.seoDescription || post.description,
      status,
      published_at: publishedAt
    };
  };

  const readAdminFormDraft = (form) => {
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const slugInput = String(formData.get('slug') || '').trim();
    const slug = slugify(slugInput || title);
    const contentHtml = String(formData.get('contentHtml') || '').trim();
    const description = String(formData.get('description') || '').trim() || stripTags(contentHtml).slice(0, 190);

    return {
      id: String(formData.get('id') || ''),
      title,
      slug,
      description,
      contentHtml,
      category: String(formData.get('category') || 'General').trim() || 'General',
      readingTime: String(formData.get('readingTime') || '5 min read').trim() || '5 min read',
      coverImage: String(formData.get('coverImage') || '').trim(),
      coverAlt: String(formData.get('coverAlt') || '').trim(),
      seoTitle: String(formData.get('seoTitle') || '').trim(),
      seoDescription: String(formData.get('seoDescription') || '').trim(),
      status: String(formData.get('status') || 'draft') === 'published' ? 'published' : 'draft',
      date: String(formData.get('date') || new Date().toISOString().slice(0, 10)).slice(0, 10)
    };
  };

  const setAdminStatusBadge = (status) => {
    const badge = $('[data-admin-status-badge]');
    if (!badge) return;
    const normalized = status === 'published' ? 'published' : 'draft';
    badge.textContent = normalized === 'published' ? 'Published' : 'Draft';
    badge.classList.remove('published', 'draft');
    badge.classList.add(normalized);
  };

  const writeAdminFormDraft = (form, post) => {
    const draft = { ...defaultAdminPost(), ...post };
    const setValue = (name, value) => {
      const input = form.elements.namedItem(name);
      if (!input) return;
      input.value = value ?? '';
    };

    setValue('id', draft.id || '');
    setValue('title', draft.title);
    setValue('slug', draft.slug);
    setValue('description', draft.description);
    setValue('contentHtml', draft.contentHtml);
    setValue('category', draft.category);
    setValue('readingTime', draft.readingTime);
    setValue('coverImage', draft.coverImage);
    setValue('coverAlt', draft.coverAlt);
    setValue('seoTitle', draft.seoTitle);
    setValue('seoDescription', draft.seoDescription);
    setValue('status', draft.status);
    setValue('date', draft.date);

    setAdminStatusBadge(draft.status);

    const liveLink = $('[data-admin-open-live]');
    if (liveLink) {
      liveLink.href = draft.slug ? toBlogPath(draft.slug) : '/blog/';
    }
  };

  const renderAdminPreview = (post) => {
    const preview = $('[data-admin-preview-card]');
    if (!preview) return;

    const draft = { ...defaultAdminPost(), ...post };
    const image = resolveBlogCoverImage(draft);
    const alt = draft.coverAlt || `${draft.title || 'Blog'} cover image`;
    preview.innerHTML = `
      <figure class="article-cover">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async">
      </figure>
      <div class="post-meta"><span>${escapeHTML(draft.category)}</span><span>${escapeHTML(draft.readingTime)}</span><span>${dateFormat(draft.date)}</span></div>
      <h1 style="font-size:clamp(1.6rem,3vw,2.4rem)">${escapeHTML(draft.title || 'Untitled post')}</h1>
      <p class="lead" style="margin:10px 0 0">${escapeHTML(draft.description || 'Add a short summary for blog cards and SEO snippets.')}</p>
      <div class="content" style="margin-top:16px">${sanitizeArticleHtml(normalizeArticleHtml(draft.contentHtml))}</div>
    `;
  };

  const renderAdminPostList = (state) => {
    const list = $('[data-admin-post-list]');
    if (!list) return;

    const query = (state.query || '').trim().toLowerCase();
    const filter = state.filter || 'all';
    const posts = state.posts.filter((post) => {
      const filterOk = filter === 'all' || post.status === filter;
      const text = `${post.title} ${post.slug} ${post.category}`.toLowerCase();
      const queryOk = !query || text.includes(query);
      return filterOk && queryOk;
    });

    const counter = $('[data-admin-count]');
    if (counter) counter.textContent = String(posts.length);

    if (!posts.length) {
      list.innerHTML = '<p class="kicker">No posts matched this filter.</p>';
      return;
    }

    list.innerHTML = posts.map((post) => `
      <button class="admin-post-item ${post.id === state.activeId ? 'is-active' : ''}" type="button" data-admin-post-id="${escapeHTML(post.id)}">
        <strong>${escapeHTML(post.title)}</strong>
        <small>/${escapeHTML(post.slug)}</small>
        <div class="admin-post-meta">
          <span class="admin-status-chip ${escapeHTML(post.status)}">${escapeHTML(post.status)}</span>
          <small>${escapeHTML(post.category)} · ${dateFormat(post.date)}</small>
        </div>
      </button>
    `).join('');
  };

  const initAdminPage = async () => {
    if (document.body.dataset.page !== 'admin') return;

    const root = $('[data-admin-root]');
    const form = $('[data-admin-form]');
    if (!root || !form) return;

    const user = await requireAuth('/admin/');
    if (!user) return;

    const state = {
      posts: [],
      activeId: '',
      query: '',
      filter: 'all',
      schemaReady: true
    };

    const reloadPosts = async () => {
      const cloudPosts = await fetchBlogPostsFromSupabase({ includeDraft: true, onlyCurrentUser: true });
      if (cloudPosts === null) {
        state.schemaReady = false;
        state.posts = getFallbackBlogPosts();
        const warning = $('[data-admin-schema-warning]');
        if (warning) warning.classList.remove('hidden');
        return;
      }

      state.schemaReady = true;
      state.posts = cloudPosts;
      const warning = $('[data-admin-schema-warning]');
      if (warning) warning.classList.add('hidden');
    };

    const selectPost = (post) => {
      const draft = post || defaultAdminPost();
      state.activeId = draft.id || '';
      writeAdminFormDraft(form, draft);
      renderAdminPreview(draft);
      renderAdminPostList(state);
    };

    const savePost = async (forceStatus = null) => {
      if (!state.schemaReady) {
        notify('Setup required', 'Run supabase/schema.sql first to enable blog management.');
        return;
      }

      const draft = readAdminFormDraft(form);
      if (!draft.title) {
        notify('Title required', 'Please enter a post title.');
        return;
      }
      if (!draft.slug) {
        notify('Slug required', 'Please enter a valid slug using letters and hyphens.');
        return;
      }

      const payload = toBlogPayload(user.id, draft, forceStatus);
      const { data, error } = await supabase
        .from('blog_posts')
        .upsert(payload)
        .select(blogSelectColumns)
        .single();

      if (error) {
        if (error.code === '23505') {
          notify('Slug already used', 'Choose a unique slug for this post.');
          return;
        }
        notify('Save failed', error.message);
        return;
      }

      const saved = mapBlogRowToPost(data);
      const index = state.posts.findIndex((post) => post.id === saved.id);
      if (index >= 0) state.posts[index] = saved;
      else state.posts.unshift(saved);

      notify('Post saved', `${saved.title} was saved successfully.`);
      selectPost(saved);
    };

    const deletePost = async () => {
      const draft = readAdminFormDraft(form);
      if (!draft.id) {
        notify('No saved post', 'Save the post first before deleting.');
        return;
      }
      if (!window.confirm('Delete this post permanently?')) return;

      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', draft.id)
        .eq('author_id', user.id);

      if (error) {
        notify('Delete failed', error.message);
        return;
      }

      state.posts = state.posts.filter((post) => post.id !== draft.id);
      notify('Post deleted', 'The article was removed.');
      selectPost(state.posts[0] || defaultAdminPost());
    };

    const importStarterPosts = async () => {
      if (!state.schemaReady) {
        notify('Setup required', 'Run supabase/schema.sql first to enable blog management.');
        return;
      }

      const starters = getFallbackBlogPosts();
      const payloads = starters.map((post) => toBlogPayload(user.id, { ...post, id: '' }, 'published'));
      const { error } = await supabase.from('blog_posts').upsert(payloads, { onConflict: 'slug' });
      if (error) {
        notify('Import failed', error.message);
        return;
      }

      notify('Starter posts imported', 'Default articles are now editable in this admin panel.');
      await reloadPosts();
      selectPost(state.posts[0] || defaultAdminPost());
    };

    await reloadPosts();
    selectPost(state.posts[0] || defaultAdminPost());

    form.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;

      if (target.name === 'title') {
        const slugField = form.elements.namedItem('slug');
        if (slugField instanceof HTMLInputElement && !slugField.value.trim()) {
          slugField.value = slugify(target.value);
        }
      }

      const draft = readAdminFormDraft(form);
      setAdminStatusBadge(draft.status);
      renderAdminPreview(draft);
    });

    $('[data-admin-post-list]')?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-admin-post-id]');
      if (!(button instanceof HTMLElement)) return;
      const id = button.dataset.adminPostId || '';
      const post = state.posts.find((entry) => entry.id === id);
      if (post) selectPost(post);
    });

    $('[data-admin-search]')?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      state.query = target.value;
      renderAdminPostList(state);
    });

    $$('[data-admin-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.adminFilter || 'all';
        $$('[data-admin-filter]').forEach((entry) => entry.classList.toggle('is-active', entry === button));
        renderAdminPostList(state);
      });
    });

    $('[data-admin-new]')?.addEventListener('click', () => selectPost(defaultAdminPost()));
    $('[data-admin-save]')?.addEventListener('click', async () => savePost(null));
    $('[data-admin-publish]')?.addEventListener('click', async () => savePost('published'));
    $('[data-admin-delete]')?.addEventListener('click', async () => deletePost());
    $('[data-admin-seed]')?.addEventListener('click', async () => importStarterPosts());
    $('[data-admin-preview]')?.addEventListener('click', () => renderAdminPreview(readAdminFormDraft(form)));
  };

  const initInvoiceSection = async () => {
    if (document.body.dataset.page !== 'invoice') return;
    populateInvoiceTemplatePicker();
    await populateInvoiceHeader();
    bindInvoiceForm();
  };

  const initLandingWorkbench = () => {
    if (document.body.dataset.page !== 'home') return;

    const search = $('[data-landing-search]');
    const rows = $$('.landing-invoice-row');
    const emptyMsg = $('[data-landing-empty]');
    if (!search && rows.length === 0) return;
    let currentStatus = 'all';

    const updateRowVisibility = () => {
      const q = (search?.value || '').trim().toLowerCase();
      let anyVisible = false;
      rows.forEach((row) => {
        const st = row.dataset.status || '';
        const statusOk =
          currentStatus === 'all' ||
          (currentStatus === 'archived' ? false : st === currentStatus);
        const textOk = !q || row.textContent.toLowerCase().includes(q);
        const visible = statusOk && textOk;
        row.hidden = !visible;
        if (visible) anyVisible = true;
      });
      if (emptyMsg) {
        const showEmpty = rows.length > 0 && !anyVisible;
        emptyMsg.classList.toggle('hidden', !showEmpty);
      }
    };

    $$('[data-landing-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentStatus = btn.dataset.landingStatus || 'all';
        $$('[data-landing-status]').forEach((b) => b.classList.toggle('is-active', b === btn));
        updateRowVisibility();
      });
    });

    search?.addEventListener('input', updateRowVisibility);

    $$('[data-landing-detail-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.landingDetailTab;
        $$('[data-landing-detail-tab]').forEach((t) => {
          const on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        $$('[data-landing-detail-panel]').forEach((panel) => {
          const on = panel.dataset.landingDetailPanel === name;
          panel.hidden = !on;
        });
      });
    });

    updateRowVisibility();
  };

  const initHomePage = () => {
    if (document.body.dataset.page !== 'home') return;
    populateFeatureCards();
    populateTemplateShowcase();
    populateFaq();
    initLandingWorkbench();
    setupShareButtons('CreateInvoiceFast', 'Invoice generator, dashboards, blog, and billing templates');
  };

  const initBlogIndex = async () => {
    if (document.body.dataset.page !== 'blog-index') return;
    await populateBlogList();
  };

  const initBlogArticle = async () => {
    if (document.body.dataset.page !== 'blog-article') return;
    await populateArticlePage();
  };

  const initDashboardPage = async () => {
    if (document.body.dataset.page !== 'dashboard') return;
    await renderDashboard();
  };

  const initAuthPages = () => {
    if (!['login', 'signup'].includes(document.body.dataset.page || '')) return;
    bindAuthForms();
  };

  const initContactPage = () => {
    if (document.body.dataset.page !== 'contact') return;
    bindContactForm();
  };

  const init = async () => {
    if (!supabase) {
      console.warn('Supabase config missing. Auth and cloud data features are disabled.');
    }

    initTheme();
    setYear();
    highlightCurrentNav();
    await renderAuthState();
    initHomePage();
    await initInvoiceSection();
    await initDashboardPage();
    initAuthPages();
    initContactPage();
    await initBlogIndex();
    await initBlogArticle();
    await initAdminPage();
  };

  document.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => {
      console.error(error);
      notify('Unexpected error', 'Something went wrong while initializing the app.');
    });
  });
})();
