const statusEl = document.getElementById('status');
const refreshBtn = document.getElementById('refresh-btn');
const themeSelect = document.getElementById('theme-select');
const tabButtons = document.querySelectorAll('.tab-button');
const views = document.querySelectorAll('.view');
const versionEl = document.getElementById('app-version');

const bookForm = document.getElementById('book-form');
const memberForm = document.getElementById('member-form');
const lendForm = document.getElementById('lend-form');

const booksTableBody = document.querySelector('#books-table tbody');
const membersTableBody = document.querySelector('#members-table tbody');
const loansTableBody = document.querySelector('#loans-table tbody');
const activityFeed = document.getElementById('activity-feed');
const bookSearchInput = document.getElementById('book-search-input');
const memberNoteInput = memberForm.querySelector('textarea[name="note"]');
const loanNoteInput = lendForm.querySelector('textarea[name="note"]');

const memberHistorySelect = document.getElementById('member-history-select');
const memberHistoryTableBody = document.querySelector('#member-history-table tbody');
const bookHistorySelect = document.getElementById('book-history-select');
const bookHistoryTableBody = document.querySelector('#book-history-table tbody');
const booksInsightTotal = document.getElementById('books-insight-total');
const booksInsightBorrowed = document.getElementById('books-insight-borrowed');
const booksInsightCategories = document.getElementById('books-insight-categories');

const coverFileInput = document.getElementById('book-cover-file');
const coverSelectButton = document.getElementById('book-cover-select');
const coverCameraButton = document.getElementById('book-cover-camera');
const coverClearButton = document.getElementById('book-cover-clear');
const coverPreview = document.getElementById('book-cover-preview');
const titleInput = document.getElementById('book-title-input');
const titleSuggestionList = document.getElementById('title-suggestion-list');
const isbnInput = bookForm.querySelector('input[name="isbn"]');
const isbnScanButton = document.getElementById('isbn-scan-button');
const isbnFetchButton = document.getElementById('isbn-fetch-button');
const publisherInput = bookForm.querySelector('input[name="publisher"]');
const publishYearInput = bookForm.querySelector('input[name="publishYear"]');
const pageCountInput = bookForm.querySelector('input[name="pageCount"]');
const purchasePriceInput = bookForm.querySelector('input[name="purchasePrice"]');
const bookNoteInput = bookForm.querySelector('textarea[name="note"]');

const bookDetailModal = document.getElementById('book-detail-modal');
const bookDetailForm = document.getElementById('book-detail-form');
const bookDetailCloseButton = document.getElementById('book-detail-close');
const bookDetailCancelButton = document.getElementById('book-detail-cancel');
const bookDetailDeleteButton = document.getElementById('book-detail-delete');
const bookDetailMeta = document.getElementById('book-detail-meta');
const bookDetailTitleInput = document.getElementById('book-detail-title');
const bookDetailAuthorInput = document.getElementById('book-detail-author');
const bookDetailIsbnInput = document.getElementById('book-detail-isbn');
const bookDetailIsbnScanButton = document.getElementById('book-detail-isbn-scan');
const bookDetailIsbnFetchButton = document.getElementById('book-detail-isbn-fetch');
const bookDetailTotalInput = document.getElementById('book-detail-total');
const bookDetailAvailableInput = document.getElementById('book-detail-available');
const detailTitleSuggestionList = document.getElementById('detail-title-suggestion-list');
const bookDetailPublisherInput = document.getElementById('book-detail-publisher');
const bookDetailPublishYearInput = document.getElementById('book-detail-publish-year');
const bookDetailPageCountInput = document.getElementById('book-detail-page-count');
const bookDetailPurchasePriceInput = document.getElementById('book-detail-purchase-price');
const bookDetailNoteInput = document.getElementById('book-detail-note');

const detailCoverFileInput = document.getElementById('book-detail-cover-file');
const detailCoverSelectButton = document.getElementById('book-detail-cover-select');
const detailCoverCameraButton = document.getElementById('book-detail-cover-camera');
const detailCoverClearButton = document.getElementById('book-detail-cover-clear');
const detailCoverPreview = document.getElementById('book-detail-cover-preview');

const categoryChipList = document.getElementById('category-chip-list');
const detailCategoryChipList = document.getElementById('detail-category-chip-list');
const newCategoryInput = document.getElementById('new-category-input');
const addCategoryButton = document.getElementById('add-category-button');
const detailNewCategoryInput = document.getElementById('detail-new-category-input');
const detailAddCategoryButton = document.getElementById('detail-add-category-button');
const categoryFilterSelect = document.getElementById('category-filter');

const cameraModal = document.getElementById('camera-modal');
const cameraStreamElement = document.getElementById('camera-stream');
const cameraCaptureButton = document.getElementById('camera-capture');
const cameraCancelButton = document.getElementById('camera-cancel');
const cameraInfo = document.getElementById('camera-info');

let cameraStream = null;
let activeCoverContext = null;
let cachedBooks = [];
let currentDetailBookId = null;
let cameraMode = 'cover';
let barcodeTargetInput = null;
let barcodeDetector = null;
let barcodeScanActive = false;
let barcodeFrameRequest = null;
let zxingReader = null;
let zxingControls = null;
let titleSearchTimeout = null;
let detailTitleSearchTimeout = null;
let categoriesCache = [];
let selectedCategoriesCreate = new Set();
let selectedCategoriesDetail = new Set();
let activeCategoryFilter = '';
let activeBookSearchTerm = '';
let unsubscribeUpdateStatus = null;

const coverContexts = {
  create: {
    dataUrl: null,
    existingUrl: null,
    remove: false,
    placeholder: 'Kapak resmi seçilmedi',
    previewEl: coverPreview,
    fileInput: coverFileInput
  },
  edit: {
    dataUrl: null,
    existingUrl: null,
    remove: false,
    placeholder: 'Kapak resmi bulunmuyor',
    previewEl: detailCoverPreview,
    fileInput: detailCoverFileInput
  }
};

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'code_128', 'upc_a', 'code_39', 'qr_code'];

const bookSelect = lendForm.querySelector('select[name="bookId"]');
const memberSelect = lendForm.querySelector('select[name="memberId"]');

const statsRefs = {
  books: document.getElementById('stat-books'),
  inventory: document.getElementById('stat-inventory'),
  members: document.getElementById('stat-members'),
  loans: document.getElementById('stat-loans'),
  activeLoans: document.getElementById('stat-active-loans')
};

const api = window.libraryApi;

let memberHistorySelectedId = null;
let bookHistorySelectedId = null;
const THEME_STORAGE_KEY = 'library-theme';
const AVAILABLE_THEMES = ['light', 'dark', 'midnight', 'forest', 'sunset'];
const DEFAULT_THEME = 'light';

function translateStatus(status) {
  switch (status) {
    case 'borrowed':
      return 'Ödünçte';
    case 'returned':
      return 'İade edildi';
    default:
      return status;
  }
}

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function normalizeTheme(theme) {
  if (AVAILABLE_THEMES.includes(theme)) {
    return theme;
  }
  return DEFAULT_THEME;
}

function getStoredThemePreference() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (AVAILABLE_THEMES.includes(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Tema tercihi okunamadı:', error);
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return AVAILABLE_THEMES.includes('dark') ? 'dark' : DEFAULT_THEME;
  }
  return DEFAULT_THEME;
}

function applyThemePreference(theme) {
  const normalized = normalizeTheme(theme);
  document.documentElement.setAttribute('data-theme', normalized);
  if (themeSelect) {
    themeSelect.value = normalized;
  }
  return normalized;
}

function persistThemePreference(theme) {
  const normalized = applyThemePreference(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  } catch (error) {
    console.warn('Tema tercihi kaydedilemedi:', error);
  }
}

