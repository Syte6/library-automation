const { createId } = require('../utils/id');

class BookRepository {
  constructor(store) {
    this.store = store;
  }

  async getAll() {
    const { books } = await this.store.read();
    return books;
  }

  async findById(id) {
    const { books } = await this.store.read();
    return books.find((book) => book.id === id) || null;
  }

  async findByISBN(isbn) {
    const { books } = await this.store.read();
    return books.find((book) => book.isbn === isbn) || null;
  }

  sanitizeCategories(rawCategories) {
    if (!Array.isArray(rawCategories)) {
      return [];
    }
    const normalized = rawCategories
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }

  parseNumber(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  parseInteger(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const numeric = parseInt(value, 10);
    return Number.isFinite(numeric) ? numeric : null;
  }

  sanitizeNote(note) {
    if (typeof note !== 'string') {
      return null;
    }
    const trimmed = note.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  sanitizeText(value) {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async create(payload) {
    const now = new Date().toISOString();
    const totalCopies = this.parseInteger(payload.totalCopies) ?? 1;
    let availableCopies =
      payload.availableCopies !== undefined
        ? this.parseInteger(payload.availableCopies)
        : totalCopies;
    if (availableCopies === null) {
      availableCopies = totalCopies;
    }
    const book = {
      id: createId(),
      title: payload.title,
      author: payload.author,
      isbn: this.sanitizeText(payload.isbn),
      publisher: this.sanitizeText(payload.publisher),
      publishYear: this.parseInteger(payload.publishYear),
      pageCount: this.parseInteger(payload.pageCount),
      purchasePrice: this.parseNumber(payload.purchasePrice),
      totalCopies,
      availableCopies: Math.min(availableCopies, totalCopies),
      categories: this.sanitizeCategories(payload.categories),
      note: this.sanitizeNote(payload.note),
      coverImagePath: payload.coverImagePath ?? null,
      createdAt: now,
      updatedAt: now
    };

    await this.store.write((state) => {
      if (!Array.isArray(state.categories)) {
        state.categories = [];
      }
      if (book.isbn && state.books.some((existing) => existing.isbn === book.isbn)) {
        throw new Error(`Bu ISBN numarasına sahip kitap zaten kayıtlı: ${book.isbn}`);
      }
      book.categories.forEach((category) => {
        if (!state.categories.includes(category)) {
          state.categories.push(category);
        }
      });
      state.books.push(book);
      return state;
    });

    return book;
  }

  async update(id, updates) {
    let updatedBook = null;
    const now = new Date().toISOString();

    await this.store.write((state) => {
      const target = state.books.find((book) => book.id === id);
      if (!target) {
        throw new Error(`Belirtilen kimliğe sahip kitap bulunamadı: ${id}`);
      }

      if (updates.isbn && updates.isbn !== target.isbn) {
        const sanitizedIsbn = this.sanitizeText(updates.isbn);
        sanitized.isbn = sanitizedIsbn;
        if (
          sanitizedIsbn &&
          state.books.some((book) => book.isbn === sanitizedIsbn && book.id !== id)
        ) {
          throw new Error(`Bu ISBN numarasına sahip başka bir kitap zaten var: ${updates.isbn}`);
        }
      }

      const sanitized = {
        ...updates
      };

      if (updates.publishYear !== undefined) {
        sanitized.publishYear = this.parseInteger(updates.publishYear);
      }
      if (updates.pageCount !== undefined) {
        sanitized.pageCount = this.parseInteger(updates.pageCount);
      }
      if (updates.purchasePrice !== undefined) {
        sanitized.purchasePrice = this.parseNumber(updates.purchasePrice);
      }
      if (updates.totalCopies !== undefined) {
        const parsedTotal = this.parseInteger(updates.totalCopies);
        if (parsedTotal !== null) {
          sanitized.totalCopies = parsedTotal;
        } else {
          delete sanitized.totalCopies;
        }
      }
      if (updates.availableCopies !== undefined) {
        const parsedAvailable = this.parseInteger(updates.availableCopies);
        if (parsedAvailable !== null) {
          sanitized.availableCopies = parsedAvailable;
        } else {
          delete sanitized.availableCopies;
        }
      }
      if (updates.categories !== undefined) {
        sanitized.categories = this.sanitizeCategories(updates.categories);
      }
      if (updates.note !== undefined) {
        sanitized.note = this.sanitizeNote(updates.note);
      }
      if (updates.publisher !== undefined) {
        sanitized.publisher = this.sanitizeText(updates.publisher);
      }

      Object.assign(target, sanitized, { updatedAt: now });
      if (target.availableCopies > target.totalCopies) {
        target.availableCopies = target.totalCopies;
      }
      if (sanitized.categories) {
        if (!Array.isArray(state.categories)) {
          state.categories = [];
        }
        sanitized.categories.forEach((category) => {
          if (!state.categories.includes(category)) {
            state.categories.push(category);
          }
        });
      }
      updatedBook = { ...target };
      return state;
    });

    return updatedBook;
  }

  async adjustAvailability(id, delta) {
    let updatedBook = null;

    await this.store.write((state) => {
      const target = state.books.find((book) => book.id === id);
      if (!target) {
        throw new Error(`Belirtilen kimliğe sahip kitap bulunamadı: ${id}`);
      }

      const nextAvailable = target.availableCopies + delta;
      if (nextAvailable < 0 || nextAvailable > target.totalCopies) {
        throw new Error('Geçersiz stok güncellemesi yapıldı');
      }
      target.availableCopies = nextAvailable;
      target.updatedAt = new Date().toISOString();
      updatedBook = { ...target };
      return state;
    });

    return updatedBook;
  }
}

module.exports = {
  BookRepository
};
