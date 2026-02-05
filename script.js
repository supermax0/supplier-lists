/* ===== Data & Storage (Firebase Realtime Database + cache) ===== */
let _suppliers = [];
let _lists = [];
let _activity = [];

function getDb() {
  return typeof firebase !== 'undefined' && firebase.database ? firebase.database() : null;
}

function getStorage() {
  return typeof firebase !== 'undefined' && firebase.storage ? firebase.storage() : null;
}

function getSuppliers() {
  return _suppliers;
}

function setSuppliers(arr) {
  _suppliers = Array.isArray(arr) ? arr : [];
  const db = getDb();
  if (db) db.ref('suppliers').set(_suppliers).catch(function(err) { console.warn('Firebase setSuppliers:', err); });
}

function getLists() {
  return _lists;
}

function setLists(arr) {
  _lists = Array.isArray(arr) ? arr : [];
  const db = getDb();
  if (db) db.ref('lists').set(_lists).catch(function(err) { console.warn('Firebase setLists:', err); });
}

function getActivity() {
  return _activity;
}

function setActivity(arr) {
  _activity = Array.isArray(arr) ? arr : [];
  const db = getDb();
  if (db) db.ref('activity').set(_activity).catch(function(err) { console.warn('Firebase setActivity:', err); });
}

function addActivity(type, title, meta) {
  const list = getActivity();
  list.unshift({
    id: Date.now().toString(),
    type,
    title,
    meta: meta || '',
    date: new Date().toISOString()
  });
  setActivity(list.slice(0, 100));
}

function loadDataFromFirebase() {
  return new Promise(function(resolve) {
    const db = getDb();
    if (!db) {
      resolve();
      return;
    }
    Promise.all([
      db.ref('suppliers').once('value').then(function(snap) { _suppliers = snap.val() || []; }),
      db.ref('lists').once('value').then(function(snap) { _lists = snap.val() || []; }),
      db.ref('activity').once('value').then(function(snap) { _activity = snap.val() || []; })
    ]).then(resolve).catch(function(err) {
      console.warn('Firebase loadData:', err);
      resolve();
    });
  });
}

function dataURLtoBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function uploadListImage(dataUrlOrBlob) {
  const storage = getStorage();
  if (!storage) return Promise.resolve('');
  const blob = typeof dataUrlOrBlob === 'string' && dataUrlOrBlob.indexOf('data:') === 0
    ? dataURLtoBlob(dataUrlOrBlob)
    : dataUrlOrBlob;
  const ext = (blob.type || '').indexOf('png') !== -1 ? 'png' : 'jpg';
  const path = 'lists/' + generateId() + '.' + ext;
  return storage.ref(path).put(blob).then(function(snap) {
    return snap.ref.getDownloadURL();
  }).catch(function(err) {
    console.warn('Firebase Storage upload:', err);
    return '';
  });
}

/* ===== العملات (د.ع، دولار فقط — بدون ريال) ===== */
const CURRENCIES = {
  IQD: { label: 'د.ع', name: 'دينار عراقي' },
  USD: { label: 'دولار', name: 'دولار أمريكي' }
};

function formatAmount(amount, currency) {
  const c = CURRENCIES[currency] || CURRENCIES.IQD;
  const n = parseFloat(amount) || 0;
  return n.toFixed(2) + ' ' + c.label;
}

function getCurrencyLabel(currency) {
  return (CURRENCIES[currency] || CURRENCIES.IQD).label;
}

/* ===== IDs ===== */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* ===== DOM refs ===== */
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');
const menuBtn = document.getElementById('menuBtn');
const pageTitle = document.getElementById('pageTitle');
const paymentModal = document.getElementById('paymentModal');
const paymentModalClose = document.getElementById('paymentModalClose');
const listDetailModal = document.getElementById('listDetailModal');
const listDetailModalClose = document.getElementById('listDetailModalClose');
const supplierDetailModal = document.getElementById('supplierDetailModal');
const supplierDetailModalClose = document.getElementById('supplierDetailModalClose');

const PAGE_TITLES = {
  dashboard: 'لوحة التحكم',
  suppliers: 'الموردين',
  'add-supplier': 'إضافة مورد',
  'add-list': 'إضافة قائمة شراء',
  lists: 'عرض القوائم',
  transactions: 'الحركات والنشاط'
};

/* ===== Navigation ===== */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(pageId);
  if (pageEl) {
    pageEl.classList.add('active');
    pageTitle.textContent = PAGE_TITLES[pageId] || pageId;
  }

  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(n => n.classList.add('active'));

  if (sidebar) sidebar.classList.remove('open');
  if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';

  if (pageId === 'lists') renderListsTable();
  if (pageId === 'suppliers') renderSuppliersTable();
  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'transactions') renderActivity();
  if (pageId === 'add-list') {
    fillSupplierSelect();
    setupListImagePreview();
    updateProductTotals();
  }
}

function initNavigation() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  showPage(hash || 'dashboard');

  window.addEventListener('hashchange', () => {
    const id = window.location.hash.slice(1) || 'dashboard';
    showPage(id);
  });

  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const page = item.getAttribute('data-page');
      if (page) {
        e.preventDefault();
        window.location.hash = page;
      }
    });
  });

  // فتح/إغلاق السايدبار (يعمل بالنقر واللمس على الهاتف)
  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  menuBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openSidebar();
  });

  sidebarClose?.addEventListener('click', (e) => {
    e.preventDefault();
    closeSidebar();
  });

  sidebarOverlay?.addEventListener('click', closeSidebar);
}