function persistBridgeSession(session) {
  if (!session) {
    try {
      localStorage.removeItem(BRIDGE_STORAGE_KEY);
    } catch (error) {
      console.warn('Köprü oturumu silinemedi', error);
    }
    return;
  }
  try {
    localStorage.setItem(BRIDGE_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('Köprü oturumu kaydedilemedi', error);
  }
}

function loadBridgeSessionFromStorage() {
  try {
    const raw = localStorage.getItem(BRIDGE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Köprü oturumu okunamadı', error);
    return null;
  }
}

function initializeTheme() {
  const storedPreference = getStoredThemePreference();
  applyThemePreference(storedPreference);

  if (themeSelect) {
    themeSelect.addEventListener('change', (event) => {
      persistThemePreference(event.target.value);
    });
  }

  let mediaQuery;
  try {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  } catch (error) {
    mediaQuery = null;
  }

  let hasStoredPreference = false;
  try {
    hasStoredPreference = localStorage.getItem(THEME_STORAGE_KEY) !== null;
  } catch (error) {
    hasStoredPreference = false;
  }

  if (mediaQuery && !hasStoredPreference) {
    mediaQuery.addEventListener('change', (event) => {
      applyThemePreference(event.matches ? 'dark' : 'light');
    });
  }
}

async function updateAppVersion() {
  if (!versionEl || !api || typeof api.getVersion !== 'function') {
    return;
  }
  try {
    const version = await api.getVersion();
    if (version) {
      versionEl.textContent = `Sürüm ${version}`;
    } else {
      versionEl.textContent = 'Sürüm bilinmiyor';
    }
  } catch (error) {
    console.warn('Sürüm bilgisi alınamadı', error);
    versionEl.textContent = 'Sürüm bilinmiyor';
  }
}

function handleUpdateStatus(message) {
  if (!message) {
    return;
  }
  switch (message.status) {
    case 'checking':
      setStatus('Güncellemeler denetleniyor...', 'info');
      break;
    case 'available':
      setStatus('Yeni sürüm bulundu. İndirme başlatılıyor...', 'info');
      break;
    case 'download-progress': {
      const percent = message.info?.percent ? Math.round(message.info.percent) : null;
      setStatus(
        percent !== null
          ? `Güncelleme indiriliyor: %${percent}`
          : 'Güncelleme indiriliyor...',
        'info'
      );
      break;
    }
    case 'downloaded':
      setStatus('Güncelleme indirildi. Uygulama yeniden başlatıldığında kurulacak.', 'success');
      break;
    case 'not-available':
      setStatus('Yeni güncelleme bulunamadı.', 'info');
      break;
    case 'error': {
      const rawMessage = message.info?.message || message.message || '';
      console.warn('Güncelleme hatası:', rawMessage || '(bilinmiyor)');
      if (rawMessage.includes('404')) {
        setStatus('Güncelleme kaynağı bulunamadı. Denetim atlandı.', 'info');
      } else {
        setStatus('Güncelleme denetimi başarısız oldu.', 'error');
      }
      break;
    }
    default:
      break;
  }
}

function clearForm(form) {
  form.reset();
}

function setActiveTab(targetId) {
  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === targetId);
  });
  views.forEach((view) => {
    view.classList.toggle('active', view.id === targetId);
  });
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.tab));
});

if (api.onUpdateStatus) {
  unsubscribeUpdateStatus = api.onUpdateStatus(handleUpdateStatus);
}

initializeTheme();

refreshBtn.addEventListener('click', async () => {
  try {
    setStatus('Veriler yenileniyor...', 'info');
    await refreshData();
    setStatus('Veriler yenilendi', 'success');
  } catch (error) {
    setStatus(`Yenileme başarısız: ${error.message}`, 'error');
  }
});

memberHistorySelect.addEventListener('change', async (event) => {
  const memberId = event.target.value;
  memberHistorySelectedId = memberId || null;
  await loadMemberHistory(memberHistorySelectedId);
});

bookHistorySelect.addEventListener('change', async (event) => {
  const bookId = event.target.value;
  bookHistorySelectedId = bookId || null;
  await loadBookHistory(bookHistorySelectedId);
});

coverSelectButton.addEventListener('click', () => {
  coverContexts.create.fileInput.click();
});

coverFileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  await handleCoverFile(file, 'create');
});

coverClearButton.addEventListener('click', () => {
  resetCoverSelection('create');
});

coverCameraButton.addEventListener('click', async () => {
  await openCameraModal('create', 'cover');
});

detailCoverSelectButton.addEventListener('click', () => {
  coverContexts.edit.fileInput.click();
});

detailCoverFileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  await handleCoverFile(file, 'edit');
});

detailCoverClearButton.addEventListener('click', () => {
  markCoverRemoved('edit');
});

detailCoverCameraButton.addEventListener('click', async () => {
  await openCameraModal('edit', 'cover');
});

cameraCancelButton.addEventListener('click', () => {
  closeCameraModal();
});

cameraCaptureButton.addEventListener('click', () => {
  captureCameraFrame();
});

cameraModal.addEventListener('click', (event) => {
  if (event.target === cameraModal) {
    closeCameraModal();
  }
});

if (isbnScanButton) {
  isbnScanButton.addEventListener('click', () => {
    openBarcodeScanner(isbnInput, 'create');
  });
}

if (isbnFetchButton) {
  isbnFetchButton.addEventListener('click', async () => {
    await handleIsbnLookup(isbnInput, 'create');
  });
}

if (bookDetailIsbnScanButton) {
  bookDetailIsbnScanButton.addEventListener('click', () => {
    openBarcodeScanner(bookDetailIsbnInput, 'edit');
  });
}

if (bookDetailIsbnFetchButton) {
  bookDetailIsbnFetchButton.addEventListener('click', async () => {
    await handleIsbnLookup(bookDetailIsbnInput, 'edit');
  });
}

if (addCategoryButton) {
  addCategoryButton.addEventListener('click', () => {
    handleCategoryAdd('create');
  });
}

if (newCategoryInput) {
  newCategoryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCategoryAdd('create');
    }
  });
}

if (detailAddCategoryButton) {
  detailAddCategoryButton.addEventListener('click', () => {
    handleCategoryAdd('edit');
  });
}

if (detailNewCategoryInput) {
  detailNewCategoryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCategoryAdd('edit');
    }
  });
}

if (categoryFilterSelect) {
  categoryFilterSelect.addEventListener('change', () => {
    activeCategoryFilter = categoryFilterSelect.value;
    renderBooks(cachedBooks);
  });
}

if (bookSearchInput) {
  bookSearchInput.addEventListener('input', () => {
    activeBookSearchTerm = bookSearchInput.value.trim().toLowerCase();
    renderBooks(cachedBooks);
  });
}

if (titleInput && titleSuggestionList) {
  titleInput.addEventListener('input', () => {
    scheduleTitleSearch('create');
  });
  titleInput.addEventListener('focus', () => {
    if (titleSuggestionList.childElementCount > 0) {
      titleSuggestionList.classList.remove('hidden');
    }
  });
  titleInput.addEventListener('blur', () => {
    setTimeout(() => titleSuggestionList.classList.add('hidden'), 150);
  });
}

if (bookDetailTitleInput && detailTitleSuggestionList) {
  bookDetailTitleInput.addEventListener('input', () => {
    scheduleTitleSearch('edit');
  });
  bookDetailTitleInput.addEventListener('focus', () => {
    if (detailTitleSuggestionList.childElementCount > 0) {
      detailTitleSuggestionList.classList.remove('hidden');
    }
  });
  bookDetailTitleInput.addEventListener('blur', () => {
    setTimeout(() => detailTitleSuggestionList.classList.add('hidden'), 150);
  });
}

booksTableBody.addEventListener('click', async (event) => {
  const detailButton = event.target.closest('.book-detail-button');
  if (detailButton) {
    event.preventDefault();
    await openBookDetail(detailButton.dataset.bookId);
    return;
  }
  const deleteButton = event.target.closest('.book-delete-button');
  if (deleteButton) {
    event.preventDefault();
    if (deleteButton.disabled) {
      return;
    }
    await confirmAndDeleteBook(deleteButton.dataset.bookId);
  }
});

