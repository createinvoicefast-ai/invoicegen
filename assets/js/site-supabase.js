(() => {
  const storageKeys = {
    theme: 'createinvoicefast-theme',
    invoiceDraft: 'createinvoicefast-invoice-draft'
  };

  const currencySymbols = {
    USD: '$',
    EUR: 'EUR',
    GBP: 'GBP',
    CAD: 'CAD',
    AUD: 'AUD',
    AED: 'AED',
    SAR: 'SAR',
    INR: 'INR'
  };

  const defaultDraft = () => {
    const today = new Date();
    const issueDate = today.toISOString().slice(0, 10);
    const due = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);

    return {
      invoiceNumber: '1',
      issueDate,
      dueDate: due,
      paymentTerms: 'Due on receipt',
      poNumber: '',
      status: 'due',
      currency: 'USD',
      taxRate: 0,
      discount: 0,
      shipping: 0,
      amountPaid: 0,
      notes: '',
      terms: '',
      logoDataUrl: '',
      companyName: '',
      companyEmail: '',
      companyAddress: '',
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      shipTo: '',
      projectName: '',
      template: 'classic',
      items: [
        { description: '', quantity: 1, rate: 0 }
      ]
    };
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const escapeHTML = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const slugify = (value) => String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const money = (value, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(Number(value || 0));
    } catch {
      return `${currencySymbols[currency] || '$'}${Number(value || 0).toFixed(2)}`;
    }
  };

  const dateFormat = (value) => {
    if (!value) return '-';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
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

  const projectUrl = window.SUPABASE_CONFIG?.url;
  const publishableKey = window.SUPABASE_CONFIG?.publishableKey;
  const supabase = window.supabase && projectUrl && publishableKey
    ? window.supabase.createClient(projectUrl, publishableKey)
    : null;

  let authUser = null;

  const authReady = async () => {
    if (!supabase) {
      authUser = null;
      return null;
    }

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
    if (toggle) {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      toggle.textContent = theme === 'dark' ? '☀' : '☾';
      toggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
      toggle.setAttribute('title', `Switch to ${nextTheme} mode`);
    }
  };

  const setTheme = (value, persist = true) => {
    const nextTheme = value === 'light' || value === 'dark'
      ? value
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    applyTheme(nextTheme);
    if (persist) localStorage.setItem(storageKeys.theme, value || 'system');
  };

  const initTheme = () => {
    const stored = localStorage.getItem(storageKeys.theme) || 'light';
    if (stored === 'system') setTheme('system', false);
    else setTheme(stored);

    $('[data-theme-toggle]')?.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(current);
      notify('Theme updated', `Switched to ${current} mode.`);
    });
  };

  const setYear = () => {
    $$('.js-year').forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  };

  const normalizeHeaderChrome = () => {
    $$('.brand').forEach((brand) => {
      const spans = brand.querySelectorAll('span');
      const label = spans[spans.length - 1];
      if (label) label.textContent = 'Invoice-Generator.com';
    });

    $$('.nav-links').forEach((nav) => {
      nav.innerHTML = [
        '<a href="/help/">Help</a>',
        '<a href="/history/">History</a>',
        '<a href="/guide/">Invoicing Guide</a>'
      ].join('');
    });

    $$('.nav-actions').forEach((actions) => {
      if (!actions.querySelector('[data-theme-toggle]')) {
        const themeBtn = document.createElement('button');
        themeBtn.className = 'icon-btn';
        themeBtn.type = 'button';
        themeBtn.dataset.themeToggle = '';
        themeBtn.textContent = '☾';
        themeBtn.setAttribute('aria-label', 'Toggle theme');
        actions.prepend(themeBtn);
      }

      if (!actions.querySelector('.js-guest-nav')) {
        actions.insertAdjacentHTML(
          'beforeend',
          '<a class="btn btn-ghost js-guest-nav" href="/login/">Sign In</a><a class="btn btn-primary js-guest-nav" href="/signup/">Sign Up</a>'
        );
      }

      if (!actions.querySelector('.js-auth-nav')) {
        actions.insertAdjacentHTML(
          'beforeend',
          '<a class="btn btn-ghost js-auth-nav hidden" href="/history/">History</a><button class="btn btn-primary js-auth-nav hidden js-sign-out" type="button">Sign Out</button>'
        );
      }
    });
  };

  const highlightCurrentNav = () => {
    const page = document.body.dataset.page || '';
    const activeMap = {
      help: '/help/',
      history: '/history/',
      guide: '/guide/'
    };

    const activeHref = activeMap[page] || '';

    $$('.nav-links a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      link.classList.toggle('is-active', Boolean(activeHref && href === activeHref));
    });
  };

  const renderAuthState = async () => {
    const user = await authReady();

    $$('.js-auth-nav').forEach((node) => node.classList.toggle('hidden', !user));
    $$('.js-guest-nav').forEach((node) => node.classList.toggle('hidden', !!user));

    $$('.js-sign-out').forEach((node) => {
      node.addEventListener('click', async () => {
        if (supabase) await supabase.auth.signOut();
        authUser = null;
        notify('Signed out', 'Your session was cleared.');
        window.setTimeout(() => {
          window.location.href = '/';
        }, 240);
      });
    });
  };

  const getDraftKey = () => {
    const userKey = authUser?.id || 'guest';
    return `${storageKeys.invoiceDraft}:${userKey}`;
  };

  const getDraft = () => {
    const draft = readJSON(getDraftKey(), null);
    const merged = draft ? { ...defaultDraft(), ...draft } : defaultDraft();

    if (!Array.isArray(merged.items) || !merged.items.length) {
      merged.items = [{ description: '', quantity: 1, rate: 0 }];
    }

    return merged;
  };

  const saveDraft = (draft) => {
    writeJSON(getDraftKey(), draft);
  };

  const getCurrentInvoiceId = () => new URLSearchParams(window.location.search).get('invoice') || '';

  const getInvoiceTotals = (draft) => {
    const subtotal = draft.items.reduce((sum, item) => {
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      return sum + (quantity * rate);
    }, 0);

    const discount = Math.max(Number(draft.discount || 0), 0);
    const shipping = Math.max(Number(draft.shipping || 0), 0);
    const taxRate = Math.max(Number(draft.taxRate || 0), 0);
    const taxable = Math.max(subtotal - discount, 0);
    const tax = taxable * (taxRate / 100);
    const total = taxable + tax + shipping;
    const amountPaid = Math.max(Number(draft.amountPaid || 0), 0);
    const balanceDue = Math.max(total - amountPaid, 0);

    return { subtotal, discount, shipping, tax, total, amountPaid, balanceDue };
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
      ['Client Name', draft.clientName],
      ['Ship To', draft.shipTo],
      ['Currency', draft.currency],
      ['Tax Rate', draft.taxRate],
      ['Discount', totals.discount],
      ['Shipping', totals.shipping],
      ['Amount Paid', totals.amountPaid],
      ['Subtotal', totals.subtotal],
      ['Tax', totals.tax],
      ['Total', totals.total],
      ['Balance Due', totals.balanceDue],
      ['Notes', draft.notes],
      ['Terms', draft.terms],
      [],
      ['Item', 'Quantity', 'Rate', 'Amount']
    ];

    draft.items.forEach((item) => {
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      rows.push([item.description, quantity, rate, quantity * rate]);
    });

    return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  };

  const getPrintableNode = () => $('[data-invoice-preview]') || $('[data-invoice-form]');

  const buildPdfCaptureNode = (draft) => {
    const totals = getInvoiceTotals(draft);
    const taxRate = Number(draft.taxRate || 0);
    const taxRateText = String(taxRate).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1') || '0';

    const safeText = (value, fallback = '-') => {
      const clean = String(value ?? '').trim();
      return clean ? escapeHTML(clean).replaceAll('\n', '<br>') : fallback;
    };

    const companyLines = [draft.companyName, draft.companyEmail, draft.companyAddress]
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .map((entry) => escapeHTML(entry));

    const billToLines = [draft.clientName, draft.clientEmail, draft.clientAddress]
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .map((entry) => escapeHTML(entry));

    const items = Array.isArray(draft.items) && draft.items.length
      ? draft.items
      : [{ description: 'Item', quantity: 1, rate: 0 }];

    const maxPdfRows = 7;
    const visibleItems = items.slice(0, maxPdfRows);

    const rowsMarkup = visibleItems.map((item) => {
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const amount = quantity * rate;

      return `
        <tr>
          <td>${safeText(item.description, 'Item')}</td>
          <td class="ig-pdf-num">${escapeHTML(String(quantity))}</td>
          <td class="ig-pdf-num">${money(rate, draft.currency)}</td>
          <td class="ig-pdf-num">${money(amount, draft.currency)}</td>
        </tr>
      `;
    }).join('');

    const overflowRow = items.length > maxPdfRows
      ? `<tr><td colspan="4" class="ig-pdf-overflow">${escapeHTML(String(items.length - maxPdfRows))} more item(s) not shown in this one-page PDF.</td></tr>`
      : '';

    const logoSrc = typeof draft.logoDataUrl === 'string' && draft.logoDataUrl.startsWith('data:image/')
      ? draft.logoDataUrl
      : '';

    const wrapper = document.createElement('div');
    wrapper.className = 'ig-pdf-capture-wrap';
    wrapper.setAttribute('aria-hidden', 'true');

    const page = document.createElement('article');
    page.className = 'ig-pdf-page';
    page.innerHTML = `
      <header class="ig-pdf-head">
        <div class="ig-pdf-brand-col">
          <div class="ig-pdf-logo">
            ${logoSrc
              ? `<img src="${logoSrc}" alt="Company logo">`
              : '<span>+ Add Logo</span>'}
          </div>
          <p class="ig-pdf-company">${companyLines.join('<br>') || '&nbsp;'}</p>
        </div>
        <div class="ig-pdf-doc-col">
          <h1>INVOICE</h1>
          <p class="ig-pdf-doc-number"># ${safeText(draft.invoiceNumber, '1')}</p>
          <dl class="ig-pdf-meta">
            <div><dt>Date</dt><dd>${safeText(dateFormat(draft.issueDate), '-')}</dd></div>
            <div><dt>Payment Terms</dt><dd>${safeText(draft.paymentTerms, '-')}</dd></div>
            <div><dt>Due Date</dt><dd>${safeText(dateFormat(draft.dueDate), '-')}</dd></div>
            <div><dt>PO Number</dt><dd>${safeText(draft.poNumber, '-')}</dd></div>
          </dl>
        </div>
      </header>

      <section class="ig-pdf-party-grid">
        <div>
          <h2>BILL TO</h2>
          <p>${billToLines.join('<br>') || '&nbsp;'}</p>
        </div>
        <div>
          <h2>SHIP TO</h2>
          <p>${safeText(draft.shipTo, '&nbsp;')}</p>
        </div>
      </section>

      <table class="ig-pdf-table" aria-label="Invoice line items">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>${rowsMarkup}${overflowRow}</tbody>
      </table>

      <section class="ig-pdf-bottom">
        <div class="ig-pdf-notes-col">
          <div class="ig-pdf-note-block">
            <h3>Notes</h3>
            <p>${safeText(draft.notes, '&nbsp;')}</p>
          </div>
          <div class="ig-pdf-note-block">
            <h3>Terms</h3>
            <p>${safeText(draft.terms, '&nbsp;')}</p>
          </div>
          <div class="ig-pdf-note-block ig-pdf-note-compact">
            <h3>Shipping</h3>
            <p>${money(totals.shipping, draft.currency)}</p>
          </div>
        </div>
        <div class="ig-pdf-summary-col">
          <div class="ig-pdf-summary-row"><span>Subtotal</span><strong>${money(totals.subtotal, draft.currency)}</strong></div>
          <div class="ig-pdf-summary-row"><span>Tax (${escapeHTML(taxRateText)}%)</span><strong>${money(totals.tax, draft.currency)}</strong></div>
          <div class="ig-pdf-summary-row ig-pdf-summary-total"><span>Total</span><strong>${money(totals.total, draft.currency)}</strong></div>
          <div class="ig-pdf-summary-row"><span>Amount Paid</span><strong>${money(totals.amountPaid, draft.currency)}</strong></div>
          <div class="ig-pdf-summary-row ig-pdf-balance-row"><span>Balance Due</span><strong>${money(totals.balanceDue, draft.currency)}</strong></div>
        </div>
      </section>
    `;

    wrapper.appendChild(page);
    document.body.appendChild(wrapper);

    return { wrapper, page };
  };

  const downloadInvoiceJSON = (draft) => {
    const totals = getInvoiceTotals(draft);
    const payload = { ...draft, totals };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
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
    const preview = getPrintableNode();
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
        notify('PNG unavailable', 'Invoice area is empty.');
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
    if (!window.html2canvas) {
      notify('PDF unavailable', 'Export library did not load. Refresh and try again.');
      return;
    }

    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      notify('PDF unavailable', 'PDF library did not load. Refresh and try again.');
      return;
    }

    let captureRoot = null;

    try {
      if (document.fonts?.ready) await document.fonts.ready;

      const capture = buildPdfCaptureNode(draft);
      if (!capture) {
        notify('PDF unavailable', 'Invoice area is empty.');
        return;
      }

      captureRoot = capture.wrapper;

      const canvas = await window.html2canvas(capture.page, {
        backgroundColor: '#ffffff',
        scale: 2.4,
        useCORS: true,
        scrollY: 0,
        windowWidth: capture.page.scrollWidth,
        windowHeight: capture.page.scrollHeight
      });

      if (!canvas.width || !canvas.height) {
        notify('PDF unavailable', 'Invoice area is empty.');
        return;
      }

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - (margin * 2);
      const printableHeight = pageHeight - (margin * 2);

      const imageData = canvas.toDataURL('image/png');
      const imageAspect = canvas.width / canvas.height;

      let renderWidth = printableWidth;
      let renderHeight = renderWidth / imageAspect;

      if (renderHeight > printableHeight) {
        renderHeight = printableHeight;
        renderWidth = renderHeight * imageAspect;
      }

      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;
      pdf.addImage(imageData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

      pdf.save(`${invoiceFileStem(draft)}.pdf`);
      notify('Download ready', 'Invoice PDF file exported.');
    } catch {
      notify('PDF unavailable', 'Could not generate PDF. Please refresh and retry.');
    } finally {
      if (captureRoot) captureRoot.remove();
    }
  };

  const setInvoicePrintScale = () => {
    const preview = getPrintableNode();
    if (!preview) return;

    document.documentElement.style.setProperty('--invoice-print-scale', '1');

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

  const syncInvoiceFields = (draft) => {
    const mapping = [
      'invoiceNumber',
      'issueDate',
      'dueDate',
      'paymentTerms',
      'poNumber',
      'status',
      'currency',
      'taxRate',
      'discount',
      'shipping',
      'amountPaid',
      'notes',
      'terms',
      'companyName',
      'companyEmail',
      'companyAddress',
      'clientName',
      'clientEmail',
      'clientAddress',
      'shipTo',
      'projectName',
      'template'
    ];

    mapping.forEach((name) => {
      const field = $(`[name="${name}"]`);
      if (!field) return;

      const value = draft[name] ?? '';
      if (field.value !== String(value)) field.value = value;
    });
  };

  const readInvoiceForm = (draftSeed) => {
    const next = { ...draftSeed };

    const names = [
      'invoiceNumber',
      'issueDate',
      'dueDate',
      'paymentTerms',
      'poNumber',
      'status',
      'currency',
      'taxRate',
      'discount',
      'shipping',
      'amountPaid',
      'notes',
      'terms',
      'companyName',
      'companyEmail',
      'companyAddress',
      'clientName',
      'clientEmail',
      'clientAddress',
      'shipTo',
      'projectName',
      'template'
    ];

    names.forEach((name) => {
      const field = $(`[name="${name}"]`);
      if (!field) return;
      next[name] = field.value;
    });

    next.taxRate = Number(next.taxRate || 0);
    next.discount = Number(next.discount || 0);
    next.shipping = Number(next.shipping || 0);
    next.amountPaid = Number(next.amountPaid || 0);

    return next;
  };

  const renderCurrencySymbols = (draft) => {
    const symbol = currencySymbols[draft.currency] || '$';
    $$('[data-currency-symbol]').forEach((node) => {
      node.textContent = symbol;
    });
  };

  const renderLogo = (draft) => {
    const preview = $('[data-logo-preview]');
    const placeholder = $('[data-logo-placeholder]');

    if (preview) {
      if (draft.logoDataUrl) {
        preview.src = draft.logoDataUrl;
        preview.classList.remove('hidden');
      } else {
        preview.removeAttribute('src');
        preview.classList.add('hidden');
      }
    }

    if (placeholder) {
      placeholder.classList.toggle('hidden', Boolean(draft.logoDataUrl));
    }
  };

  const renderLineItems = (draft) => {
    const list = $('[data-items-list]');
    if (!list) return;

    const symbol = currencySymbols[draft.currency] || '$';

    list.innerHTML = draft.items.map((item, index) => {
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const amount = quantity * rate;

      return `
        <tr class="ig-item-row" data-item-row="${index}">
          <td>
            <input data-item-field="description" data-item-index="${index}" value="${escapeHTML(item.description)}" placeholder="Description of item/service...">
          </td>
          <td>
            <input type="number" min="0" step="0.1" data-item-field="quantity" data-item-index="${index}" value="${quantity}">
          </td>
          <td>
            <div class="ig-money-input ig-rate-input">
              <span>${symbol}</span>
              <input type="number" min="0" step="0.01" data-item-field="rate" data-item-index="${index}" value="${rate}">
            </div>
          </td>
          <td class="ig-item-amount" data-item-amount="${index}">${money(amount, draft.currency)}</td>
          <td class="ig-item-remove-cell">
            <button type="button" class="ig-remove-item" data-remove-item="${index}" aria-label="Remove item">×</button>
          </td>
        </tr>
      `;
    }).join('');
  };

  const renderSummary = (draft) => {
    const totals = getInvoiceTotals(draft);

    if (draft.status !== 'draft') {
      draft.status = totals.balanceDue <= 0 ? 'paid' : 'due';
      const statusField = $('[name="status"]');
      if (statusField) statusField.value = draft.status;
    }

    const subtotalNode = $('[data-subtotal-value]');
    if (subtotalNode) subtotalNode.textContent = money(totals.subtotal, draft.currency);

    const totalNode = $('[data-total-value]');
    if (totalNode) totalNode.textContent = money(totals.total, draft.currency);

    const balanceNode = $('[data-balance-value]');
    if (balanceNode) balanceNode.textContent = money(totals.balanceDue, draft.currency);

    draft.items.forEach((item, index) => {
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const amountNode = $(`[data-item-amount="${index}"]`);
      if (amountNode) amountNode.textContent = money(quantity * rate, draft.currency);
    });
  };

  const toInvoicePayload = (userId, draft, existingId = null) => {
    const totals = getInvoiceTotals(draft);
    const status = draft.status === 'draft'
      ? 'draft'
      : (totals.balanceDue <= 0 ? 'paid' : 'due');

    return {
      id: existingId || undefined,
      user_id: userId,
      invoice_number: draft.invoiceNumber || '1',
      issue_date: draft.issueDate || null,
      due_date: draft.dueDate || null,
      status,
      currency: draft.currency || 'USD',
      tax_rate: Number(draft.taxRate || 0),
      discount: Number(draft.discount || 0),
      company_name: draft.companyName || '',
      company_email: draft.companyEmail || '',
      company_address: draft.companyAddress || '',
      client_name: draft.clientName || '',
      client_email: draft.clientEmail || '',
      client_address: draft.clientAddress || '',
      project_name: draft.projectName || '',
      notes: draft.notes || '',
      template: draft.template || 'classic',
      items: draft.items,
      totals: {
        ...totals,
        paymentTerms: draft.paymentTerms || '',
        poNumber: draft.poNumber || '',
        shipTo: draft.shipTo || '',
        terms: draft.terms || '',
        logoDataUrl: draft.logoDataUrl || ''
      }
    };
  };

  const fromInvoiceRow = (row) => {
    const totals = row.totals || {};

    return {
      id: row.id,
      invoiceNumber: row.invoice_number || '1',
      issueDate: row.issue_date || '',
      dueDate: row.due_date || '',
      paymentTerms: totals.paymentTerms || '',
      poNumber: totals.poNumber || '',
      status: row.status || 'due',
      currency: row.currency || 'USD',
      taxRate: Number(row.tax_rate || 0),
      discount: Number(row.discount || 0),
      shipping: Number(totals.shipping || 0),
      amountPaid: Number(totals.amountPaid || 0),
      notes: row.notes || '',
      terms: totals.terms || '',
      logoDataUrl: totals.logoDataUrl || '',
      companyName: row.company_name || '',
      companyEmail: row.company_email || '',
      companyAddress: row.company_address || '',
      clientName: row.client_name || '',
      clientEmail: row.client_email || '',
      clientAddress: row.client_address || '',
      shipTo: totals.shipTo || '',
      projectName: row.project_name || '',
      template: row.template || 'classic',
      items: Array.isArray(row.items) && row.items.length
        ? row.items
        : [{ description: '', quantity: 1, rate: 0 }]
    };
  };

  const saveInvoiceToSupabase = async (draft) => {
    if (!supabase) {
      notify('Saved locally', 'Supabase is not configured. Draft saved in this browser only.');
      return;
    }

    const user = await requireAuth('/history/');
    if (!user) return;

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

    notify('Invoice saved', `Saved ${data?.invoice_number || draft.invoiceNumber}.`);
  };

  const loadInvoiceFromSupabase = async (invoiceId) => {
    if (!invoiceId || !supabase) return null;

    const user = await requireAuth('/history/');
    if (!user) return null;

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      notify('Load failed', error.message);
      return null;
    }

    if (!data) {
      notify('Not found', 'Invoice could not be found in your account.');
      return null;
    }

    return fromInvoiceRow(data);
  };

  const bindInvoiceSettingsToggle = () => {
    const toggle = $('[data-toggle-settings]');
    const panel = $('[data-settings-body]');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') !== 'false';
      toggle.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  };

  const bindInvoiceForm = (initialDraft) => {
    const form = $('[data-invoice-form]');
    if (!form) return;

    let draft = initialDraft ? { ...defaultDraft(), ...initialDraft } : getDraft();

    if (!Array.isArray(draft.items) || !draft.items.length) {
      draft.items = [{ description: '', quantity: 1, rate: 0 }];
    }

    const trackedNames = new Set([
      'invoiceNumber',
      'issueDate',
      'dueDate',
      'paymentTerms',
      'poNumber',
      'status',
      'currency',
      'taxRate',
      'discount',
      'shipping',
      'amountPaid',
      'notes',
      'terms',
      'companyName',
      'companyEmail',
      'companyAddress',
      'clientName',
      'clientEmail',
      'clientAddress',
      'shipTo',
      'projectName',
      'template'
    ]);

    const hydrate = (rerenderItems = false) => {
      syncInvoiceFields(draft);
      if (rerenderItems) renderLineItems(draft);
      renderCurrencySymbols(draft);
      renderSummary(draft);
      renderLogo(draft);
      saveDraft(draft);
    };

    hydrate(true);

    const updateNamedField = (target) => {
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return false;
      if (!trackedNames.has(target.name)) return false;

      const parsed = target.type === 'number' ? Number(target.value || 0) : target.value;
      draft = { ...draft, [target.name]: parsed };

      if (target.name === 'currency') {
        renderLineItems(draft);
      }

      hydrate(false);
      return true;
    };

    document.addEventListener('input', (event) => {
      updateNamedField(event.target);
    });

    document.addEventListener('change', (event) => {
      updateNamedField(event.target);
    });

    $('[data-items-list]')?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      const index = Number(target.dataset.itemIndex);
      const field = target.dataset.itemField;
      if (!field || Number.isNaN(index)) return;

      if (!draft.items[index]) return;

      draft.items[index] = {
        ...draft.items[index],
        [field]: field === 'description' ? target.value : Number(target.value || 0)
      };

      renderSummary(draft);
      saveDraft(draft);
    });

    $('[data-items-list]')?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const removeIndex = target.dataset.removeItem;
      if (removeIndex === undefined) return;

      draft.items.splice(Number(removeIndex), 1);
      if (!draft.items.length) draft.items.push({ description: '', quantity: 1, rate: 0 });

      hydrate(true);
    });

    $('[data-add-item]')?.addEventListener('click', () => {
      draft.items.push({ description: '', quantity: 1, rate: 0 });
      hydrate(true);
    });

    const logoInput = $('[data-logo-upload]');

    logoInput?.addEventListener('change', () => {
      const file = logoInput.files?.[0];
      if (!file) {
        draft.logoDataUrl = '';
        renderLogo(draft);
        saveDraft(draft);
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
        renderLogo(draft);
        saveDraft(draft);
      };
      reader.onerror = () => notify('Upload failed', 'Could not read this image.');
      reader.readAsDataURL(file);
    });

    $('[data-clear-logo]')?.addEventListener('click', () => {
      draft.logoDataUrl = '';
      if (logoInput) logoInput.value = '';
      renderLogo(draft);
      saveDraft(draft);
    });

    $('[data-reset-draft]')?.addEventListener('click', () => {
      draft = defaultDraft();
      if (logoInput) logoInput.value = '';
      hydrate(true);
      notify('Invoice reset', 'The invoice form was returned to default values.');
    });

    $('[data-save-invoice]')?.addEventListener('click', async () => {
      draft = readInvoiceForm(draft);
      saveDraft(draft);
      await saveInvoiceToSupabase(draft);
    });

    $('[data-download-pdf]')?.addEventListener('click', async () => {
      draft = readInvoiceForm(draft);
      await downloadInvoicePDF(draft);
    });

    $('[data-download-print]')?.addEventListener('click', () => printInvoice());

    $('[data-download-png]')?.addEventListener('click', async () => {
      draft = readInvoiceForm(draft);
      await downloadInvoicePNG(draft);
    });

    $('[data-download-json]')?.addEventListener('click', () => {
      draft = readInvoiceForm(draft);
      downloadInvoiceJSON(draft);
    });

    $('[data-download-csv]')?.addEventListener('click', () => {
      draft = readInvoiceForm(draft);
      downloadInvoiceCSV(draft);
    });

    bindInvoiceSettingsToggle();
  };

  const renderHistoryPage = async () => {
    const root = $('[data-history-page]');
    const tableBody = $('[data-history-table]');
    if (!root || !tableBody) return;

    const user = await requireAuth('/history/');
    if (!user || !supabase) return;

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      tableBody.innerHTML = '<tr><td colspan="7">Could not load invoice history.</td></tr>';
      notify('History error', error.message);
      return;
    }

    const invoices = data || [];
    const totalValue = invoices.reduce((sum, row) => sum + Number(row.totals?.total || 0), 0);
    const dueCount = invoices.filter((row) => row.status !== 'paid').length;

    const countNode = $('[data-history-count]');
    if (countNode) countNode.textContent = String(invoices.length);

    const dueNode = $('[data-history-due]');
    if (dueNode) dueNode.textContent = String(dueCount);

    const totalNode = $('[data-history-total]');
    if (totalNode) totalNode.textContent = money(totalValue, 'USD');

    tableBody.innerHTML = invoices.length
      ? invoices.map((invoice) => {
        const total = Number(invoice.totals?.total || 0);
        const currency = invoice.currency || 'USD';

        return `
          <tr>
            <td><strong>${escapeHTML(invoice.invoice_number || '-')}</strong></td>
            <td>${escapeHTML(invoice.client_name || '-')}</td>
            <td>${dateFormat(invoice.issue_date)}<br><span class="field-hint">Due ${dateFormat(invoice.due_date)}</span></td>
            <td>${money(total, currency)}</td>
            <td><span class="status ${escapeHTML(invoice.status || 'due')}">${escapeHTML(invoice.status || 'due')}</span></td>
            <td>${dateFormat(invoice.updated_at)}</td>
            <td>
              <div class="table-actions">
                <a class="btn btn-ghost" href="/?invoice=${encodeURIComponent(invoice.id)}">Open</a>
                <button class="btn btn-ghost" data-history-paid="${escapeHTML(invoice.id)}" type="button">Mark paid</button>
                <button class="btn btn-ghost" data-history-delete="${escapeHTML(invoice.id)}" type="button">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('')
      : '<tr><td colspan="7">No invoices yet. Create your first invoice from the main page.</td></tr>';

    if (root.dataset.boundHistoryActions === 'true') return;

    root.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const deleteId = target.dataset.historyDelete;
      if (deleteId) {
        const { error: deleteError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', deleteId)
          .eq('user_id', user.id);

        if (deleteError) {
          notify('Delete failed', deleteError.message);
          return;
        }

        notify('Invoice deleted', 'The invoice was removed from your history.');
        await renderHistoryPage();
      }

      const paidId = target.dataset.historyPaid;
      if (paidId) {
        const { error: paidError } = await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', paidId)
          .eq('user_id', user.id);

        if (paidError) {
          notify('Update failed', paidError.message);
          return;
        }

        notify('Invoice updated', 'This invoice is marked as paid.');
        await renderHistoryPage();
      }
    });

    root.dataset.boundHistoryActions = 'true';
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

        const formData = new FormData(signup);
        const name = String(formData.get('name') || '').trim();
        const email = String(formData.get('email') || '').trim().toLowerCase();
        const password = String(formData.get('password') || '');

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
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            full_name: name
          });
        }

        notify('Account created', 'Your account is ready.');
        window.location.href = data.session ? '/history/' : '/login/';
      });
    }

    if (login) {
      login.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!supabase) {
          notify('Supabase missing', 'Supabase client is not configured.');
          return;
        }

        const formData = new FormData(login);
        const email = String(formData.get('email') || '').trim().toLowerCase();
        const password = String(formData.get('password') || '');

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          notify('Login failed', error.message);
          return;
        }

        const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/history/';
        window.location.href = returnTo;
      });
    }
  };

  const bindHelpForm = () => {
    const form = $('[data-help-form]') || $('[data-contact-form]');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const message = String(formData.get('message') || '').trim();

      if (!name || !email || !message) {
        notify('Missing fields', 'Please complete all support form fields.');
        return;
      }

      const supportAddress = 'support@invoice-generator.com';
      const subject = `Support request from ${name}`;
      const body = `${message}\n\nReply to: ${email}`;

      window.location.href = `mailto:${supportAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      notify('Email draft opened', 'Your message is ready in your email app.');
    });
  };

  const initInvoicePage = async () => {
    if (document.body.dataset.page !== 'invoice') return;

    let initialDraft = getDraft();
    const invoiceId = getCurrentInvoiceId();

    if (invoiceId) {
      const loaded = await loadInvoiceFromSupabase(invoiceId);
      if (loaded) {
        initialDraft = {
          ...defaultDraft(),
          ...loaded,
          items: Array.isArray(loaded.items) && loaded.items.length
            ? loaded.items
            : defaultDraft().items
        };
        saveDraft(initialDraft);
      }
    }

    bindInvoiceForm(initialDraft);
  };

  const initHistoryPage = async () => {
    if (document.body.dataset.page !== 'history') return;
    await renderHistoryPage();
  };

  const init = async () => {
    if (!supabase) {
      console.warn('Supabase config missing. Cloud auth and history are disabled until configured.');
    }

    normalizeHeaderChrome();
    initTheme();
    setYear();
    highlightCurrentNav();
    await renderAuthState();

    bindAuthForms();
    bindHelpForm();

    await initInvoicePage();
    await initHistoryPage();
  };

  document.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => {
      console.error(error);
      notify('Unexpected error', 'Something went wrong while initializing the app.');
    });
  });
})();
