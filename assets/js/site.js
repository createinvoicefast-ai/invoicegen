(() => {
  const storageKeys = {
    accounts: 'createinvoicefast-accounts',
    currentUser: 'createinvoicefast-current-user',
    theme: 'createinvoicefast-theme',
    invoiceDraft: 'createinvoicefast-invoice-draft'
  };

  const defaultDraft = () => ({
    invoiceNumber: 'INV-2026-001',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    currency: 'USD',
    taxRate: 10,
    discount: 0,
    notes: 'Thank you for your business. Payment is due within 14 days.',
    template: 'modern',
    companyName: 'CreateInvoiceFast Studio',
    companyEmail: 'billing@example.com',
    companyAddress: '88 Market Street, Suite 400, San Francisco, CA',
    clientName: 'Acme Co.',
    clientEmail: 'accounts@acme.com',
    clientAddress: '1200 Mission Street, San Francisco, CA',
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

  const uid = (prefix = 'inv') => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const loadAccounts = () => readJSON(storageKeys.accounts, []);
  const saveAccounts = (accounts) => writeJSON(storageKeys.accounts, accounts);
  const currentEmail = () => localStorage.getItem(storageKeys.currentUser) || '';
  const setCurrentEmail = (email) => localStorage.setItem(storageKeys.currentUser, email);
  const clearCurrentEmail = () => localStorage.removeItem(storageKeys.currentUser);

  const getAccount = () => loadAccounts().find((account) => account.email === currentEmail()) || null;
  const findAccount = (email) => loadAccounts().find((account) => account.email === email) || null;

  const upsertAccount = (account) => {
    const accounts = loadAccounts();
    const index = accounts.findIndex((entry) => entry.email === account.email);
    if (index >= 0) {
      accounts[index] = account;
    } else {
      accounts.unshift(account);
    }
    saveAccounts(accounts);
    return account;
  };

  const sha256 = async (value) => {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };

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

  const getDraftKey = () => {
    const email = currentEmail() || 'guest';
    return `${storageKeys.invoiceDraft}:${email}`;
  };

  const getDraft = () => {
    const draft = readJSON(getDraftKey(), null);
    return draft ? { ...defaultDraft(), ...draft } : defaultDraft();
  };

  const saveDraft = (draft) => writeJSON(getDraftKey(), draft);

  const getInvoiceTotals = (draft) => {
    const subtotal = draft.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
    const discount = Number(draft.discount || 0);
    const taxable = Math.max(subtotal - discount, 0);
    const tax = taxable * (Number(draft.taxRate || 0) / 100);
    const total = taxable + tax;
    return { subtotal, discount, tax, total };
  };

  const getCurrentInvoiceId = () => new URLSearchParams(window.location.search).get('invoice') || '';

  const getCurrentInvoice = (account) => {
    const invoiceId = getCurrentInvoiceId();
    if (!account || !invoiceId) return null;
    return (account.invoices || []).find((invoice) => invoice.id === invoiceId) || null;
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    const toggle = $('[data-theme-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-label', `Theme: ${theme}`);
    }
  };

  const setTheme = (value, persist = true) => {
    const nextTheme = value === 'light' || value === 'dark' ? value : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(nextTheme);
    if (persist) {
      localStorage.setItem(storageKeys.theme, value || 'system');
    }
  };

  const initTheme = () => {
    const stored = localStorage.getItem(storageKeys.theme) || 'system';
    if (stored === 'system') {
      setTheme('system', false);
    } else {
      setTheme(stored);
    }
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
      about: '/about/',
      contact: '/contact/',
      privacy: '/privacy/',
      terms: '/terms/'
    };
    const activeHref = activeMap[page] || '';
    $$('.nav-links a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      const isActive = activeHref ? href === activeHref : false;
      if (isActive) link.classList.add('is-active');
    });
  };

  const renderAuthState = () => {
    const account = getAccount();
    $$('.js-auth-greeting').forEach((node) => {
      node.textContent = account ? `Hi, ${account.name.split(' ')[0]}` : 'Welcome';
    });
    $$('.js-auth-name').forEach((node) => {
      node.textContent = account ? account.name : 'Guest';
    });
    $$('.js-auth-email').forEach((node) => {
      node.textContent = account ? account.email : 'Not signed in';
    });
    $$('.js-auth-nav').forEach((node) => {
      node.classList.toggle('hidden', !account);
    });
    $$('.js-guest-nav').forEach((node) => {
      node.classList.toggle('hidden', !!account);
    });
    $$('.js-sign-out').forEach((node) => {
      node.addEventListener('click', () => {
        clearCurrentEmail();
        notify('Signed out', 'Your session was cleared on this device.');
        setTimeout(() => window.location.href = '../index.html', 400);
      });
    });
  };

  const populateBlogList = () => {
    const list = $('[data-blog-list]');
    if (!list || !window.APP_DATA?.blogPosts) return;
    list.innerHTML = window.APP_DATA.blogPosts.map((post) => `
      <article class="blog-card">
        <div class="thumb" aria-hidden="true"></div>
        <div class="meta"><span>${escapeHTML(post.category)}</span><span>${dateFormat(post.date)}</span><span>${escapeHTML(post.readingTime)}</span></div>
        <h3><a href="${escapeHTML(post.slug)}/">${escapeHTML(post.title)}</a></h3>
        <p>${escapeHTML(post.description)}</p>
        <div class="inline-actions" style="margin-top:16px"><a class="btn btn-ghost" href="${escapeHTML(post.slug)}/">Read article</a></div>
      </article>
    `).join('');
  };

  const populateSidebarArticles = () => {
    const list = $('[data-related-posts]');
    if (!list || !window.APP_DATA?.blogPosts) return;
    const currentSlug = document.body.dataset.slug || '';
    const posts = window.APP_DATA.blogPosts.filter((post) => post.slug !== currentSlug).slice(0, 3);
    list.innerHTML = posts.map((post) => `
      <a class="social-buttons-link" href="../${post.slug}/" style="display:block;padding:12px 14px;border-radius:16px;border:1px solid var(--border);background:var(--bg-soft);font-weight:700">
        ${escapeHTML(post.title)}
      </a>
    `).join('');
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

  const renderTemplatePreview = (draft) => {
    const preview = $('[data-invoice-preview]');
    if (!preview) return;
    const template = getTemplate(draft.template);
    const totals = getInvoiceTotals(draft);
    preview.className = `invoice-preview ${draft.template}`;
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
        <div>
          <div class="badge">${escapeHTML(template.name)} template</div>
          <h4 style="margin-top:12px;font-size:1.6rem">${escapeHTML(draft.companyName)}</h4>
          <div class="preview-meta">
            <span>${escapeHTML(draft.companyEmail)}</span>
            <span>${escapeHTML(draft.companyAddress)}</span>
          </div>
        </div>
        <div class="preview-meta" style="text-align:right">
          <strong style="font-size:1.15rem">Invoice ${escapeHTML(draft.invoiceNumber)}</strong>
          <span>Issue date: ${dateFormat(draft.issueDate)}</span>
          <span>Due date: ${dateFormat(draft.dueDate)}</span>
        </div>
      </div>
      <div class="grid-2">
        <div>
          <h5 style="color:var(--muted);font-size:0.84rem;letter-spacing:0.08em;text-transform:uppercase">Bill To</h5>
          <strong>${escapeHTML(draft.clientName)}</strong>
          <div class="preview-meta">
            <span>${escapeHTML(draft.clientEmail)}</span>
            <span>${escapeHTML(draft.clientAddress)}</span>
          </div>
        </div>
        <div>
          <h5 style="color:var(--muted);font-size:0.84rem;letter-spacing:0.08em;text-transform:uppercase">Project</h5>
          <strong>${escapeHTML(draft.projectName)}</strong>
          <div class="preview-meta">
            <span>Template accent: ${escapeHTML(template.accent)}</span>
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
        <div class="summary-row"><span>Tax</span><strong>${money(totals.tax, draft.currency)}</strong></div>
        <div class="summary-row"><span>Total due</span><strong>${money(totals.total, draft.currency)}</strong></div>
      </div>
      <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)">
        <strong>Notes</strong>
        <p style="margin:8px 0 0;color:var(--muted)">${escapeHTML(draft.notes)}</p>
      </div>
    `;

    const totalsEl = $('[data-invoice-total]');
    if (totalsEl) totalsEl.textContent = money(totals.total, draft.currency);
  };

  const renderLineItems = (draft) => {
    const list = $('[data-items-list]');
    if (!list) return;
    list.innerHTML = draft.items.map((item, index) => `
      <div class="item-row" data-item-row="${index}">
        <div class="field">
          <label class="sr-only" for="item-description-${index}">Description</label>
          <input id="item-description-${index}" data-item-field="description" data-item-index="${index}" value="${escapeHTML(item.description)}" placeholder="Item description">
        </div>
        <div class="field">
          <label class="sr-only" for="item-quantity-${index}">Quantity</label>
          <input id="item-quantity-${index}" type="number" min="0" step="0.1" data-item-field="quantity" data-item-index="${index}" value="${Number(item.quantity || 0)}" placeholder="Qty">
        </div>
        <div class="field">
          <label class="sr-only" for="item-rate-${index}">Rate</label>
          <input id="item-rate-${index}" type="number" min="0" step="0.01" data-item-field="rate" data-item-index="${index}" value="${Number(item.rate || 0)}" placeholder="Rate">
        </div>
        <button class="remove-item" type="button" data-remove-item="${index}" aria-label="Remove item">×</button>
      </div>
    `).join('');
  };

  const syncInvoiceFields = (draft) => {
    const mapping = {
      invoiceNumber: '[name="invoiceNumber"]',
      issueDate: '[name="issueDate"]',
      dueDate: '[name="dueDate"]',
      currency: '[name="currency"]',
      taxRate: '[name="taxRate"]',
      discount: '[name="discount"]',
      notes: '[name="notes"]',
      template: '[name="template"]',
      companyName: '[name="companyName"]',
      companyEmail: '[name="companyEmail"]',
      companyAddress: '[name="companyAddress"]',
      clientName: '[name="clientName"]',
      clientEmail: '[name="clientEmail"]',
      clientAddress: '[name="clientAddress"]',
      projectName: '[name="projectName"]'
    };

    Object.entries(mapping).forEach(([key, selector]) => {
      const field = $(selector);
      if (field && field.value !== String(draft[key] ?? '')) {
        field.value = draft[key] ?? '';
      }
    });
  };

  const readInvoiceForm = () => {
    const form = $('[data-invoice-form]');
    if (!form) return defaultDraft();
    const draft = getDraft();
    const formData = new FormData(form);
    const next = { ...draft };
    ['invoiceNumber', 'issueDate', 'dueDate', 'currency', 'taxRate', 'discount', 'notes', 'template', 'companyName', 'companyEmail', 'companyAddress', 'clientName', 'clientEmail', 'clientAddress', 'projectName'].forEach((key) => {
      const value = formData.get(key);
      if (value !== null) next[key] = value;
    });
    next.taxRate = Number(next.taxRate || 0);
    next.discount = Number(next.discount || 0);
    next.items = draft.items;
    return next;
  };

  const bindInvoiceForm = () => {
    const form = $('[data-invoice-form]');
    if (!form) return;
    let draft = getDraft();
    syncInvoiceFields(draft);
    renderLineItems(draft);
    renderTemplatePreview(draft);
    setupShareButtons(draft.companyName, draft.projectName);

    form.addEventListener('input', (event) => {
      const target = event.target;
      if (!target || !target.name) return;
      draft = { ...draft, [target.name]: target.type === 'number' ? Number(target.value) : target.value };
      saveDraft(draft);
      renderTemplatePreview(draft);
    });

    $('[data-items-list]')?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const index = Number(target.dataset.itemIndex);
      const field = target.dataset.itemField;
      if (!field || Number.isNaN(index)) return;
      draft.items[index] = { ...draft.items[index], [field]: field === 'description' ? target.value : Number(target.value) };
      saveDraft(draft);
      renderLineItems(draft);
      renderTemplatePreview(draft);
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
      renderLineItems(draft);
      $$('.template-tab').forEach((button) => button.classList.toggle('is-active', button.dataset.template === draft.template));
    });

    $('[data-reset-draft]')?.addEventListener('click', () => {
      draft = defaultDraft();
      saveDraft(draft);
      syncInvoiceFields(draft);
      renderLineItems(draft);
      renderTemplatePreview(draft);
      notify('Draft reset', 'The invoice form was returned to the default starter content.');
    });

    $('[data-save-invoice]')?.addEventListener('click', () => saveInvoiceFromDraft());
    $('[data-download-pdf]')?.addEventListener('click', () => window.print());
  };

  const saveInvoiceFromDraft = () => {
    const account = getAccount();
    if (!account) {
      notify('Sign in required', 'Create an account or log in to save invoices to your dashboard.');
      const loginUrl = `../login/?returnTo=${encodeURIComponent('../dashboard/')}`;
      setTimeout(() => window.location.href = loginUrl, 700);
      return;
    }

    const draft = readInvoiceForm();
    const existing = getCurrentInvoice(account);
    const invoice = {
      id: existing?.id || uid('inv'),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: existing?.status || 'due',
      ...draft,
      totals: getInvoiceTotals(draft)
    };

    const invoices = [...(account.invoices || [])];
    const index = invoices.findIndex((entry) => entry.id === invoice.id);
    if (index >= 0) invoices[index] = invoice; else invoices.unshift(invoice);

    const clients = new Map((account.clients || []).map((client) => [client.email || client.name, client]));
    clients.set(invoice.clientEmail || invoice.clientName, {
      name: invoice.clientName,
      email: invoice.clientEmail,
      address: invoice.clientAddress,
      lastInvoice: invoice.invoiceNumber,
      lastInvoiceDate: invoice.issueDate
    });

    upsertAccount({ ...account, invoices, clients: Array.from(clients.values()) });
    clearCurrentEmail(); // re-set to persist in storage? no-op? keep user; overwrite below.
    setCurrentEmail(account.email);
    notify('Invoice saved', 'The invoice was added to your personal dashboard.');
  };

  const populateInvoiceHeader = () => {
    const account = getAccount();
    const existing = getCurrentInvoice(account);
    if (existing) {
      const draft = {
        ...defaultDraft(),
        ...existing,
        items: existing.items?.length ? existing.items : defaultDraft().items
      };
      saveDraft(draft);
      syncInvoiceFields(draft);
      renderLineItems(draft);
      renderTemplatePreview(draft);
    }

    const title = $('[data-invoice-title]');
    if (title) {
      title.textContent = existing ? `Edit invoice ${existing.invoiceNumber}` : 'Create a new invoice';
    }
  };

  const renderDashboard = () => {
    const wrapper = $('[data-dashboard]');
    if (!wrapper) return;
    const account = getAccount();
    if (!account) {
      const returnTo = encodeURIComponent('../dashboard/');
      window.location.href = `../login/?returnTo=${returnTo}`;
      return;
    }

    const invoices = account.invoices || [];
    const clients = account.clients || [];
    const totalBilled = invoices.reduce((sum, invoice) => sum + Number(invoice.totals?.total || 0), 0);
    const dueCount = invoices.filter((invoice) => (invoice.status || 'due') !== 'paid').length;
    const totalPaid = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.totals?.total || 0), 0);

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
          <td>
            <strong>${escapeHTML(invoice.invoiceNumber)}</strong><br>
            <span class="field-hint">${escapeHTML(invoice.projectName || 'Invoice project')}</span>
          </td>
          <td>${escapeHTML(invoice.clientName)}</td>
          <td>${dateFormat(invoice.issueDate)}<br><span class="field-hint">Due ${dateFormat(invoice.dueDate)}</span></td>
          <td>${money(invoice.totals?.total || 0, invoice.currency)}</td>
          <td><span class="status ${invoice.status || 'due'}">${escapeHTML(invoice.status || 'due')}</span></td>
          <td>
            <div class="table-actions">
              <a class="btn btn-ghost" href="../invoice/?invoice=${encodeURIComponent(invoice.id)}">Edit</a>
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
          <td>${escapeHTML(client.lastInvoice || '—')}</td>
          <td>${dateFormat(client.lastInvoiceDate)}</td>
        </tr>
      `).join('') : '<tr><td colspan="4">No clients saved yet.</td></tr>';
    }

    const summary = $('[data-dashboard-summary-text]');
    if (summary) {
      summary.textContent = `${dueCount} invoices currently pending payment.`;
    }

    wrapper.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.deleteInvoice) {
        const nextInvoices = invoices.filter((invoice) => invoice.id !== target.dataset.deleteInvoice);
        upsertAccount({ ...account, invoices: nextInvoices, clients: account.clients || [] });
        notify('Invoice deleted', 'The record was removed from this account.');
        renderDashboard();
      }

      if (target.dataset.markPaid) {
        const nextInvoices = invoices.map((invoice) => invoice.id === target.dataset.markPaid ? { ...invoice, status: 'paid' } : invoice);
        upsertAccount({ ...account, invoices: nextInvoices, clients: account.clients || [] });
        notify('Invoice updated', 'The invoice status is now marked as paid.');
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
        const form = new FormData(signup);
        const name = String(form.get('name') || '').trim();
        const email = String(form.get('email') || '').trim().toLowerCase();
        const password = String(form.get('password') || '');
        if (!name || !email || password.length < 6) {
          notify('Check your details', 'Use a valid name, email, and a password with at least 6 characters.');
          return;
        }
        if (findAccount(email)) {
          notify('Account exists', 'Use the login page for this email address.');
          return;
        }
        const account = {
          name,
          email,
          passwordHash: await sha256(password),
          invoices: [],
          clients: []
        };
        upsertAccount(account);
        setCurrentEmail(email);
        notify('Account created', 'You are now signed in.');
        window.location.href = '../dashboard/';
      });
    }

    if (login) {
      login.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = new FormData(login);
        const email = String(form.get('email') || '').trim().toLowerCase();
        const password = String(form.get('password') || '');
        const account = findAccount(email);
        if (!account || account.passwordHash !== await sha256(password)) {
          notify('Login failed', 'The email or password does not match any local account on this device.');
          return;
        }
        setCurrentEmail(email);
        const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '../dashboard/';
        notify('Welcome back', 'You are signed in successfully.');
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
      notify('Opening email client', 'Your message has been prepared in your mail app.');
    });
  };

  const populateInvoiceTemplatePicker = () => {
    const wrapper = $('[data-template-tabs]');
    if (!wrapper || !window.APP_DATA?.templates) return;
    const draft = getDraft();
    wrapper.innerHTML = window.APP_DATA.templates.map((template) => `
      <button class="template-tab ${template.id === draft.template ? 'is-active' : ''}" type="button" data-template="${template.id}">${escapeHTML(template.name)}</button>
    `).join('');
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

  const populateTemplateShowcase = () => {
    const grid = $('[data-template-showcase]');
    if (!grid || !window.APP_DATA?.templates) return;
    grid.innerHTML = window.APP_DATA.templates.map((template) => `
      <article class="feature-card">
        <div class="feature-icon">${escapeHTML(template.name.slice(0, 1))}</div>
        <h3>${escapeHTML(template.name)}</h3>
        <p>${escapeHTML(template.summary)}</p>
        <div class="inline-actions" style="margin-top:16px"><span class="pill">Accent ${escapeHTML(template.accent)}</span></div>
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

  const populateArticlePage = () => {
    const slug = document.body.dataset.slug;
    if (!slug || !window.APP_DATA?.blogPosts) return;
    const post = window.APP_DATA.blogPosts.find((entry) => entry.slug === slug);
    if (!post) return;
    const title = $('[data-article-title]');
    if (title) title.textContent = post.title;
    const meta = $('[data-article-meta]');
    if (meta) meta.textContent = `${post.category} · ${dateFormat(post.date)} · ${post.readingTime}`;
    setupShareButtons(post.title, post.description);
    populateSidebarArticles();
  };

  const initInvoiceSection = () => {
    if (document.body.dataset.page !== 'invoice') return;
    populateInvoiceTemplatePicker();
    bindInvoiceForm();
    populateInvoiceHeader();
    setupShareButtons('CreateInvoiceFast Invoice', 'Professional invoice generator');
  };

  const initHomePage = () => {
    if (document.body.dataset.page !== 'home') return;
    populateFeatureCards();
    populateTemplateShowcase();
    populateFaq();
    setupShareButtons('CreateInvoiceFast', 'Invoice generator, dashboards, blog, and billing templates');
  };

  const initBlogIndex = () => {
    if (document.body.dataset.page !== 'blog-index') return;
    populateBlogList();
  };

  const initBlogArticle = () => {
    if (document.body.dataset.page !== 'blog-article') return;
    populateArticlePage();
  };

  const initDashboardPage = () => {
    if (document.body.dataset.page !== 'dashboard') return;
    renderDashboard();
  };

  const initAuthPages = () => {
    if (!['login', 'signup'].includes(document.body.dataset.page || '')) return;
    bindAuthForms();
  };

  const initContactPage = () => {
    if (document.body.dataset.page !== 'contact') return;
    bindContactForm();
  };

  const initCommonLinks = () => {
    $$('[data-copy-email]').forEach((node) => {
      node.addEventListener('click', async () => {
        await navigator.clipboard.writeText(window.APP_DATA.site.email);
        notify('Copied', `Email address copied: ${window.APP_DATA.site.email}`);
      });
    });
  };

  const init = () => {
    initTheme();
    setYear();
    highlightCurrentNav();
    renderAuthState();
    initCommonLinks();
    initHomePage();
    initInvoiceSection();
    initDashboardPage();
    initAuthPages();
    initContactPage();
    initBlogIndex();
    initBlogArticle();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