bookDetailCloseButton.addEventListener('click', () => {
  closeBookDetail();
});

bookDetailCancelButton.addEventListener('click', () => {
  closeBookDetail();
});

if (bookDetailDeleteButton) {
  bookDetailDeleteButton.addEventListener('click', async () => {
    if (!currentDetailBookId) {
      return;
    }
    await confirmAndDeleteBook(currentDetailBookId, { closeModal: true });
  });
}

bookDetailModal.addEventListener('click', (event) => {
  if (event.target === bookDetailModal) {
    closeBookDetail();
  }
});

bookDetailForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentDetailBookId) {
    return;
  }

  const updates = {
    title: bookDetailTitleInput.value.trim(),
    author: bookDetailAuthorInput.value.trim(),
    isbn: bookDetailIsbnInput.value.trim(),
    totalCopies: Number(bookDetailTotalInput.value) || 1,
    publisher: bookDetailPublisherInput?.value.trim() || null,
    categories: Array.from(selectedCategoriesDetail),
    note: bookDetailNoteInput?.value.trim() || null
  };

  const publishYearValue = bookDetailPublishYearInput?.value.trim();
  if (publishYearValue !== undefined) {
    updates.publishYear = publishYearValue ? Number(publishYearValue) : null;
    if (Number.isNaN(updates.publishYear)) {
      delete updates.publishYear;
    }
  }

  const pageCountValue = bookDetailPageCountInput?.value.trim();
  if (pageCountValue !== undefined) {
    updates.pageCount = pageCountValue ? Number(pageCountValue) : null;
    if (Number.isNaN(updates.pageCount)) {
      delete updates.pageCount;
    }
  }

  const purchasePriceValue = bookDetailPurchasePriceInput?.value.trim();
  if (purchasePriceValue !== undefined) {
    updates.purchasePrice = purchasePriceValue ? Number(purchasePriceValue) : null;
    if (Number.isNaN(updates.purchasePrice)) {
      delete updates.purchasePrice;
    }
  }

  const coverContext = coverContexts.edit;
  if (coverContext.dataUrl) {
    updates.coverImageData = coverContext.dataUrl;
  } else if (coverContext.remove && coverContext.existingUrl && !coverContext.dataUrl) {
    updates.removeCover = true;
  }

  try {
    await api.updateBook({ id: currentDetailBookId, updates });
    setStatus('Kitap bilgileri güncellendi', 'success');
    closeBookDetail();
    await loadCategories();
    await refreshData();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

async function refreshData() {
  const [books, members, loans] = await Promise.all([
    api.listBooks(),
    api.listMembers(),
    api.listLoans()
  ]);

  cachedBooks = await enrichBooksWithCovers(books);
  const categorySet = new Set();
  cachedBooks.forEach((book) => {
    if (Array.isArray(book.categories)) {
      book.categories.forEach((category) => categorySet.add(category));
    }
  });
  ensureCategoriesInCache(Array.from(categorySet));

  renderStats(cachedBooks, members, loans);
  renderBooks(cachedBooks);
  renderMembers(members);
  renderLoans(loans, cachedBooks, members);
  renderActivity(loans, cachedBooks, members);
}

async function handleCoverFile(file, contextKey) {
  const context = coverContexts[contextKey];
  if (!context) {
    return;
  }
  if (!file.type.startsWith('image/')) {
    setStatus('Lütfen bir resim dosyası seçin', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    applyCoverDataUrl(contextKey, reader.result);
  };
  reader.onerror = () => {
    setStatus('Resim dosyası okunamadı', 'error');
  };
  reader.readAsDataURL(file);
  context.fileInput.value = '';
}

function applyCoverDataUrl(contextKey, dataUrl) {
  const context = coverContexts[contextKey];
  if (!context) {
    return;
  }
  context.dataUrl = dataUrl;
  context.remove = false;
  updateCoverPreview(contextKey);
}

function updateCoverPreview(contextKey) {
  const context = coverContexts[contextKey];
  if (!context) {
    return;
  }
  const preview = context.previewEl;
  preview.innerHTML = '';
  const displayUrl = context.dataUrl || (!context.remove && context.existingUrl);
  if (!displayUrl) {
    preview.innerHTML = `<span>${context.placeholder}</span>`;
    return;
  }
  const img = document.createElement('img');
  img.src = displayUrl;
  img.alt = 'Kitap kapağı';
  preview.appendChild(img);
}

function resetCoverSelection(contextKey) {
  const context = coverContexts[contextKey];
  if (!context) {
    return;
  }
  context.dataUrl = null;
  context.fileInput.value = '';
  if (contextKey === 'create') {
    context.remove = false;
    context.existingUrl = null;
  }
  updateCoverPreview(contextKey);
}

function markCoverRemoved(contextKey) {
  const context = coverContexts[contextKey];
  if (!context) {
    return;
  }
  context.dataUrl = null;
  context.remove = true;
  context.fileInput.value = '';
  updateCoverPreview(contextKey);
}

async function openCameraModal(contextKey, mode = 'cover') {
  cameraMode = mode;
  if (mode === 'cover') {
    activeCoverContext = contextKey;
    cameraCaptureButton.style.display = '';
    cameraCaptureButton.disabled = false;
    cameraInfo.textContent = 'Kamerayı kitap kapağına doğrultup fotoğraf çekin.';
  } else {
    activeCoverContext = null;
    cameraCaptureButton.style.display = 'none';
    cameraCaptureButton.disabled = true;
    cameraInfo.textContent = 'Barkodu kameraya hizalayın. Kod okunduğunda alan otomatik dolacak.';
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus('Kamera erişimi bu cihazda desteklenmiyor', 'error');
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    });
    cameraStreamElement.srcObject = cameraStream;
    cameraModal.classList.remove('hidden');
    const ensurePlayback = async () => {
      try {
        await cameraStreamElement.play();
      } catch (error) {
        console.warn('Kamera oynatılamadı', error);
      }
      cameraStreamElement.onloadedmetadata = null;
      if (cameraMode === 'barcode') {
        await startBarcodeScan();
      }
    };
    if (cameraStreamElement.readyState >= 2) {
      await ensurePlayback();
    } else {
      cameraStreamElement.onloadedmetadata = ensurePlayback;
    }
  } catch (error) {
    activeCoverContext = null;
    setStatus(`Kameraya erişilemedi: ${error.message}`, 'error');
    if (mode === 'barcode') {
      barcodeTargetInput = null;
    }
    cameraMode = 'cover';
  }
}

function closeCameraModal() {
  stopBarcodeScan();
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  cameraStreamElement.srcObject = null;
  cameraModal.classList.add('hidden');
  activeCoverContext = null;
  cameraMode = 'cover';
  cameraInfo.textContent = '';
  cameraCaptureButton.style.display = '';
  cameraCaptureButton.disabled = false;
}

