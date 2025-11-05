const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const https = require('https');
const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

app.commandLine.appendSwitch('enable-experimental-web-platform-features');
const { LibraryService } = require('../services/libraryService');
const { resolveDataDirectory } = require('../storage/dataStore');

const DATA_ROOT = resolveDataDirectory();
const IMAGES_DIR = path.join(DATA_ROOT, 'images');

function ensureImagesDir() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function sanitizeExtension(ext) {
  const normalized = ext.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp'].includes(normalized)) {
    return normalized === 'jpg' ? 'jpeg' : normalized;
  }
  return 'png';
}

async function saveCoverImage(coverImageData, bookId) {
  ensureImagesDir();
  const match = /^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/.exec(coverImageData);
  if (!match) {
    throw new Error('Geçersiz kapak resmi verisi alındı');
  }
  const [, format, base64] = match;
  const extension = sanitizeExtension(format);
  const buffer = Buffer.from(base64, 'base64');
  await deleteCoverImage(bookId);
  const filePath = path.join(IMAGES_DIR, `${bookId}.${extension}`);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

async function deleteCoverImage(bookId) {
  ensureImagesDir();
  try {
    const files = await fs.promises.readdir(IMAGES_DIR);
    const matches = files.filter((fileName) => fileName.startsWith(`${bookId}.`));
    await Promise.all(
      matches.map((fileName) =>
        fs.promises.unlink(path.join(IMAGES_DIR, fileName)).catch(() => {})
      )
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Kapak resmi silinemedi:', error);
    }
  }
}

function performGetJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`API isteği başarısız oldu: ${response.statusCode}`));
        return;
      }
      let rawData = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        rawData += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (error) {
          reject(new Error('API yanıtı çözümlenemedi'));
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy(new Error('API isteği zaman aşımına uğradı'));
    });
  });
}

async function fetchBookByISBN(isbn) {
  const cleanIsbn = String(isbn).replace(/[^0-9Xx]/g, '');
  if (!cleanIsbn) {
    throw new Error('Geçerli ISBN girilmedi');
  }

  try {
    const url = `https://openlibrary.org/isbn/${cleanIsbn}.json`;
    const data = await performGetJson(url);
    return normalizeOpenLibraryData(data);
  } catch (error) {
    const fallbackUrl = `https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:${cleanIsbn}`;
    try {
      const fallbackData = await performGetJson(fallbackUrl);
      const entry = fallbackData[`ISBN:${cleanIsbn}`];
      if (!entry) {
        throw new Error('Bu ISBN için kayıt bulunamadı');
      }
      return normalizeOpenLibraryData(entry);
    } catch (fallbackError) {
      throw new Error(
        fallbackError.message || error.message || 'ISBN bilgisi alınamadı'
      );
    }
  }
}

function normalizeOpenLibraryData(data) {
  const result = {
    title: data.title || null,
    subtitle: data.subtitle || null,
    publishDate: data.publish_date || data.publishDate || data.publish_date || null,
    numberOfPages: data.number_of_pages || data.numberOfPages || null,
    authors: [],
    publishers: []
  };

  if (Array.isArray(data.authors) && data.authors.length > 0) {
    result.authors = data.authors
      .map((author) => {
        if (typeof author === 'string') {
          return author;
        }
        if (author && author.name) {
          return author.name;
        }
        return null;
      })
      .filter(Boolean);
  } else if (Array.isArray(data.by_statement)) {
    result.authors = data.by_statement;
  } else if (data.by_statement) {
    result.authors = [data.by_statement];
  } else if (data.author) {
    result.authors = [data.author];
  }

  if (Array.isArray(data.publishers) && data.publishers.length > 0) {
    result.publishers = data.publishers
      .map((publisher) => {
        if (typeof publisher === 'string') {
          return publisher;
        }
        if (publisher && publisher.name) {
          return publisher.name;
        }
        return null;
      })
      .filter(Boolean);
  } else if (data.publisher) {
    result.publishers = [data.publisher];
  }

  return result;
}

