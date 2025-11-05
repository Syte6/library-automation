const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

contextBridge.exposeInMainWorld('libraryApi', {
  listBooks: () => invoke('books:list'),
  getBook: (id) => invoke('books:get', { id }),
  addBook: (payload) => invoke('books:add', payload),
  updateBook: (payload) => invoke('books:update', payload),
  fetchBookByISBN: (isbn) => invoke('books:lookup:isbn', { isbn }),
  searchBooksByTitle: (query) => invoke('books:lookup:title', { query }),
  listCategories: () => invoke('categories:list'),
  addCategory: (name) => invoke('categories:add', { name }),
  listMembers: () => invoke('members:list'),
  addMember: (payload) => invoke('members:add', payload),
  listLoans: () => invoke('loans:list'),
  lendBook: (payload) => invoke('loans:lend', payload),
  returnBook: (payload) => invoke('loans:return', payload),
  memberHistory: (memberId) => invoke('history:member', { memberId }),
  bookHistory: (bookId) => invoke('history:book', { bookId }),
  resolveFile: (filePath) => invoke('file:resolve', { path: filePath }),
  checkForUpdates: () => invoke('updates:check'),
  getVersion: () => invoke('app:version'),
  onUpdateStatus: (callback) => {
    const channel = 'update-status';
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
});