function captureCameraFrame() {
  if (cameraMode !== 'cover') {
    return;
  }
  if (!activeCoverContext) {
    setStatus('Kamera hazır değil', 'error');
    return;
  }
  if (!cameraStreamElement.videoWidth || !cameraStreamElement.videoHeight) {
    setStatus('Kamera hazır değil', 'error');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = cameraStreamElement.videoWidth;
  canvas.height = cameraStreamElement.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(cameraStreamElement, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/png');
  applyCoverDataUrl(activeCoverContext, dataUrl);
  closeCameraModal();
}

async function enrichBooksWithCovers(books) {
  return Promise.all(
    books.map(async (book) => {
      const coverImageUrl = book.coverImagePath
        ? await api.resolveFile(book.coverImagePath)
        : null;
      return {
        ...book,
        coverImageUrl
      };
    })
  );
}

function openBarcodeScanner(targetInput, contextKey) {
  if (!targetInput) {
    setStatus('ISBN alanı bulunamadı', 'error');
    return;
  }
  barcodeTargetInput = targetInput;
  openCameraModal(contextKey, 'barcode');
}

function getZXingGlobal() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.ZXing;
}

async function startBarcodeScan() {
  const nativeStarted = await tryStartNativeBarcodeScan();
  if (nativeStarted) {
    return;
  }

  const fallbackStarted = await startZxingBarcodeScan();
  if (fallbackStarted) {
    return;
  }

  cameraInfo.textContent = 'Barkod tarama bu cihazda desteklenmiyor. Lütfen kodu elle girin.';
  setStatus('Barkod tarama bu cihazda desteklenmiyor', 'error');
  barcodeTargetInput = null;
  setTimeout(() => closeCameraModal(), 1800);
}

async function tryStartNativeBarcodeScan() {
  if (!('BarcodeDetector' in window)) {
    return false;
  }

  let formatsToUse = [...BARCODE_FORMATS];
  if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
    try {
      const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
      if (Array.isArray(supportedFormats) && supportedFormats.length > 0) {
        const usable = formatsToUse.filter((format) => supportedFormats.includes(format));
        if (usable.length > 0) {
          formatsToUse = usable;
        } else {
          formatsToUse = supportedFormats;
        }
      }
    } catch (error) {
      console.warn('Desteklenen barkod formatları alınamadı', error);
    }
  }

  if (!formatsToUse.length) {
    return false;
  }

  try {
    barcodeDetector = new window.BarcodeDetector({ formats: formatsToUse });
  } catch (error) {
    console.warn('BarcodeDetector başlatılamadı', error);
    barcodeDetector = null;
    return false;
  }

  barcodeScanActive = true;
  cameraInfo.textContent = 'Barkodu kameraya hizalayın. Okunduğunda alan otomatik dolacak.';
  barcodeFrameRequest = requestAnimationFrame(scanBarcodeFrame);
  return true;
}

async function startZxingBarcodeScan() {
  const ZXing = getZXingGlobal();
  if (!ZXing || typeof ZXing.BrowserMultiFormatReader !== 'function') {
    return false;
  }

  if (!zxingReader) {
    zxingReader = new ZXing.BrowserMultiFormatReader();
    if (ZXing.DecodeHintType && ZXing.BarcodeFormat) {
      const hintMap = new Map();
      hintMap.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.QR_CODE
      ]);
      try {
        zxingReader.setHints(hintMap);
      } catch (error) {
        console.warn('ZXing ipuçları ayarlanamadı', error);
      }
    }
  } else {
    try {
      zxingReader.reset();
    } catch (error) {
      console.warn('ZXing okuyucu sıfırlanamadı', error);
    }
  }

  barcodeScanActive = true;
  cameraInfo.textContent = 'Barkodu kameraya hizalayın. Okunduğunda alan otomatik dolacak.';

  try {
    zxingControls = await zxingReader.decodeFromVideoDevice(
      null,
      cameraStreamElement,
      (result, error, controls) => {
        if (controls && controls !== zxingControls) {
          zxingControls = controls;
        }
        if (!barcodeScanActive) {
          return;
        }
        if (result) {
          if (barcodeTargetInput) {
            barcodeTargetInput.value = result.getText();
            barcodeTargetInput.focus();
            const length = barcodeTargetInput.value.length;
            barcodeTargetInput.setSelectionRange(length, length);
          }
          setStatus('Barkod başarıyla okundu', 'success');
          barcodeScanActive = false;
          if (zxingControls) {
            try {
              zxingControls.stop();
            } catch (stopError) {
              console.warn('ZXing kontrolü durdurulamadı', stopError);
            }
            zxingControls = null;
          }
          if (zxingReader) {
            try {
              zxingReader.reset();
            } catch (resetError) {
              console.warn('ZXing okuyucu sıfırlanamadı', resetError);
            }
          }
          closeCameraModal();
          return;
        }
        if (error && !(error instanceof ZXing.NotFoundException)) {
          console.warn('ZXing barkod hatası', error);
        }
      }
    );
    return true;
  } catch (error) {
    console.warn('ZXing barkod okuyucu başlatılamadı', error);
    barcodeScanActive = false;
    if (zxingControls) {
      try {
        zxingControls.stop();
      } catch (stopError) {
        console.warn('ZXing kontrolü durdurulamadı', stopError);
      }
      zxingControls = null;
    }
    return false;
  }
}

async function scanBarcodeFrame() {
  if (!barcodeScanActive || !barcodeDetector) {
    return;
  }
  try {
    const barcodes = await barcodeDetector.detect(cameraStreamElement);
    if (barcodes.length > 0) {
      const first = barcodes.find((item) => item.rawValue);
      if (first && barcodeTargetInput) {
        barcodeTargetInput.value = first.rawValue;
        barcodeTargetInput.focus();
        const length = barcodeTargetInput.value.length;
        barcodeTargetInput.setSelectionRange(length, length);
        setStatus('Barkod başarıyla okundu', 'success');
        barcodeScanActive = false;
        closeCameraModal();
        return;
      }
    }
  } catch (error) {
    console.warn('Barkod algılanamadı', error);
  }
  barcodeFrameRequest = requestAnimationFrame(scanBarcodeFrame);
}

function stopBarcodeScan() {
  barcodeScanActive = false;
  if (barcodeFrameRequest) {
    cancelAnimationFrame(barcodeFrameRequest);
    barcodeFrameRequest = null;
  }
  barcodeTargetInput = null;
  barcodeDetector = null;
  if (zxingControls) {
    try {
      zxingControls.stop();
    } catch (error) {
      console.warn('ZXing denetimi durdurulamadı', error);
    }
    zxingControls = null;
  }
  if (zxingReader) {
    try {
      zxingReader.reset();
    } catch (error) {
      console.warn('ZXing okuyucu sıfırlanamadı', error);
    }
  }
}


async function handleCategoryAdd(contextKey) {
  const input = contextKey === 'edit' ? detailNewCategoryInput : newCategoryInput;
  if (!input) {
    return;
  }
  const name = input.value.trim();
  if (!name) {
    return;
  }
  if (categoriesCache.includes(name)) {
    if (contextKey === 'edit') {
      selectedCategoriesDetail.add(name);
    } else {
      selectedCategoriesCreate.add(name);
    }
    renderCategoryChips('create');
    renderCategoryChips('edit');
    setStatus(`Kategori zaten mevcut: ${name}`, 'info');
    input.value = '';
    return;
  }
  try {
    const updated = await api.addCategory(name);
    categoriesCache = updated;
    if (contextKey === 'edit') {
      selectedCategoriesDetail.add(name);
    } else {
      selectedCategoriesCreate.add(name);
    }
    input.value = '';
    renderCategoryChips('create');
    renderCategoryChips('edit');
    populateCategoryFilter();
    setStatus(`Kategori eklendi: ${name}`, 'success');
  } catch (error) {
    setStatus(error.message || 'Kategori eklenemedi', 'error');
  }
}

function toggleCategorySelection(contextKey, category) {
  const selectedSet = contextKey === 'edit' ? selectedCategoriesDetail : selectedCategoriesCreate;
  if (selectedSet.has(category)) {
    selectedSet.delete(category);
  } else {
    selectedSet.add(category);
  }
  renderCategoryChips(contextKey);
}

function resetCategorySelection(contextKey) {
  if (contextKey === 'edit') {
    selectedCategoriesDetail.clear();
    renderCategoryChips('edit');
  } else {
    selectedCategoriesCreate.clear();
    renderCategoryChips('create');
  }
}