/* ===== Dashboard ===== */
function renderDashboard() {
  const suppliers = getSuppliers();
  const lists = getLists();
  const totalAmount = lists.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const totalPaid = lists.reduce((s, l) => s + (parseFloat(l.paid) || 0), 0);

  const openingBalanceIQD = suppliers.reduce((sum, sup) => {
    if (sup.openingBalance && (sup.openingBalanceCurrency || 'IQD') === 'IQD') {
      return sum + (parseFloat(sup.openingBalance) || 0);
    }
    return sum;
  }, 0);

  const openingBalanceUSD = suppliers.reduce((sum, sup) => {
    if (sup.openingBalance && (sup.openingBalanceCurrency || 'IQD') === 'USD') {
      return sum + (parseFloat(sup.openingBalance) || 0);
    }
    return sum;
  }, 0);

  const listsIQD = lists.filter((l) => (l.currency || 'IQD') === 'IQD');
  const totalAmountIQD = listsIQD.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const totalPaidIQD = listsIQD.reduce((s, l) => s + (parseFloat(l.paid) || 0), 0);
  const remainingIQD = openingBalanceIQD + totalAmountIQD - totalPaidIQD;

  const totalUSD = lists.filter((l) => (l.currency || 'IQD') === 'USD').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const paidUSDFromLists = lists.filter((l) => (l.currency || 'IQD') === 'USD').reduce((s, l) => s + (parseFloat(l.paid) || 0), 0);
  const paidUSDFromSuppliers = suppliers.reduce((s, sup) => {
    if (!sup.payments || !sup.payments.length) return s;
    return s + sup.payments.filter((p) => (p.currency || 'IQD') === 'USD').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, 0);
  const paidUSD = paidUSDFromLists + paidUSDFromSuppliers;
  const remainingUSD = openingBalanceUSD + totalUSD - paidUSD;

  const statSuppliers = document.getElementById('statSuppliers');
  const statLists = document.getElementById('statLists');
  const statTotalAmount = document.getElementById('statTotalAmount');
  const statPaid = document.getElementById('statPaid');
  const statTotalUSD = document.getElementById('statTotalUSD');
  const statPaidUSD = document.getElementById('statPaidUSD');
  const recentLists = document.getElementById('recentLists');

  if (statSuppliers) statSuppliers.textContent = suppliers.length;
  if (statLists) statLists.textContent = lists.length;
  if (statTotalAmount) statTotalAmount.textContent = remainingIQD.toFixed(2);
  if (statPaid) statPaid.textContent = totalPaid.toFixed(2);
  if (statTotalUSD) statTotalUSD.textContent = remainingUSD.toFixed(2);
  if (statPaidUSD) statPaidUSD.textContent = paidUSD.toFixed(2);

  const recent = lists.slice(0, 5);
  if (recentLists) {
    if (recent.length === 0) {
      recentLists.innerHTML = '<p class="empty-msg">لا توجد قوائم حديثة</p>';
    } else {
      recentLists.innerHTML = recent.map((list) => {
        const supplier = suppliers.find(s => s.id === list.supplierId);
        const name = supplier ? supplier.name : '—';
        const curr = list.currency || 'IQD';
        return `<div class="recent-item">
          <span>${escapeHtml(list.number)} - ${escapeHtml(name)}</span>
          <span>${formatAmount(list.amount, curr)}</span>
        </div>`;
      }).join('');
    }
  }
}

/* ===== Suppliers ===== */
function getSupplierBalance(supplierId) {
  const supplier = getSuppliers().find((s) => s.id === supplierId);
  const lists = getLists().filter((l) => l.supplierId === supplierId);
  const openingByCurr = {};
  if (supplier && (supplier.openingBalance || 0) !== 0) {
    const c = supplier.openingBalanceCurrency || 'IQD';
    openingByCurr[c] = (openingByCurr[c] || 0) + (parseFloat(supplier.openingBalance) || 0);
  }
  const listsByCurr = {};
  lists.forEach((list) => {
    const c = list.currency || 'IQD';
    listsByCurr[c] = (listsByCurr[c] || 0) + (parseFloat(list.amount) || 0);
  });
  const paidOnListsByCurr = {};
  lists.forEach((list) => {
    const c = list.currency || 'IQD';
    paidOnListsByCurr[c] = (paidOnListsByCurr[c] || 0) + (parseFloat(list.paid) || 0);
  });
  const supplierPaymentsByCurr = { IQD: 0, USD: 0 };
  if (supplier && supplier.payments && supplier.payments.length) {
    supplier.payments.forEach((p) => {
      const c = p.currency || 'IQD';
      if (c !== 'SAR') supplierPaymentsByCurr[c] = (supplierPaymentsByCurr[c] || 0) + (parseFloat(p.amount) || 0);
    });
  }
  const totalOwedByCurr = {};
  ['IQD', 'USD'].forEach((c) => {
    totalOwedByCurr[c] = (openingByCurr[c] || 0) + (listsByCurr[c] || 0);
  });
  const totalPaidByCurr = {};
  ['IQD', 'USD'].forEach((c) => {
    totalPaidByCurr[c] = (paidOnListsByCurr[c] || 0) + (supplierPaymentsByCurr[c] || 0);
  });
  const remainingByCurr = {};
  ['IQD', 'USD'].forEach((c) => {
    remainingByCurr[c] = (totalOwedByCurr[c] || 0) - (totalPaidByCurr[c] || 0);
  });
  return {
    openingByCurr,
    listsByCurr,
    paidOnListsByCurr,
    supplierPaymentsByCurr,
    totalOwedByCurr,
    totalPaidByCurr,
    remainingByCurr
  };
}

function getSupplierTotalAmounts(supplierId) {
  const lists = getLists().filter((l) => l.supplierId === supplierId);
  const byCurrency = {};
  lists.forEach((list) => {
    const curr = list.currency || 'IQD';
    if (!byCurrency[curr]) byCurrency[curr] = 0;
    byCurrency[curr] += parseFloat(list.amount) || 0;
  });
  return byCurrency;
}

function formatSupplierTotal(byCurrency) {
  const parts = [];
  if (byCurrency.IQD && byCurrency.IQD > 0) parts.push(formatAmount(byCurrency.IQD, 'IQD'));
  if (byCurrency.USD && byCurrency.USD > 0) parts.push(formatAmount(byCurrency.USD, 'USD'));
  return parts.length ? parts.join(' · ') : '—';
}

function renderSuppliersTable(searchQuery) {
  const tbody = document.getElementById('suppliersTableBody');
  let suppliers = getSuppliers();
  const q = (searchQuery || '').trim().toLowerCase();
  if (q) {
    suppliers = suppliers.filter((s) =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q)
    );
  }
  if (!tbody) return;
  if (suppliers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">' + (q ? 'لا توجد نتائج للبحث' : 'لا يوجد موردين') + '</td></tr>';
    return;
  }
  tbody.innerHTML = suppliers.map((s) => {
    const bal = getSupplierBalance(s.id);
    const openingStr = formatSupplierTotal(bal.openingByCurr);
    const listsStr = formatSupplierTotal(bal.listsByCurr);
    const paidStr = formatSupplierTotal(bal.totalPaidByCurr);
    const remainingStr = formatSupplierTotal(bal.remainingByCurr);
    return `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.phone || '')}</td>
      <td>${escapeHtml(s.address)}</td>
      <td class="supplier-amount">${openingStr}</td>
      <td class="supplier-amount">${listsStr}</td>
      <td class="supplier-amount">${paidStr}</td>
      <td class="supplier-total-amount">${remainingStr}</td>
      <td class="actions-cell">
        <button type="button" class="btn btn-sm btn-primary supplier-detail-btn" data-id="${escapeHtml(s.id)}" title="تفاصيل المورد">تفاصيل</button>
        <button type="button" class="btn btn-sm btn-success supplier-pay-btn" data-id="${escapeHtml(s.id)}" title="دفع جزئي للمورد">دفع للمورد</button>
        <button type="button" class="btn btn-sm btn-danger supplier-delete-btn" data-id="${escapeHtml(s.id)}" title="حذف المورد">حذف</button>
      </td>
    </tr>
  `;
  }).join('');

  tbody.querySelectorAll('.supplier-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => openSupplierDetailsModal(btn.dataset.id));
  });
  tbody.querySelectorAll('.supplier-pay-btn').forEach((btn) => {
    btn.addEventListener('click', () => openSupplierPaymentModal(btn.dataset.id));
  });
  tbody.querySelectorAll('.supplier-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteSupplier(btn.dataset.id));
  });
}