async function searchBooksByTitle(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }
  const url = `https://openlibrary.org/search.json?limit=6&title=${encodeURIComponent(trimmed)}`;
  const data = await performGetJson(url);
  if (!data || !Array.isArray(data.docs)) {
    return [];
  }
  return data.docs
    .map((doc) => ({
      key: doc.key,
      title: doc.title,
      subtitle: doc.subtitle || null,
      authors: doc.author_name || [],
      publishYear: doc.first_publish_year || null,
      isbn: Array.isArray(doc.isbn) ? doc.isbn[0] : null,
      publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : null
    }))
    .filter((item) => item.title);
}

let mainWindow;
const service = new LibraryService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendUpdateStatus(status, info) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, info });
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus('available', info);
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus('not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus('download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus('downloaded', info);
    autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (error) => {
    sendUpdateStatus('error', { message: error?.message || String(error) });
  });

  autoUpdater
    .checkForUpdates()
    .catch((error) => sendUpdateStatus('error', { message: error?.message || String(error) }));
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('books:list', async () => {
  return service.listBooks();
});

ipcMain.handle('books:get', async (_event, payload) => {
  return service.getBook(payload.id);
});

ipcMain.handle('books:add', async (_event, payload) => {
  const { coverImageData, ...bookPayload } = payload;
  const createdBook = await service.addBook(bookPayload);

  if (coverImageData) {
    const coverPath = await saveCoverImage(coverImageData, createdBook.id);
    return service.updateBook(createdBook.id, { coverImagePath: coverPath });
  }

  return createdBook;
});

ipcMain.handle('books:update', async (_event, payload) => {
  const { id, updates } = payload;
  const { coverImageData, removeCover, ...bookUpdates } = updates;

  let updated = bookUpdates && Object.keys(bookUpdates).length
    ? await service.updateBook(id, bookUpdates)
    : await service.getBook(id);

  if (coverImageData) {
    const coverPath = await saveCoverImage(coverImageData, id);
    updated = await service.updateBook(id, { coverImagePath: coverPath });
  } else if (removeCover) {
    await deleteCoverImage(id);
    updated = await service.updateBook(id, { coverImagePath: null });
  }

  return updated;
});

ipcMain.handle('members:list', async () => {
  return service.listMembers();
});

ipcMain.handle('members:add', async (_event, payload) => {
  return service.registerMember(payload);
});

ipcMain.handle('loans:list', async () => {
  return service.listLoans();
});

ipcMain.handle('loans:lend', async (_event, payload) => {
  return service.lendBook(payload.bookId, payload.memberId, payload.dueDate, payload.note);
});

ipcMain.handle('loans:return', async (_event, payload) => {
  return service.returnBook(payload.loanId);
});

ipcMain.handle('history:member', async (_event, payload) => {
  return service.getMemberLoanHistory(payload.memberId);
});

ipcMain.handle('history:book', async (_event, payload) => {
  return service.getBookLoanHistory(payload.bookId);
});

ipcMain.handle('file:resolve', async (_event, payload) => {
  if (!payload || !payload.path) {
    return null;
  }
  try {
    return pathToFileURL(payload.path).toString();
  } catch (error) {
    console.error('Dosya yolu çözümlenemedi:', error);
    return null;
  }
});

ipcMain.handle('books:lookup:isbn', async (_event, payload) => {
  try {
    return await fetchBookByISBN(payload.isbn);
  } catch (error) {
    throw new Error(error.message || 'ISBN bilgisi alınamadı');
  }
});

ipcMain.handle('books:lookup:title', async (_event, payload) => {
  try {
    return await searchBooksByTitle(payload.query || '');
  } catch (error) {
    throw new Error(error.message || 'Başlık araması başarısız');
  }
});

ipcMain.handle('categories:list', async () => {
  return service.listCategories();
});

ipcMain.handle('categories:add', async (_event, payload) => {
  return service.addCategory(payload.name || '');
});

ipcMain.handle('updates:check', async () => {
  if (!app.isPackaged) {
    return { skipped: true };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { started: true };
  } catch (error) {
    sendUpdateStatus('error', { message: error?.message || String(error) });
    throw error;
  }
});

ipcMain.handle('app:version', async () => {
  return app.getVersion();
});