function renderCategoryChips(contextKey) {
  const container = contextKey === 'edit' ? detailCategoryChipList : categoryChipList;
  if (!container) {
    return;
  }
  const selectedSet = contextKey === 'edit' ? selectedCategoriesDetail : selectedCategoriesCreate;
  const categories = Array.from(
    new Set([
      ...categoriesCache,
      ...Array.from(selectedSet)
    ])
  ).sort((a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' }));

  container.innerHTML = '';
  if (categories.length === 0) {
    const hint = document.createElement('span');
    hint.className = 'form-hint';
    hint.textContent = 'Henüz kategori yok';
    container.appendChild(hint);
    return;
  }
  categories.forEach((category) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${selectedSet.has(category) ? ' active' : ''}`;
    chip.textContent = category;
    chip.addEventListener('click', () => toggleCategorySelection(contextKey, category));
    container.appendChild(chip);
  });
}

function populateCategoryFilter() {
  if (!categoryFilterSelect) {
    return;
  }
  const current = activeCategoryFilter;
  const optionsToRemove = Array.from(categoryFilterSelect.querySelectorAll('option:not(:first-child)'));
  optionsToRemove.forEach((option) => option.remove());
  const sorted = categoriesCache.slice().sort((a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' }));
  sorted.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    if (category === current) {
      option.selected = true;
    }
    categoryFilterSelect.appendChild(option);
  });
  if (!sorted.includes(current)) {
    categoryFilterSelect.value = '';
    activeCategoryFilter = '';
  }
}

async function loadCategories() {
  try {
    categoriesCache = await api.listCategories();
  } catch (error) {
    console.warn('Kategoriler yüklenemedi', error);
    categoriesCache = [];
  }
  renderCategoryChips('create');
  renderCategoryChips('edit');
  populateCategoryFilter();
}

function ensureCategoriesInCache(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return;
  }
  const initialLength = categoriesCache.length;
  categories.forEach((category) => {
    if (category) {
      const trimmed = category.trim();
      if (trimmed && !categoriesCache.includes(trimmed)) {
        categoriesCache.push(trimmed);
      }
    }
  });
  if (categoriesCache.length !== initialLength) {
    categoriesCache.sort((a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' }));
    renderCategoryChips('create');
    renderCategoryChips('edit');
    populateCategoryFilter();
  }
}

async function populateBookFieldsFromIsbn(isbnValue, contextKey, options = {}) {
  const { silent = false } = options;
  const isbn = typeof isbnValue === 'string' ? isbnValue.trim() : '';
  if (!isbn) {
    if (!silent) {
      setStatus('Önce ISBN girin', 'error');
    }
    return;
  }
  try {
    if (!silent) {
      setStatus('ISBN bilgisi getiriliyor...', 'info');
    }
    const data = await api.fetchBookByISBN(isbn);
    applyBookMetadata(contextKey, { ...data, isbn });
    if (!silent) {
      setStatus('Kitap bilgileri güncellendi. Düzenleyebilirsiniz.', 'success');
    }
  } catch (error) {
    if (!silent) {
      setStatus(error.message || 'ISBN bilgisi alınamadı', 'error');
    } else {
      console.warn('ISBN otomatik doldurma başarısız oldu', error);
    }
  }
}

async function handleIsbnLookup(targetInput, contextKey) {
  if (!targetInput) {
    setStatus('ISBN alanı bulunamadı', 'error');
    return;
  }
  const isbn = targetInput.value.trim();
  if (!isbn) {
    setStatus('Önce ISBN girin', 'error');
    targetInput.focus();
    return;
  }
  await populateBookFieldsFromIsbn(isbn, contextKey);
}

async function confirmAndDeleteBook(bookId, options = {}) {
  if (!bookId) {
    return;
  }
  const { closeModal = false } = options;
  const book = cachedBooks.find((item) => item.id === bookId);
  const bookTitle = book?.title || 'Bu kitap';
  const confirmation = window.confirm(
    `"${bookTitle}" kitabını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
  );
  if (!confirmation) {
    return;
  }
  try {
    setStatus('Kitap siliniyor...', 'info');
    const deleted = await api.deleteBook({ id: bookId });
    if (
      closeModal ||
      (bookDetailModal &&
        !bookDetailModal.classList.contains('hidden') &&
        currentDetailBookId === bookId)
    ) {
      closeBookDetail();
    }
    const deletedTitle = deleted?.title || bookTitle;
    setStatus(`"${deletedTitle}" katalogdan silindi`, 'success');
    await refreshData();
  } catch (error) {
    setStatus(error.message || 'Kitap silinemedi', 'error');
  }
}

function collectMetadataAuthors(metadata) {
  if (Array.isArray(metadata?.authors) && metadata.authors.length > 0) {
    return metadata.authors;
  }
  if (typeof metadata?.author === 'string') {
    return [metadata.author];
  }
  return [];
}

function resolveMetadataPageCount(metadata = {}) {
  const candidates = [
    metadata.pageCount,
    metadata.numberOfPages,
    metadata.number_of_pages,
    metadata.numberOfPagesMedian,
    metadata.number_of_pages_median
  ];
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return null;
}

function deriveMetadataNote(metadata = {}) {
  const parts = [];
  if (metadata.subtitle) {
    parts.push(metadata.subtitle);
  }
  if (metadata.description) {
    if (typeof metadata.description === 'string') {
      parts.push(metadata.description);
    } else if (Array.isArray(metadata.description)) {
      parts.push(metadata.description.filter(Boolean).join('\n'));
    } else if (typeof metadata.description.value === 'string') {
      parts.push(metadata.description.value);
    }
  }
  return parts.join('\n\n').trim();
}

function collectMetadataCategories(metadata = {}) {
  const rawSubjects = [];
  if (Array.isArray(metadata.subjects)) {
    rawSubjects.push(...metadata.subjects);
  }
  if (Array.isArray(metadata.subject)) {
    rawSubjects.push(...metadata.subject);
  }
  const normalized = rawSubjects
    .map((value) => {
      if (typeof value === 'string') {
        return value.trim();
      }
      if (value && typeof value.name === 'string') {
        return value.name.trim();
      }
      return '';
    })
    .filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, 4);
}

function applyMetadataCategories(contextKey, categories) {
  if (!categories || categories.length === 0) {
    return;
  }
  ensureCategoriesInCache(categories);
  const targetSet =
    contextKey === 'edit' ? selectedCategoriesDetail : selectedCategoriesCreate;
  let changed = false;
  categories.forEach((category) => {
    if (!targetSet.has(category)) {
      targetSet.add(category);
      changed = true;
    }
  });
  if (changed) {
    renderCategoryChips('create');
    renderCategoryChips('edit');
  }
}

function applyBookMetadata(contextKey, metadata) {
  if (!metadata) {
    return;
  }
  const publishYear = parsePublishYear(metadata.publishDate || metadata.publishYear);
  const pageCount = resolveMetadataPageCount(metadata);
  const publisherName =
    (Array.isArray(metadata.publishers) && metadata.publishers[0]) ||
    metadata.publisher ||
    null;
  const authors = collectMetadataAuthors(metadata);
  const autoNote = deriveMetadataNote(metadata);
  const autoCategories = collectMetadataCategories(metadata);

  if (contextKey === 'edit') {
    if (metadata.title) {
      bookDetailTitleInput.value = metadata.title;
    }
    if (authors.length > 0) {
      bookDetailAuthorInput.value = authors.join(', ');
    }
    if (pageCount && bookDetailPageCountInput) {
      bookDetailPageCountInput.value = pageCount;
    }
    if (publishYear && bookDetailPublishYearInput) {
      bookDetailPublishYearInput.value = publishYear;
    }
    if (publisherName && bookDetailPublisherInput) {
      bookDetailPublisherInput.value = publisherName;
    }
    if (metadata.isbn && bookDetailIsbnInput) {
      bookDetailIsbnInput.value = metadata.isbn;
    }
    if (autoNote && bookDetailNoteInput && !bookDetailNoteInput.value.trim()) {
      bookDetailNoteInput.value = autoNote;
    }
  } else {
    if (metadata.title && titleInput) {
      titleInput.value = metadata.title;
    }
    if (authors.length > 0) {
      const authorField = bookForm.querySelector('input[name=\"author\"]');
      if (authorField) {
        authorField.value = authors.join(', ');
      }
    }
    if (pageCount && pageCountInput) {
      pageCountInput.value = pageCount;
    }
    if (publishYear && publishYearInput) {
      publishYearInput.value = publishYear;
    }
    if (publisherName && publisherInput) {
      publisherInput.value = publisherName;
    }
    if (metadata.isbn && isbnInput) {
      isbnInput.value = metadata.isbn;
    }
    if (autoNote && bookNoteInput && !bookNoteInput.value.trim()) {
      bookNoteInput.value = autoNote;
    }
  }

  applyMetadataCategories(contextKey, autoCategories);
}

function scheduleTitleSearch(contextKey) {
  const input = contextKey === 'edit' ? bookDetailTitleInput : titleInput;
  const list = contextKey === 'edit' ? detailTitleSuggestionList : titleSuggestionList;
  const timeoutRef = contextKey === 'edit' ? 'detailTitleSearchTimeout' : 'titleSearchTimeout';
  const value = input.value.trim();

  if (contextKey === 'edit') {
    clearTimeout(detailTitleSearchTimeout);
  } else {
    clearTimeout(titleSearchTimeout);
  }

  if (value.length < 3) {
    list.classList.add('hidden');
    list.innerHTML = '';
    return;
  }

  const handler = async () => {
    try {
      const results = await api.searchBooksByTitle(value);
      renderTitleSuggestions(contextKey, results || []);
    } catch (error) {
      console.warn('Başlık araması başarısız', error);
      list.classList.add('hidden');
    }
  };

  if (contextKey === 'edit') {
    detailTitleSearchTimeout = setTimeout(handler, 400);
  } else {
    titleSearchTimeout = setTimeout(handler, 400);
  }
}

function renderTitleSuggestions(contextKey, results) {
  const list = contextKey === 'edit' ? detailTitleSuggestionList : titleSuggestionList;
  list.innerHTML = '';
  if (!results.length) {
    list.classList.add('hidden');
    return;
  }
  results.forEach((item) => {
    const option = document.createElement('div');
    option.className = 'suggestion-item';
    const metaParts = [
      item.authors && item.authors.length ? item.authors.join(', ') : null,
      item.publisher || null,
      item.publishYear || null,
      item.pageCount ? `${item.pageCount} sf` : null
    ].filter(Boolean);
    option.innerHTML = `
      <span class="title">${item.title}</span>
      <span class="meta">${metaParts.join(' • ')}</span>
    `;
    option.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    option.addEventListener('click', () => {
      applySuggestionSelection(contextKey, item);
    });
    list.appendChild(option);
  });
  list.classList.remove('hidden');
}

function applySuggestionSelection(contextKey, item) {
  if (!item) {
    return;
  }
  applyBookMetadata(contextKey, item);
  const suggestionList =
    contextKey === 'edit' ? detailTitleSuggestionList : titleSuggestionList;
  if (suggestionList) {
    suggestionList.classList.add('hidden');
    suggestionList.innerHTML = '';
  }
  if (item.isbn) {
    populateBookFieldsFromIsbn(item.isbn, contextKey, { silent: true }).catch((error) =>
      console.warn('Başlık seçimi için ISBN bilgisi alınamadı', error)
    );
  }
}

async function openBookDetail(bookId) {
  try {
    const book = await api.getBook(bookId);
    currentDetailBookId = bookId;

    const coverUrl = book.coverImagePath ? await api.resolveFile(book.coverImagePath) : null;
    coverContexts.edit.dataUrl = null;
    coverContexts.edit.existingUrl = coverUrl;
    coverContexts.edit.remove = false;
    updateCoverPreview('edit');
    coverContexts.edit.fileInput.value = '';

    bookDetailTitleInput.value = book.title || '';
    bookDetailAuthorInput.value = book.author || '';
    bookDetailIsbnInput.value = book.isbn || '';
    bookDetailTotalInput.value = book.totalCopies ?? 1;
    bookDetailAvailableInput.value = book.availableCopies ?? 0;
    bookDetailPublisherInput.value = book.publisher || '';
    bookDetailPublishYearInput.value = book.publishYear ?? '';
    bookDetailPageCountInput.value = book.pageCount ?? '';
    bookDetailPurchasePriceInput.value = book.purchasePrice ?? '';
    bookDetailNoteInput.value = book.note || '';
    bookDetailMeta.textContent = formatDetailMeta(book);

    selectedCategoriesDetail = new Set(Array.isArray(book.categories) ? book.categories : []);
    ensureCategoriesInCache(Array.from(selectedCategoriesDetail));
    renderCategoryChips('edit');

    bookDetailModal.classList.remove('hidden');
  } catch (error) {
    setStatus(`Kitap detayları yüklenemedi: ${error.message}`, 'error');
  }
}

function closeBookDetail() {
  currentDetailBookId = null;
  coverContexts.edit.dataUrl = null;
  coverContexts.edit.existingUrl = null;
  coverContexts.edit.remove = false;
  updateCoverPreview('edit');
  detailCoverFileInput.value = '';
  bookDetailMeta.textContent = '';
  if (bookDetailNoteInput) {
    bookDetailNoteInput.value = '';
  }
  resetCategorySelection('edit');
  bookDetailModal.classList.add('hidden');
}

function formatDetailMeta(book) {
  const created = formatDateTime(book.createdAt);
  const updated = formatDateTime(book.updatedAt);
  return `Oluşturulma: ${created} • Son güncelleme: ${updated}`;
}

function renderStats(books, members, loans) {
  const totalCopies = books.reduce((acc, book) => acc + (book.totalCopies || 0), 0);
  const availableCopies = books.reduce(
    (acc, book) => acc + (book.availableCopies || 0),
    0
  );
  const activeLoans = loans.filter((loan) => loan.status === 'borrowed').length;

  statsRefs.books.textContent = books.length;
  statsRefs.inventory.textContent = `Kullanılabilir ${availableCopies} / ${totalCopies} kopya`;
  statsRefs.members.textContent = members.length;
  statsRefs.loans.textContent = loans.length;
  statsRefs.activeLoans.textContent = activeLoans;
}

function updateBookInsights(books) {
  if (!booksInsightTotal || !booksInsightBorrowed || !booksInsightCategories) {
    return;
  }
  const borrowedCopies = books.reduce(
    (acc, book) =>
      acc +
      Math.max(0, (book.totalCopies || 0) - (book.availableCopies || 0)),
    0
  );
  const categorySet = new Set();
  books.forEach((book) => {
    if (Array.isArray(book.categories)) {
      book.categories.forEach((category) => categorySet.add(category));
    }
  });
  booksInsightTotal.textContent = books.length;
  booksInsightBorrowed.textContent = borrowedCopies;
  booksInsightCategories.textContent = categorySet.size;
}

function matchesBookSearch(book, term) {
  if (!term) {
    return true;
  }
  const haystack = [
    book.title,
    book.author,
    book.isbn,
    book.publisher
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

function renderBooks(books) {
  updateBookInsights(books);
  booksTableBody.innerHTML = '';
  bookSelect.innerHTML = '';
  const allBooksSorted = books
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, 'tr', { sensitivity: 'base' }));

  allBooksSorted
    .filter((book) => book.availableCopies > 0)
    .forEach((book) => {
      const option = document.createElement('option');
      option.value = book.id;
      option.textContent = `${book.title} (${book.availableCopies}/${book.totalCopies})`;
      bookSelect.appendChild(option);
    });

  const filtered = books.filter((book) => {
    const matchesCategory =
      !activeCategoryFilter ||
      (Array.isArray(book.categories) && book.categories.includes(activeCategoryFilter));
    const matchesSearch = matchesBookSearch(book, activeBookSearchTerm);
    return matchesCategory && matchesSearch;
  });

  const sortedBooks = filtered
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, 'tr', { sensitivity: 'base' }));

  if (sortedBooks.length === 0) {
    let emptyMessage = 'Henüz katalogda kitap yok';
    if (activeCategoryFilter && !activeBookSearchTerm) {
      emptyMessage = 'Bu kategoriye ait kitap bulunamadı';
    } else if (activeBookSearchTerm) {
      emptyMessage = 'Arama kriterlerine uygun kitap bulunamadı';
    }
    renderEmptyState(booksTableBody, emptyMessage, 7);
  } else {
    sortedBooks.forEach((book) => {
      const coverContent = book.coverImageUrl
        ? `<img src="${book.coverImageUrl}" alt="${book.title} kapağı" />`
        : '<div class="cover-placeholder">Kapak yok</div>';
      const categoriesMarkup = formatCategories(book.categories);
      const noteMarkup = book.note ? `<div class="table-sub">${book.note}</div>` : '';
      const deleteDisabled = book.availableCopies < book.totalCopies;
      const deleteTitle = deleteDisabled
        ? 'Ödünçte olan kitap silinemez'
        : 'Kitabı kalıcı olarak sil';
      const row = document.createElement('tr');
      row.innerHTML = `
          <td><div class="cover-thumb">${coverContent}</div></td>
          <td>${book.title}${categoriesMarkup}${noteMarkup}</td>
          <td>${book.author}</td>
          <td>${book.isbn}</td>
          <td>${book.availableCopies}</td>
          <td>${book.totalCopies}</td>
          <td>
            <div class="table-actions">
              <button class="link-button book-detail-button" data-book-id="${book.id}">Detay</button>
              <button
                class="link-button danger book-delete-button"
                data-book-id="${book.id}"
                ${deleteDisabled ? 'disabled' : ''}
                title="${deleteTitle}"
              >
                Sil
              </button>
            </div>
          </td>
        `;
      booksTableBody.appendChild(row);
    });
  }

  if (!bookSelect.children.length) {
    const option = document.createElement('option');
    option.value = '';
    option.disabled = true;
    option.selected = true;
    option.textContent = 'Uygun kitap bulunamadı';
    bookSelect.appendChild(option);
  }

  updateBookHistoryOptions(allBooksSorted);
}