function openSupplierPaymentModal(supplierId) {
  const supplier = getSuppliers().find((s) => s.id === supplierId);
  if (!supplier) return;
  document.getElementById('supplierPaymentId').value = supplierId;
  document.getElementById('supplierPaymentName').textContent = 'المورد: ' + (supplier.name || '—');
  document.getElementById('supplierPaymentAmount').value = '';
  document.getElementById('supplierPaymentModal').classList.add('active');
}

function openSupplierDetailsModal(supplierId) {
  const supplier = getSuppliers().find((s) => s.id === supplierId);
  if (!supplier) return;
  const bal = getSupplierBalance(supplierId);
  const lists = getLists().filter((l) => l.supplierId === supplierId);

  let html = '<div class="detail-body supplier-detail-body">';

  // معلومات المورد
  html += '<div class="detail-section detail-info">';
  html += '<div class="detail-section-title">معلومات المورد</div>';
  html += '<div class="detail-rows">';
  html += '<div class="detail-row"><span class="detail-label">الاسم</span><span class="detail-value">' + escapeHtml(supplier.name || '—') + '</span></div>';
  html += '<div class="detail-row"><span class="detail-label">الهاتف</span><span class="detail-value">' + escapeHtml(supplier.phone || '—') + '</span></div>';
  html += '<div class="detail-row"><span class="detail-label">العنوان</span><span class="detail-value">' + escapeHtml(supplier.address || '—') + '</span></div>';
  html += '</div></div>';

  // ملخص المبالغ (ترتيب: الرصيد الافتتاحي → إجمالي القوائم → المدفوع → المتبقي)
  html += '<div class="detail-section detail-amounts">';
  html += '<div class="detail-section-title">ملخص المبالغ</div>';
  html += '<div class="detail-amounts-grid">';
  html += '<div class="detail-amount-item"><span class="detail-amount-label">الرصيد الافتتاحي</span><span class="detail-amount-value">' + formatSupplierTotal(bal.openingByCurr) + '</span></div>';
  html += '<div class="detail-amount-item"><span class="detail-amount-label">إجمالي القوائم</span><span class="detail-amount-value">' + formatSupplierTotal(bal.listsByCurr) + '</span></div>';
  html += '<div class="detail-amount-item"><span class="detail-amount-label">المدفوع</span><span class="detail-amount-value detail-paid">' + formatSupplierTotal(bal.totalPaidByCurr) + '</span></div>';
  html += '<div class="detail-amount-item"><span class="detail-amount-label">المتبقي</span><span class="detail-amount-value detail-remaining">' + formatSupplierTotal(bal.remainingByCurr) + '</span></div>';
  html += '</div></div>';

  // قوائم الشراء
  html += '<div class="detail-section detail-products-wrap">';
  html += '<span class="detail-section-title">قوائم الشراء</span>';
  if (lists.length === 0) {
    html += '<p class="empty-msg">لا توجد قوائم لهذا المورد</p>';
  } else {
    html += '<table class="detail-products-table"><thead><tr><th>رقم القائمة</th><th>التاريخ</th><th>العملة</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>';
    lists.forEach((list) => {
      const curr = list.currency || 'IQD';
      const amount = parseFloat(list.amount) || 0;
      const paid = parseFloat(list.paid) || 0;
      const remaining = amount - paid;
      const dateStr = list.createdAt ? new Date(list.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
      html += '<tr><td>' + escapeHtml(list.number) + '</td><td>' + escapeHtml(dateStr) + '</td><td>' + escapeHtml(getCurrencyLabel(curr)) + '</td><td>' + formatAmount(amount, curr) + '</td><td>' + formatAmount(paid, curr) + '</td><td>' + formatAmount(remaining, curr) + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  html += '</div>';

  // الدفعات (دفعات القوائم + دفعات المورد)
  const listPayments = [];
  lists.forEach((list) => {
    const curr = list.currency || 'IQD';
    (list.payments || []).forEach((p) => listPayments.push({ ...p, currency: curr, source: 'قائمة: ' + list.number }));
  });
  const supplierPayments = (supplier.payments || []).map((p) => ({ ...p, source: 'دفع للمورد' }));

  html += '<div class="detail-section detail-payments-wrap">';
  html += '<span class="detail-section-title">الدفعات</span>';
  if (listPayments.length === 0 && supplierPayments.length === 0) {
    html += '<p class="empty-msg">لا توجد دفعات مسجلة</p>';
  } else {
    html += '<table class="detail-products-table detail-payments-table"><thead><tr><th>المصدر</th><th>التاريخ</th><th>الوقت</th><th>المبلغ</th></tr></thead><tbody>';
    listPayments.forEach((p) => {
      const d = new Date(p.date);
      html += '<tr><td>' + escapeHtml(p.source || '—') + '</td><td>' + d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) + '</td><td>' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + '</td><td>' + formatAmount(p.amount, p.currency || 'IQD') + '</td></tr>';
    });
    supplierPayments.forEach((p) => {
      const d = new Date(p.date);
      html += '<tr><td>' + escapeHtml(p.source || '—') + '</td><td>' + d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) + '</td><td>' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + '</td><td>' + formatAmount(p.amount, p.currency || 'IQD') + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  html += '</div>';

  html += '</div>';
  document.getElementById('supplierDetailContent').innerHTML = html;
  supplierDetailModal?.setAttribute('data-print-supplier-id', supplierId);
  supplierDetailModal?.classList.add('active');
}

function printSupplierDetail() {
  const supplierId = supplierDetailModal?.getAttribute('data-print-supplier-id');
  if (!supplierId) return;
  const supplier = getSuppliers().find((s) => s.id === supplierId);
  if (!supplier) return;
  const bal = getSupplierBalance(supplierId);
  const lists = getLists().filter((l) => l.supplierId === supplierId);
  const listPayments = [];
  lists.forEach((list) => {
    const curr = list.currency || 'IQD';
    (list.payments || []).forEach((p) => listPayments.push({ ...p, currency: curr, source: 'قائمة: ' + list.number }));
  });
  const supplierPayments = (supplier.payments || []).map((p) => ({ ...p, source: 'دفع للمورد' }));
  const printDate = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const printTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  let html = '<div class="print-container" dir="rtl">';
  html += '<header class="print-header">';
  html += '<h1 class="print-title">تفاصيل المورد — القوائم والدفعات</h1>';
  html += '<p class="print-subtitle">' + escapeHtml(supplier.name || '—') + '</p>';
  html += '<p class="print-date">تاريخ الطباعة: ' + escapeHtml(printDate) + ' — ' + escapeHtml(printTime) + '</p>';
  html += '</header>';

  html += '<section class="print-info-box">';
  html += '<h2 class="print-section-title">معلومات المورد</h2>';
  html += '<table class="print-info-table">';
  html += '<tr><td class="print-info-label">الاسم</td><td class="print-info-value">' + escapeHtml(supplier.name || '—') + '</td></tr>';
  html += '<tr><td class="print-info-label">الهاتف</td><td class="print-info-value">' + escapeHtml(supplier.phone || '—') + '</td></tr>';
  html += '<tr><td class="print-info-label">العنوان</td><td class="print-info-value">' + escapeHtml(supplier.address || '—') + '</td></tr>';
  html += '</table>';
  html += '</section>';

  html += '<section class="print-amounts-box">';
  html += '<h2 class="print-section-title">ملخص المبالغ</h2>';
  html += '<table class="print-amounts-table">';
  html += '<tr><td>الرصيد الافتتاحي</td><td class="print-amount">' + formatSupplierTotal(bal.openingByCurr) + '</td></tr>';
  html += '<tr><td>إجمالي القوائم</td><td class="print-amount">' + formatSupplierTotal(bal.listsByCurr) + '</td></tr>';
  html += '<tr><td>المدفوع</td><td class="print-amount print-paid">' + formatSupplierTotal(bal.totalPaidByCurr) + '</td></tr>';
  html += '<tr><td>المتبقي</td><td class="print-amount print-remaining">' + formatSupplierTotal(bal.remainingByCurr) + '</td></tr>';
  html += '</table>';
  html += '</section>';

  html += '<section class="print-payments-section">';
  html += '<h2 class="print-section-title">قوائم الشراء</h2>';
  if (lists.length === 0) {
    html += '<p class="print-empty">لا توجد قوائم</p>';
  } else {
    html += '<table class="print-table"><thead><tr><th>#</th><th>رقم القائمة</th><th>التاريخ</th><th>العملة</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>';
    lists.forEach((list, i) => {
      const curr = list.currency || 'IQD';
      const amount = parseFloat(list.amount) || 0;
      const paid = parseFloat(list.paid) || 0;
      const dateStr = list.createdAt ? new Date(list.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
      html += '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(list.number) + '</td><td>' + escapeHtml(dateStr) + '</td><td>' + escapeHtml(getCurrencyLabel(curr)) + '</td><td>' + formatAmount(amount, curr) + '</td><td>' + formatAmount(paid, curr) + '</td><td>' + formatAmount(amount - paid, curr) + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  html += '</section>';

  html += '<section class="print-payments-section">';
  html += '<h2 class="print-section-title">الدفعات</h2>';
  if (listPayments.length === 0 && supplierPayments.length === 0) {
    html += '<p class="print-empty">لا توجد دفعات مسجلة</p>';
  } else {
    html += '<table class="print-table"><thead><tr><th>#</th><th>المصدر</th><th>التاريخ</th><th>الوقت</th><th>المبلغ</th></tr></thead><tbody>';
    let rowNum = 0;
    listPayments.forEach((p) => {
      rowNum++;
      const d = new Date(p.date);
      html += '<tr><td>' + rowNum + '</td><td>' + escapeHtml(p.source || '—') + '</td><td>' + d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) + '</td><td>' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + '</td><td>' + formatAmount(p.amount, p.currency || 'IQD') + '</td></tr>';
    });
    supplierPayments.forEach((p) => {
      rowNum++;
      const d = new Date(p.date);
      html += '<tr><td>' + rowNum + '</td><td>' + escapeHtml(p.source || '—') + '</td><td>' + d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) + '</td><td>' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + '</td><td>' + formatAmount(p.amount, p.currency || 'IQD') + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  html += '</section>';

  html += '<footer class="print-footer">';
  html += '<p class="print-footer-date">' + escapeHtml(printDate) + ' ' + escapeHtml(printTime) + '</p>';
  html += '</footer>';
  html += '</div>';

  const printArea = document.getElementById('printArea');
  if (printArea) {
    printArea.innerHTML = html;
    printArea.classList.add('active');
  }
  window.print();
  if (printArea) printArea.classList.remove('active');
}

document.getElementById('supplierPaymentModalClose')?.addEventListener('click', () => {
  document.getElementById('supplierPaymentModal').classList.remove('active');
});
document.getElementById('supplierPaymentModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'supplierPaymentModal') document.getElementById('supplierPaymentModal').classList.remove('active');
});

document.getElementById('supplierPaymentForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const supplierId = document.getElementById('supplierPaymentId').value;
  const amount = parseFloat(document.getElementById('supplierPaymentAmount').value) || 0;
  const currency = document.getElementById('supplierPaymentCurrency').value || 'IQD';
  if (!supplierId || amount <= 0) return;
  const suppliers = getSuppliers();
  const supplier = suppliers.find((s) => s.id === supplierId);
  if (!supplier) return;
  if (!supplier.payments) supplier.payments = [];
  supplier.payments.push({
    id: generateId(),
    amount,
    currency,
    date: new Date().toISOString()
  });
  setSuppliers(suppliers);
  addActivity('payment', 'دفع للمورد: ' + (supplier.name || ''), formatAmount(amount, currency));
  document.getElementById('supplierPaymentModal').classList.remove('active');
  document.getElementById('supplierPaymentForm').reset();
  renderSuppliersTable(document.getElementById('suppliersSearch')?.value);
  renderDashboard();
});

function fillSupplierSelect() {
  const select = document.getElementById('listSupplier');
  if (!select) return;
  const suppliers = getSuppliers();
  select.innerHTML = '<option value="">-- اختر المورد --</option>' +
    suppliers.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');
}

/* ===== Add Supplier Form ===== */
document.getElementById('addSupplierForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('supplierName').value.trim();
  const phoneRaw = document.getElementById('supplierPhone').value.trim();
  const phone = phoneRaw.replace(/\D/g, '').slice(0, 11);
  const address = document.getElementById('supplierAddress').value.trim();
  const openingBalance = parseFloat(document.getElementById('supplierOpeningBalance').value) || 0;
  const openingBalanceCurrency = document.getElementById('supplierOpeningBalanceCurrency').value || 'IQD';
  if (!name || !phone || !address) return;

  const suppliers = getSuppliers();
  const newSupplier = {
    id: generateId(),
    name,
    phone,
    address,
    openingBalance,
    openingBalanceCurrency,
    payments: []
  };
  suppliers.push(newSupplier);
  setSuppliers(suppliers);

  addActivity('supplier', `إضافة مورد: ${name}`, `${phone}`);
  document.getElementById('addSupplierForm').reset();
  document.getElementById('supplierOpeningBalance').value = 0;
  fillSupplierSelect();
  showPage('suppliers');
  renderSuppliersTable();
  renderDashboard();
});

/* ===== Add List: Product rows ===== */
let productRowIndex = 1;

function updateProductTotals() {
  const container = document.getElementById('productFieldsContainer');
  const listAmountEl = document.getElementById('listAmount');
  const listAmountLabel = document.getElementById('listAmountLabel');
  const currencySelect = document.getElementById('listCurrency');
  if (!container || !listAmountEl) return;
  const currency = (currencySelect && currencySelect.value) || 'IQD';
  const sym = getCurrencyLabel(currency);
  const rows = container.querySelectorAll('.product-row');
  let sum = 0;
  rows.forEach((row) => {
    const qty = parseFloat(row.querySelector('.product-quantity')?.value) || 0;
    const price = parseFloat(row.querySelector('.product-unit-price')?.value) || 0;
    const total = qty * price;
    const totalEl = row.querySelector('.product-total');
    if (totalEl) {
      totalEl.textContent = total.toFixed(2) + ' ' + sym;
    }
    sum += total;
  });
  listAmountEl.value = sum.toFixed(2) + ' ' + sym;
  if (listAmountLabel) listAmountLabel.textContent = 'مبلغ القائمة (' + sym + ') — مجمع من المنتجات';
}

function addProductRow() {
  const container = document.getElementById('productFieldsContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'product-row';
  div.dataset.index = productRowIndex++;
  div.innerHTML = `
    <input type="text" class="product-type product-col-type" placeholder="نوع المنتج">
    <input type="number" class="product-quantity product-col-qty" min="0" step="1" value="1" placeholder="0">
    <input type="number" class="product-unit-price product-col-price" min="0" step="0.01" value="0" placeholder="0.00">
    <span class="product-total product-col-total">0.00</span>
    <button type="button" class="btn-icon remove-product product-col-action" title="حذف">−</button>
  `;
  div.querySelector('.remove-product').addEventListener('click', () => {
    if (container.querySelectorAll('.product-row').length > 1) {
      div.remove();
      updateProductTotals();
    }
  });
  container.appendChild(div);
  updateProductTotals();
}

document.getElementById('addProductRow')?.addEventListener('click', addProductRow);

document.getElementById('productFieldsContainer')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-product')) {
    const row = e.target.closest('.product-row');
    const container = document.getElementById('productFieldsContainer');
    if (row && container && container.querySelectorAll('.product-row').length > 1) {
      row.remove();
      updateProductTotals();
    }
  }
});

document.getElementById('productFieldsContainer')?.addEventListener('input', (e) => {
  if (e.target.classList.contains('product-quantity') || e.target.classList.contains('product-unit-price')) {
    updateProductTotals();
  }
});

document.getElementById('listCurrency')?.addEventListener('change', updateProductTotals);

/* ===== صورة القائمة: اختيار ملف أو التقاط ===== */
let capturedListImageData = null;
let captureStream = null;

function setListImagePreview(dataUrl) {
  const preview = document.getElementById('listImagePreview');
  if (!preview) return;
  preview.innerHTML = '';
  if (dataUrl) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'معاينة';
    preview.appendChild(img);
  }
}

function setupListImagePreview() {
  const input = document.getElementById('listImage');
  const preview = document.getElementById('listImagePreview');
  if (!input || !preview) return;
  input.onchange = () => {
    capturedListImageData = null;
    preview.innerHTML = '';
    const file = input.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setListImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
}

function openCaptureModal() {
  const modal = document.getElementById('captureImageModal');
  const video = document.getElementById('captureVideo');
  if (!modal || !video) return;
  capturedListImageData = null;
  document.getElementById('listImage').value = '';
  setListImagePreview('');
  modal.classList.add('active');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
      captureStream = stream;
      video.srcObject = stream;
    })
    .catch(() => {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          captureStream = stream;
          video.srcObject = stream;
        })
        .catch((err) => {
          alert('تعذّر الوصول إلى الكاميرا. تأكد من السماح للموقع باستخدام الكاميرا.');
          document.getElementById('captureImageModal').classList.remove('active');
        });
    });
}

function closeCaptureModal() {
  const modal = document.getElementById('captureImageModal');
  const video = document.getElementById('captureVideo');
  if (captureStream) {
    captureStream.getTracks().forEach((t) => t.stop());
    captureStream = null;
  }
  if (video) video.srcObject = null;
  if (modal) modal.classList.remove('active');
}

function captureImageFromVideo() {
  const video = document.getElementById('captureVideo');
  const preview = document.getElementById('listImagePreview');
  if (!video || !video.srcObject || video.readyState < 2) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  capturedListImageData = dataUrl;
  setListImagePreview(dataUrl);
  closeCaptureModal();
}

document.getElementById('captureImageBtn')?.addEventListener('click', openCaptureModal);
document.getElementById('captureImageModalClose')?.addEventListener('click', closeCaptureModal);
document.getElementById('captureCancelBtn')?.addEventListener('click', closeCaptureModal);
document.getElementById('captureTakeBtn')?.addEventListener('click', captureImageFromVideo);
document.getElementById('captureImageModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'captureImageModal') closeCaptureModal();
});

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ===== Lists table ===== */
function renderListsTable(searchQuery) {
  const tbody = document.getElementById('listsTableBody');
  let lists = getLists();
  const suppliers = getSuppliers();
  const q = (searchQuery || '').trim().toLowerCase();
  if (q) {
    lists = lists.filter((list) => {
      const supplier = suppliers.find(s => s.id === list.supplierId);
      const name = supplier ? supplier.name : '';
      const amountStr = (parseFloat(list.amount) || 0).toFixed(2);
      return (name || '').toLowerCase().includes(q) ||
        (list.number || '').toLowerCase().includes(q) ||
        amountStr.includes(q) ||
        (list.paid != null && String(list.paid).toLowerCase().includes(q));
    });
  }
  if (!tbody) return;
  if (lists.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">' + (q ? 'لا توجد نتائج للبحث' : 'لا توجد قوائم') + '</td></tr>';
    return;
  }
  tbody.innerHTML = lists.map((list) => {
    const supplier = suppliers.find(s => s.id === list.supplierId);
    const name = supplier ? supplier.name : '—';
    const curr = list.currency || 'IQD';
    const amount = parseFloat(list.amount) || 0;
    const paid = parseFloat(list.paid) || 0;
    const dateStr = list.createdAt
      ? new Date(list.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—';
    return `<tr>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(list.number)}</td>
      <td class="list-date-cell">${escapeHtml(dateStr)}</td>
      <td>${formatAmount(amount, curr)}</td>
      <td>${formatAmount(paid, curr)}</td>
      <td class="actions-cell">
        <button type="button" class="btn btn-sm btn-success view-detail" data-id="${escapeHtml(list.id)}" title="تفاصيل">عرض</button>
        <button type="button" class="btn btn-sm btn-success partial-pay" data-id="${escapeHtml(list.id)}" title="دفع جزئي">دفع جزئي</button>
        <button type="button" class="btn btn-sm btn-danger delete-list" data-id="${escapeHtml(list.id)}" title="حذف">حذف</button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.delete-list').forEach(btn => {
    btn.addEventListener('click', () => deleteList(btn.dataset.id));
  });
  tbody.querySelectorAll('.partial-pay').forEach(btn => {
    btn.addEventListener('click', () => openPaymentModal(btn.dataset.id));
  });
  tbody.querySelectorAll('.view-detail').forEach(btn => {
    btn.addEventListener('click', () => showListDetail(btn.dataset.id));
  });
}

function deleteList(id) {
  if (!confirm('هل تريد حذف هذه القائمة؟')) return;
  const lists = getLists().filter(l => l.id !== id);
  setLists(lists);
  addActivity('delete', 'حذف قائمة', id);
  renderListsTable();
  renderDashboard();
}

function deleteSupplier(supplierId) {
  const supplier = getSuppliers().find((s) => s.id === supplierId);
  if (!supplier) return;
  const lists = getLists().filter((l) => l.supplierId === supplierId);
  const listsCount = lists.length;
  let message = 'هل تريد حذف المورد "' + (supplier.name || '') + '"؟';
  if (listsCount > 0) {
    message += '\n\nتحذير: يوجد ' + listsCount + ' قائمة مرتبطة بهذا المورد. سيتم حذف المورد فقط (القوائم ستبقى موجودة).';
  }
  if (!confirm(message)) return;
  const suppliers = getSuppliers().filter((s) => s.id !== supplierId);
  setSuppliers(suppliers);
  addActivity('delete', 'حذف مورد: ' + (supplier.name || ''), '');
  renderSuppliersTable(document.getElementById('suppliersSearch')?.value);
  renderDashboard();
}

function openPaymentModal(listId) {
  const list = getLists().find(l => l.id === listId);
  if (!list) return;
  document.getElementById('paymentListId').value = listId;
  const payInput = document.getElementById('paymentAmount');
  payInput.value = '';
  const remaining = (parseFloat(list.amount) || 0) - (parseFloat(list.paid) || 0);
  payInput.max = remaining;
  const curr = list.currency || 'IQD';
  payInput.placeholder = 'المتبقي ' + formatAmount(remaining, curr);
  paymentModal?.classList.add('active');
}

function showListDetail(listId) {
  const list = getLists().find(l => l.id === listId);
  const suppliers = getSuppliers();
  if (!list) return;
  const supplier = suppliers.find(s => s.id === list.supplierId);
  const curr = list.currency || 'IQD';
  const amount = parseFloat(list.amount) || 0;
  const paid = parseFloat(list.paid) || 0;
  const remaining = amount - paid;

  let html = '<div class="detail-body">';

  // معلومات أساسية
  html += '<div class="detail-section detail-info">';
  html += '<div class="detail-row"><span class="detail-label">رقم القائمة</span><span class="detail-value">' + escapeHtml(list.number) + '</span></div>';
  html += '<div class="detail-row"><span class="detail-label">المورد</span><span class="detail-value">' + escapeHtml(supplier ? supplier.name : '—') + '</span></div>';
  html += '<div class="detail-row"><span class="detail-label">العملة</span><span class="detail-value">' + escapeHtml((CURRENCIES[curr] && CURRENCIES[curr].name) || curr) + '</span></div>';
  html += '</div>';

  // المبالغ
  html += '<div class="detail-section detail-amounts">';
  html += '<div class="detail-amount-item"><span class="detail-amount-label">مبلغ القائمة</span><span class="detail-amount-value">' + formatAmount(amount, curr) + '</span></div>';
  html += '<div class="detail-amount-item"><span class="detail-amount-label">المدفوع</span><span class="detail-amount-value detail-paid">' + formatAmount(paid, curr) + '</span></div>';
  html += '<div class="detail-amount-item"><span class="detail-amount-label">المتبقي</span><span class="detail-amount-value detail-remaining">' + formatAmount(remaining, curr) + '</span></div>';
  html += '</div>';

  // تفاصيل الدفع (تاريخ ووقت كل دفعة)
  const payments = list.payments && list.payments.length ? list.payments : [];
  html += '<div class="detail-section detail-payments-wrap">';
  html += '<span class="detail-section-title">تفاصيل الدفع</span>';
  if (payments.length === 0) {
    html += '<p class="empty-msg">لا توجد دفعات مسجلة</p>';
  } else {
    html += '<table class="detail-products-table detail-payments-table"><thead><tr><th>التاريخ</th><th>الوقت</th><th>المبلغ</th></tr></thead><tbody>';
    payments.forEach(function(p) {
      const d = new Date(p.date);
      const dateStr = d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      html += '<tr><td>' + escapeHtml(dateStr) + '</td><td>' + escapeHtml(timeStr) + '</td><td>' + formatAmount(p.amount, curr) + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  html += '</div>';

  // صورة القائمة
  if (list.image) {
    html += '<div class="detail-section detail-image-wrap">';
    html += '<span class="detail-section-title">صورة القائمة</span>';
    html += '<img src="' + list.image + '" alt="صورة القائمة" class="detail-image">';
    html += '</div>';
  }

  // أنواع المنتجات
  if (list.products && list.products.length) {
    const hasProducts = list.products.some(p => p.type || p.quantity != null || p.unitPrice != null);
    if (hasProducts) {
      html += '<div class="detail-section detail-products-wrap">';
      html += '<span class="detail-section-title">نوع المنتج</span>';
      html += '<table class="detail-products-table"><thead><tr><th>نوع المنتج</th><th>الكمية</th><th>سعر المفرد</th><th>المجموع</th></tr></thead><tbody>';
      list.products.forEach(p => {
        const qty = p.quantity != null ? p.quantity : '—';
        const unitPrice = p.unitPrice != null ? formatAmount(p.unitPrice, curr) : '—';
        const total = p.total != null ? formatAmount(p.total, curr) : '—';
        if (p.type || p.quantity != null || p.unitPrice != null) {
          html += '<tr><td>' + escapeHtml(p.type || '—') + '</td><td>' + (typeof qty === 'number' ? qty : escapeHtml(String(qty))) + '</td><td>' + unitPrice + '</td><td>' + total + '</td></tr>';
        }
      });
      html += '</tbody></table>';
      html += '</div>';
    }
  }

  html += '</div>';
  document.getElementById('listDetailContent').innerHTML = html;
  listDetailModal?.classList.add('active');
  listDetailModal?.setAttribute('data-print-list-id', listId);
}

function printListDetail() {
  const listId = listDetailModal?.getAttribute('data-print-list-id');
  if (!listId) return;
  const list = getLists().find(l => l.id === listId);
  const suppliers = getSuppliers();
  if (!list) return;
  const supplier = suppliers.find(s => s.id === list.supplierId);
  const curr = list.currency || 'IQD';
  const amount = parseFloat(list.amount) || 0;
  const paid = parseFloat(list.paid) || 0;
  const remaining = amount - paid;
  const payments = list.payments && list.payments.length ? list.payments : [];
  const printDate = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const printTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  let html = '<div class="print-container" dir="rtl">';
  html += '<header class="print-header">';
  html += '<h1 class="print-title">تفاصيل القائمة والدفعات</h1>';
  html += '<p class="print-subtitle">' + escapeHtml(list.number) + '</p>';
  html += '<p class="print-date">تاريخ الطباعة: ' + escapeHtml(printDate) + ' — ' + escapeHtml(printTime) + '</p>';
  html += '</header>';

  html += '<section class="print-info-box">';
  html += '<h2 class="print-section-title">معلومات القائمة</h2>';
  html += '<table class="print-info-table">';
  html += '<tr><td class="print-info-label">رقم القائمة</td><td class="print-info-value">' + escapeHtml(list.number) + '</td></tr>';
  html += '<tr><td class="print-info-label">المورد</td><td class="print-info-value">' + escapeHtml(supplier ? supplier.name : '—') + '</td></tr>';
  html += '<tr><td class="print-info-label">العملة</td><td class="print-info-value">' + escapeHtml((CURRENCIES[curr] && CURRENCIES[curr].name) || curr) + '</td></tr>';
  html += '</table>';
  html += '</section>';

  html += '<section class="print-amounts-box">';
  html += '<h2 class="print-section-title">ملخص المبالغ</h2>';
  html += '<table class="print-amounts-table">';
  html += '<tr><td>مبلغ القائمة</td><td class="print-amount">' + formatAmount(amount, curr) + '</td></tr>';
  html += '<tr><td>المدفوع</td><td class="print-amount print-paid">' + formatAmount(paid, curr) + '</td></tr>';
  html += '<tr><td>المتبقي</td><td class="print-amount print-remaining">' + formatAmount(remaining, curr) + '</td></tr>';
  html += '</table>';
  html += '</section>';

  html += '<section class="print-payments-section">';
  html += '<h2 class="print-section-title">تفاصيل الدفع</h2>';
  if (payments.length === 0) {
    html += '<p class="print-empty">لا توجد دفعات مسجلة</p>';
  } else {
    html += '<table class="print-table"><thead><tr><th>#</th><th>التاريخ</th><th>الوقت</th><th>المبلغ</th></tr></thead><tbody>';
    payments.forEach(function(p, i) {
      const d = new Date(p.date);
      const dateStr = d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      html += '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(dateStr) + '</td><td>' + escapeHtml(timeStr) + '</td><td>' + formatAmount(p.amount, curr) + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  html += '</section>';

  if (list.products && list.products.length) {
    const hasProducts = list.products.some(p => p.type || p.quantity != null || p.unitPrice != null);
    if (hasProducts) {
      html += '<section class="print-products-section">';
      html += '<h2 class="print-section-title">تفاصيل المنتجات</h2>';
      html += '<table class="print-table"><thead><tr><th>#</th><th>نوع المنتج</th><th>الكمية</th><th>سعر المفرد</th><th>المجموع</th></tr></thead><tbody>';
      let rowNum = 0;
      list.products.forEach(p => {
        if (p.type || p.quantity != null || p.unitPrice != null) {
          rowNum++;
          const qty = p.quantity != null ? p.quantity : '—';
          const unitPrice = p.unitPrice != null ? formatAmount(p.unitPrice, curr) : '—';
          const total = p.total != null ? formatAmount(p.total, curr) : '—';
          html += '<tr><td>' + rowNum + '</td><td>' + escapeHtml(p.type || '—') + '</td><td>' + qty + '</td><td>' + unitPrice + '</td><td>' + total + '</td></tr>';
        }
      });
      html += '</tbody></table>';
      html += '</section>';
    }
  }

  html += '<footer class="print-footer">';
  html += '<p>— نهاية التقرير —</p>';
  html += '<p class="print-footer-date">' + escapeHtml(printDate) + ' ' + escapeHtml(printTime) + '</p>';
  html += '</footer>';
  html += '</div>';

  const printArea = document.getElementById('printArea');
  if (printArea) {
    printArea.innerHTML = html;
    window.print();
  }
}

paymentModalClose?.addEventListener('click', () => paymentModal?.classList.remove('active'));
listDetailModalClose?.addEventListener('click', () => listDetailModal?.classList.remove('active'));
document.getElementById('listDetailPrintBtn')?.addEventListener('click', () => printListDetail());
paymentModal?.addEventListener('click', (e) => { if (e.target === paymentModal) paymentModal.classList.remove('active'); });
listDetailModal?.addEventListener('click', (e) => { if (e.target === listDetailModal) listDetailModal.classList.remove('active'); });

supplierDetailModalClose?.addEventListener('click', () => supplierDetailModal?.classList.remove('active'));
document.getElementById('supplierDetailPrintBtn')?.addEventListener('click', () => printSupplierDetail());
supplierDetailModal?.addEventListener('click', (e) => { if (e.target === supplierDetailModal) supplierDetailModal.classList.remove('active'); });

document.getElementById('paymentForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const listId = document.getElementById('paymentListId').value;
  const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
  if (!listId || amount <= 0) return;
  const lists = getLists();
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  if (!list.payments) list.payments = [];
  list.payments.push({
    id: generateId(),
    amount: amount,
    date: new Date().toISOString()
  });
  const totalAmount = parseFloat(list.amount) || 0;
  list.paid = Math.min(totalAmount, (parseFloat(list.paid) || 0) + amount);
  setLists(lists);
  addActivity('payment', 'دفع جزئي: ' + list.number, formatAmount(amount, list.currency || 'IQD'));
  paymentModal?.classList.remove('active');
  document.getElementById('paymentForm').reset();
  renderListsTable();
  renderDashboard();
});

/* ===== Activity ===== */
function renderActivity(searchQuery) {
  const container = document.getElementById('activityList');
  let activities = getActivity();
  const q = (searchQuery || '').trim().toLowerCase();
  if (q) {
    activities = activities.filter((a) =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.meta || '').toLowerCase().includes(q) ||
      (a.date || '').toLowerCase().includes(q)
    );
  }
  if (!container) return;
  if (activities.length === 0) {
    container.innerHTML = '<p class="empty-msg">' + (q ? 'لا توجد نتائج للبحث' : 'لا توجد حركات') + '</p>';
    return;
  }
  const icons = { supplier: '🏢', list: '📝', payment: '💰', delete: '🗑️' };
  container.innerHTML = activities.map((a) => {
    const d = new Date(a.date);
    const dateStr = d.toLocaleDateString('ar-SA') + ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    return `<div class="activity-item">
      <span class="activity-icon">${icons[a.type] || '📌'}</span>
      <div class="activity-body">
        <div class="activity-title">${escapeHtml(a.title)}</div>
        <div class="activity-meta">${escapeHtml(a.meta)} · ${dateStr}</div>
      </div>
    </div>`;
  }).join('');
}

/* ===== ربط البحث ===== */
function bindSearch() {
  const suppliersSearch = document.getElementById('suppliersSearch');
  const listsSearch = document.getElementById('listsSearch');
  const activitySearch = document.getElementById('activitySearch');

  suppliersSearch?.addEventListener('input', () => renderSuppliersTable(suppliersSearch.value));
  suppliersSearch?.addEventListener('search', () => renderSuppliersTable(suppliersSearch.value));

  listsSearch?.addEventListener('input', () => renderListsTable(listsSearch.value));
  listsSearch?.addEventListener('search', () => renderListsTable(listsSearch.value));

  activitySearch?.addEventListener('input', () => renderActivity(activitySearch.value));
  activitySearch?.addEventListener('search', () => renderActivity(activitySearch.value));
}

/* ===== Add List Form (single handler) ===== */
document.getElementById('addListForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const supplierId = document.getElementById('listSupplier').value;
  const number = document.getElementById('listNumber').value.trim();
  const amount = document.getElementById('listAmount').value;
  const imageInput = document.getElementById('listImage');
  if (!supplierId || !number) return;

  const currencySelect = document.getElementById('listCurrency');
  const currency = (currencySelect && currencySelect.value) || 'IQD';
  const productRows = document.querySelectorAll('#productFieldsContainer .product-row');
  const products = [];
  productRows.forEach((row) => {
    const type = row.querySelector('.product-type')?.value?.trim();
    const qty = parseFloat(row.querySelector('.product-quantity')?.value) || 0;
    const unitPrice = parseFloat(row.querySelector('.product-unit-price')?.value) || 0;
    const total = qty * unitPrice;
    if (type || qty || unitPrice) {
      products.push({
        type: type || '',
        quantity: qty,
        unitPrice: unitPrice,
        total: total
      });
    }
  });

  const amountStr = (amount || '').replace(/[^\d.]/g, '');
  const listAmountNum = parseFloat(amountStr) || 0;
  const form = this;
  function doSubmit(imageData) {
    const lists = getLists();
    const newList = {
      id: generateId(),
      supplierId,
      number,
      currency,
      amount: listAmountNum,
      paid: 0,
      products,
      image: imageData || '',
      createdAt: new Date().toISOString()
    };
    lists.push(newList);
    setLists(lists);
    addActivity('list', 'قائمة جديدة: ' + number, formatAmount(listAmountNum, currency));
    form.reset();
    capturedListImageData = null;
    const prev = document.getElementById('listImagePreview');
    if (prev) prev.innerHTML = '';
    const container = document.getElementById('productFieldsContainer');
    if (container) {
      container.innerHTML = `
        <div class="product-row" data-index="0">
          <input type="text" class="product-type product-col-type" placeholder="نوع المنتج">
          <input type="number" class="product-quantity product-col-qty" min="0" step="1" value="1" placeholder="0">
          <input type="number" class="product-unit-price product-col-price" min="0" step="0.01" value="0" placeholder="0.00">
          <span class="product-total product-col-total">0.00</span>
          <button type="button" class="btn-icon remove-product product-col-action" title="حذف">−</button>
        </div>
      `;
      container.querySelector('.remove-product').addEventListener('click', function() {
        if (container.querySelectorAll('.product-row').length > 1) {
          this.closest('.product-row').remove();
          updateProductTotals();
        }
      });
    }
    productRowIndex = 1;
    updateProductTotals();
    showPage('lists');
    renderListsTable();
    renderDashboard();
  }
  if (capturedListImageData) {
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري رفع الصورة والحفظ...'; }
    uploadListImage(capturedListImageData).then(function(url) {
      doSubmit(url || '');
      if (btn) { btn.disabled = false; btn.textContent = 'حفظ القائمة'; }
    }).catch(function() {
      doSubmit('');
      if (btn) { btn.disabled = false; btn.textContent = 'حفظ القائمة'; }
    });
  } else if (imageInput?.files?.[0] && imageInput.files[0].type.startsWith('image/')) {
    const reader = new FileReader();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري رفع الصورة والحفظ...'; }
    reader.onload = function() {
      uploadListImage(reader.result).then(function(url) {
        doSubmit(url || '');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ القائمة'; }
      }).catch(function() {
        doSubmit('');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ القائمة'; }
      });
    };
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    doSubmit('');
  }
});

/* ===== Authentication ===== */
const LOGIN_PASSWORD = '112233'; // كلمة المرور الافتراضية - يمكن تغييرها

function checkAuth() {
  const isLoggedIn = sessionStorage.getItem('قوائم_loggedIn') === 'true';
  return isLoggedIn;
}

function setAuth(loggedIn) {
  if (loggedIn) {
    sessionStorage.setItem('قوائم_loggedIn', 'true');
  } else {
    sessionStorage.removeItem('قوائم_loggedIn');
  }
}

function showLogin() {
  const loginPage = document.getElementById('loginPage');
  const app = document.getElementById('app');
  if (loginPage) loginPage.style.display = 'flex';
  if (app) app.style.display = 'none';
}

function showApp() {
  const loginPage = document.getElementById('loginPage');
  const app = document.getElementById('app');
  if (loginPage) loginPage.style.display = 'none';
  if (app) app.style.display = 'flex';
}

function handleLogin(password) {
  if (password === LOGIN_PASSWORD) {
    setAuth(true);
    showApp();
    const errorEl = document.getElementById('loginError');
    if (errorEl) errorEl.style.display = 'none';
    loadDataFromFirebase().then(function() {
      fillSupplierSelect();
      renderDashboard();
      initNavigation();
      bindSearch();
    });
    return true;
  } else {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
      errorEl.textContent = 'كلمة المرور غير صحيحة';
      errorEl.style.display = 'block';
    }
    return false;
  }
}

function handleLogout() {
  setAuth(false);
  showLogin();
  const passwordInput = document.getElementById('loginPassword');
  if (passwordInput) passwordInput.value = '';
  const errorEl = document.getElementById('loginError');
  if (errorEl) errorEl.style.display = 'none';
}

document.getElementById('loginForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const password = document.getElementById('loginPassword')?.value || '';
  handleLogin(password);
});

document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
  e.preventDefault();
  if (confirm('هل تريد تسجيل الخروج؟')) {
    handleLogout();
  }
});

/* ===== Init ===== */
(function init() {
  if (!checkAuth()) {
    showLogin();
  } else {
    showApp();
    loadDataFromFirebase().then(function() {
      fillSupplierSelect();
      renderDashboard();
      initNavigation();
      bindSearch();
    });
  }
})();