function renderMembers(members) {
  membersTableBody.innerHTML = '';
  memberSelect.innerHTML = '';

  const sortedMembers = members
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));

  if (sortedMembers.length === 0) {
    renderEmptyState(membersTableBody, 'Henüz kayıtlı üye yok', 4);
  } else {
    sortedMembers.forEach((member) => {
      const row = document.createElement('tr');
      const noteMarkup = member.note ? `<div class="table-sub">${member.note}</div>` : '';
      row.innerHTML = `
        <td>${member.name}${noteMarkup}</td>
        <td>${member.email}</td>
        <td>${member.phone || '-'}</td>
        <td>${formatDate(member.createdAt)}</td>
      `;
      membersTableBody.appendChild(row);

      const option = document.createElement('option');
      option.value = member.id;
      option.textContent = `${member.name} (${member.email})`;
      memberSelect.appendChild(option);
    });
  }

  if (!memberSelect.children.length) {
    const option = document.createElement('option');
    option.value = '';
    option.disabled = true;
    option.selected = true;
    option.textContent = 'Üye kaydı bulunmuyor';
    memberSelect.appendChild(option);
  }

  updateMemberHistoryOptions(sortedMembers);
}

function updateMemberHistoryOptions(members) {
  memberHistorySelect.innerHTML = '';

  if (members.length === 0) {
    memberHistorySelect.disabled = true;
    memberHistorySelectedId = null;
    renderHistoryPlaceholder(
      memberHistoryTableBody,
      'Geçmiş bilgisi göstermek için önce üye ekleyin',
      5
    );
    return;
  }

  memberHistorySelect.disabled = false;
  const nextSelected =
    members.find((member) => member.id === memberHistorySelectedId)?.id ?? members[0].id;

  members.forEach((member) => {
    const option = document.createElement('option');
    option.value = member.id;
    option.textContent = member.email ? `${member.name} (${member.email})` : member.name;
    if (member.id === nextSelected) {
      option.selected = true;
    }
    memberHistorySelect.appendChild(option);
  });

  memberHistorySelectedId = nextSelected;
  loadMemberHistory(memberHistorySelectedId);
}

function updateBookHistoryOptions(books) {
  bookHistorySelect.innerHTML = '';

  if (books.length === 0) {
    bookHistorySelect.disabled = true;
    bookHistorySelectedId = null;
    renderHistoryPlaceholder(
      bookHistoryTableBody,
      'Geçmiş bilgisi göstermek için önce kitap ekleyin',
      5
    );
    return;
  }

  bookHistorySelect.disabled = false;
  const nextSelected =
    books.find((book) => book.id === bookHistorySelectedId)?.id ?? books[0].id;

  books.forEach((book) => {
    const option = document.createElement('option');
    option.value = book.id;
    option.textContent = `${book.title} (${book.totalCopies} kopya)`;
    if (book.id === nextSelected) {
      option.selected = true;
    }
    bookHistorySelect.appendChild(option);
  });

  bookHistorySelectedId = nextSelected;
  loadBookHistory(bookHistorySelectedId);
}

async function loadMemberHistory(memberId) {
  if (!memberId) {
    renderHistoryPlaceholder(memberHistoryTableBody, 'Üye seçilmedi', 5);
    return;
  }

  memberHistoryTableBody.innerHTML = '';
  try {
    const history = await api.memberHistory(memberId);
    renderMemberHistory(history);
  } catch (error) {
    renderHistoryPlaceholder(memberHistoryTableBody, 'Geçmiş yüklenemedi', 5);
    setStatus(`Üye geçmişi yüklenemedi: ${error.message}`, 'error');
  }
}

function renderMemberHistory(history) {
  memberHistoryTableBody.innerHTML = '';
  if (!history.length) {
    renderHistoryPlaceholder(memberHistoryTableBody, 'Bu üyenin ödünç kaydı yok', 5);
    return;
  }

  history.forEach((entry) => {
    const row = document.createElement('tr');
    const statusClass = entry.status === 'borrowed' ? 'borrowed' : 'returned';
    const bookTitle = entry.bookTitle || entry.bookId || 'Bilinmeyen başlık';
    const bookAuthor = entry.bookAuthor ? `<div class="table-sub">${entry.bookAuthor}</div>` : '';
    const noteMarkup = entry.note ? `<div class="table-sub">${entry.note}</div>` : '';
    row.innerHTML = `
      <td>${bookTitle}${bookAuthor}${noteMarkup}</td>
      <td><span class="status-pill ${statusClass}">${translateStatus(entry.status)}</span></td>
      <td>${formatDateTime(entry.loanDate)}</td>
      <td>${formatDate(entry.dueDate)}</td>
      <td>${formatDateTime(entry.returnedAt)}</td>
    `;
    memberHistoryTableBody.appendChild(row);
  });
}

async function loadBookHistory(bookId) {
  if (!bookId) {
    renderHistoryPlaceholder(bookHistoryTableBody, 'Kitap seçilmedi', 5);
    return;
  }

  bookHistoryTableBody.innerHTML = '';
  try {
    const history = await api.bookHistory(bookId);
    renderBookHistory(history);
  } catch (error) {
    renderHistoryPlaceholder(bookHistoryTableBody, 'Geçmiş yüklenemedi', 5);
    setStatus(`Kitap geçmişi yüklenemedi: ${error.message}`, 'error');
  }
}

function renderBookHistory(history) {
  bookHistoryTableBody.innerHTML = '';
  if (!history.length) {
    renderHistoryPlaceholder(bookHistoryTableBody, 'Bu kitabın ödünç kaydı yok', 5);
    return;
  }

  history.forEach((entry) => {
    const row = document.createElement('tr');
    const statusClass = entry.status === 'borrowed' ? 'borrowed' : 'returned';
    const memberName = entry.memberName || entry.memberId || 'Bilinmeyen üye';
    const memberEmail = entry.memberEmail ? `<div class="table-sub">${entry.memberEmail}</div>` : '';
    const noteMarkup = entry.note ? `<div class="table-sub">${entry.note}</div>` : '';
    row.innerHTML = `
      <td>${memberName}${memberEmail}${noteMarkup}</td>
      <td><span class="status-pill ${statusClass}">${translateStatus(entry.status)}</span></td>
      <td>${formatDateTime(entry.loanDate)}</td>
      <td>${formatDate(entry.dueDate)}</td>
      <td>${formatDateTime(entry.returnedAt)}</td>
    `;
    bookHistoryTableBody.appendChild(row);
  });
}

function renderLoans(loans, books, members) {
  loansTableBody.innerHTML = '';
  const bookMap = new Map(books.map((book) => [book.id, book]));
  const memberMap = new Map(members.map((member) => [member.id, member]));

  if (loans.length === 0) {
    renderEmptyState(loansTableBody, 'Henüz ödünç kaydı yok', 6);
    return;
  }

  const orderedLoans = loans
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.loanDate).getTime() -
        new Date(a.updatedAt || a.loanDate).getTime()
    );

  orderedLoans.forEach((loan) => {
    const book = bookMap.get(loan.bookId);
    const member = memberMap.get(loan.memberId);
    const statusClass = loan.status === 'borrowed' ? 'borrowed' : 'returned';
    const noteMarkup = loan.note ? `<div class="table-sub">${loan.note}</div>` : '';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${book ? book.title : loan.bookId}</td>
      <td>${member ? member.name : loan.memberId}${noteMarkup}</td>
      <td>${formatDateTime(loan.loanDate)}</td>
      <td>${formatDate(loan.dueDate)}</td>
      <td><span class="status-pill ${statusClass}">${translateStatus(loan.status)}</span></td>
      <td>
        ${
          loan.status === 'borrowed'
            ? `<button class="secondary" data-loan-id="${loan.id}">İade Al</button>`
            : ''
        }
      </td>
    `;
    loansTableBody.appendChild(row);
  });
}

function renderActivity(loans, books, members) {
  activityFeed.innerHTML = '';

  if (loans.length === 0) {
    const item = document.createElement('li');
    item.className = 'activity-empty';
    item.textContent = 'Henüz ödünç aktivitesi kaydedilmedi.';
    activityFeed.appendChild(item);
    return;
  }

  const bookMap = new Map(books.map((book) => [book.id, book]));
  const memberMap = new Map(members.map((member) => [member.id, member]));

  loans
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.loanDate).getTime() -
        new Date(a.updatedAt || a.loanDate).getTime()
    )
    .slice(0, 6)
    .forEach((loan) => {
      const book = bookMap.get(loan.bookId);
      const member = memberMap.get(loan.memberId);
      const isBorrowed = loan.status === 'borrowed';
      const icon = isBorrowed ? '📥' : '✅';
      const dueInfo = loan.dueDate ? ` · Son teslim ${formatDate(loan.dueDate)}` : '';
      const bookTitle = book ? book.title : 'Bilinmeyen başlık';
      const memberName = member ? member.name : 'Bilinmeyen üye';
      const description = isBorrowed
        ? `${memberName} kişisine ödünç verildi`
        : `${memberName} tarafından iade edildi`;
      const item = document.createElement('li');
      item.className = 'activity-item';
      item.innerHTML = `
        <div class="activity-icon">${icon}</div>
        <div class="activity-content">
          <h3>${bookTitle}</h3>
          <p>${description}${dueInfo}</p>
          <span class="activity-meta">${formatDateTime(loan.updatedAt || loan.loanDate)}</span>
        </div>
      `;
      activityFeed.appendChild(item);
    });
}

function renderEmptyState(tbody, message, colSpan) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.className = 'table-empty';
  cell.colSpan = colSpan;
  cell.textContent = message;
  row.appendChild(cell);
  tbody.appendChild(row);
}

function renderHistoryPlaceholder(tbody, message, colSpan) {
  tbody.innerHTML = '';
  renderEmptyState(tbody, message, colSpan);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatCategories(categories) {
  if (!categories || categories.length === 0) {
    return '';
  }
  const text = categories.join(', ');
  return `<div class="table-sub">${text}</div>`;
}

function parsePublishYear(value) {
  if (!value) {
    return null;
  }
  if (Number.isFinite(value)) {
    return value;
  }
  const match = String(value).match(/(19|20|21)\d{2}/);
  if (match) {
    return Number(match[0]);
  }
  return null;
}

bookForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(bookForm);
  const coverData = coverContexts.create.dataUrl;
  const publishYearValue = publishYearInput?.value.trim();
  const pageCountValue = pageCountInput?.value.trim();
  const purchasePriceValue = purchasePriceInput?.value.trim();
  const payload = {
    title: formData.get('title').trim(),
    author: formData.get('author').trim(),
    isbn: formData.get('isbn').trim(),
    publisher: publisherInput?.value.trim() || null,
    categories: Array.from(selectedCategoriesCreate),
    note: bookNoteInput?.value.trim() || null,
    totalCopies: Number(formData.get('totalCopies')) || 1
  };

  if (publishYearValue) {
    const publishYearNumber = Number(publishYearValue);
    if (!Number.isNaN(publishYearNumber)) {
      payload.publishYear = publishYearNumber;
    }
  }

  if (pageCountValue) {
    const pageCountNumber = Number(pageCountValue);
    if (!Number.isNaN(pageCountNumber)) {
      payload.pageCount = pageCountNumber;
    }
  }

  if (purchasePriceValue) {
    const purchasePriceNumber = Number(purchasePriceValue);
    if (!Number.isNaN(purchasePriceNumber)) {
      payload.purchasePrice = purchasePriceNumber;
    }
  }

  if (coverData) {
    payload.coverImageData = coverData;
  }

  try {
    await api.addBook(payload);
    setStatus(`"${payload.title}" kitabı eklendi`, 'success');
    clearForm(bookForm);
    resetCoverSelection('create');
    resetCategorySelection('create');
    await loadCategories();
    await refreshData();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

memberForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(memberForm);
  const payload = {
    name: formData.get('name').trim(),
    email: formData.get('email').trim(),
    phone: formData.get('phone').trim() || null,
    note: memberNoteInput?.value.trim() || null
  };

  try {
    await api.addMember(payload);
    setStatus(`"${payload.name}" üyesi kaydedildi`, 'success');
    clearForm(memberForm);
    await refreshData();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

lendForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(lendForm);
  const payload = {
    bookId: formData.get('bookId'),
    memberId: formData.get('memberId'),
    dueDate: formData.get('dueDate') || null,
    note: loanNoteInput?.value.trim() || null
  };

  try {
    await api.lendBook(payload);
    setStatus('Ödünç işlemi oluşturuldu', 'success');
    clearForm(lendForm);
    await refreshData();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (titleSuggestionList && !titleSuggestionList.contains(target) && target !== titleInput) {
    titleSuggestionList.classList.add('hidden');
  }
  if (
    detailTitleSuggestionList &&
    !detailTitleSuggestionList.contains(target) &&
    target !== bookDetailTitleInput
  ) {
    detailTitleSuggestionList.classList.add('hidden');
  }
});

loansTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-loan-id]');
  if (!button) {
    return;
  }
  const loanId = button.dataset.loanId;
  try {
    await api.returnBook({ loanId });
    setStatus('Kitap iade edildi olarak işaretlendi', 'success');
    await refreshData();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

(async function init() {
  try {
    updateCoverPreview('create');
    updateCoverPreview('edit');
    await updateAppVersion();
    await loadCategories();
    await refreshData();
    if (api.checkForUpdates) {
      api.checkForUpdates().catch((error) => {
        console.warn('Güncelleme denetimi başarısız', error);
      });
    }
    setStatus('Hazır');
  } catch (error) {
    setStatus(`Veriler yüklenemedi: ${error.message}`, 'error');
  }
})();
