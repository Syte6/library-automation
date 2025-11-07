const { DataStore } = require('../storage/dataStore');
const { BookRepository } = require('../repositories/bookRepository');
const { MemberRepository } = require('../repositories/memberRepository');
const { LoanRepository } = require('../repositories/loanRepository');
const { createId } = require('../utils/id');

class LibraryService {
  constructor(store = new DataStore()) {
    this.store = store;
    this.books = new BookRepository(store);
    this.members = new MemberRepository(store);
    this.loans = new LoanRepository(store);
  }

  async addBook(payload) {
    const normalizedPayload = {
      ...payload,
      categories: this.normalizeCategories(payload.categories),
      note: this.sanitizeNote(payload.note)
    };
    const book = await this.books.create(normalizedPayload);
    await this.ensureCategories(normalizedPayload.categories);
    return book;
  }

  async updateBook(id, updates) {
    const normalizedUpdates = {
      ...updates
    };
    if (updates.categories !== undefined) {
      normalizedUpdates.categories = this.normalizeCategories(updates.categories);
    }
    if (updates.note !== undefined) {
      normalizedUpdates.note = this.sanitizeNote(updates.note);
    }
    const book = await this.books.update(id, normalizedUpdates);
    if (normalizedUpdates.categories) {
      await this.ensureCategories(normalizedUpdates.categories);
    }
    return book;
  }

  async deleteBook(id) {
    const state = await this.store.read();
    const book = state.books.find((item) => item.id === id);
    if (!book) {
      throw new Error(`Belirtilen kimliğe sahip kitap bulunamadı: ${id}`);
    }
    const hasActiveLoan = state.loans.some(
      (loan) => loan.bookId === id && loan.status === 'borrowed'
    );
    if (hasActiveLoan) {
      throw new Error('Ödünçte olan kitap silinemez. Önce tüm kopyaların iade edildiğinden emin olun.');
    }
    await this.books.delete(id);
    return { ...book };
  }

  async listBooks() {
    return this.books.getAll();
  }

  async getBook(id) {
    const book = await this.books.findById(id);
    if (!book) {
      throw new Error(`Belirtilen kimliğe sahip kitap bulunamadı: ${id}`);
    }
    return book;
  }

  async registerMember(payload) {
    const normalizedPayload = {
      ...payload,
      note: this.sanitizeNote(payload.note)
    };
    return this.members.create(normalizedPayload);
  }

  async updateMember(id, updates) {
    const normalizedUpdates = {
      ...updates
    };
    if (updates.note !== undefined) {
      normalizedUpdates.note = this.sanitizeNote(updates.note);
    }
    return this.members.update(id, normalizedUpdates);
  }

  async listMembers() {
    return this.members.getAll();
  }

  async listLoans() {
    return this.loans.getAll();
  }

  async getMemberLoanHistory(memberId) {
    const state = await this.store.read();
    const member = state.members.find((item) => item.id === memberId);
    if (!member) {
      throw new Error(`Belirtilen kimliğe sahip üye bulunamadı: ${memberId}`);
    }

    return state.loans
      .filter((loan) => loan.memberId === memberId)
      .map((loan) => {
        const book = state.books.find((item) => item.id === loan.bookId);
        return {
          loanId: loan.id,
          bookId: loan.bookId,
          bookTitle: book ? book.title : null,
          bookAuthor: book ? book.author : null,
          loanDate: loan.loanDate,
          dueDate: loan.dueDate,
          returnedAt: loan.returnedAt,
          status: loan.status,
          updatedAt: loan.updatedAt,
          note: loan.note || null
        };
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.loanDate).getTime() -
          new Date(a.updatedAt || a.loanDate).getTime()
      );
  }

  async getBookLoanHistory(bookId) {
    const state = await this.store.read();
    const book = state.books.find((item) => item.id === bookId);
    if (!book) {
      throw new Error(`Belirtilen kimliğe sahip kitap bulunamadı: ${bookId}`);
    }

    return state.loans
      .filter((loan) => loan.bookId === bookId)
      .map((loan) => {
        const member = state.members.find((item) => item.id === loan.memberId);
        return {
          loanId: loan.id,
          memberId: loan.memberId,
          memberName: member ? member.name : null,
          memberEmail: member ? member.email : null,
          loanDate: loan.loanDate,
          dueDate: loan.dueDate,
          returnedAt: loan.returnedAt,
          status: loan.status,
          updatedAt: loan.updatedAt,
          note: loan.note || null
        };
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.loanDate).getTime() -
          new Date(a.updatedAt || a.loanDate).getTime()
      );
  }

  async lendBook(bookId, memberId, dueDate, note) {
    let loanRecord = null;
    const now = new Date().toISOString();

    await this.store.write((state) => {
      this.ensureStateShape(state);
      const book = state.books.find((item) => item.id === bookId);
      if (!book) {
        throw new Error(`Belirtilen kimliğe sahip kitap bulunamadı: ${bookId}`);
      }
      if (book.availableCopies < 1) {
        throw new Error('Bu kitap için mevcut kopya kalmadı');
      }

      const member = state.members.find((item) => item.id === memberId);
      if (!member) {
        throw new Error(`Belirtilen kimliğe sahip üye bulunamadı: ${memberId}`);
      }

      const existingLoan = state.loans.find(
        (loan) =>
          loan.bookId === bookId && loan.memberId === memberId && loan.status === 'borrowed'
      );
      if (existingLoan) {
        throw new Error('Üye bu kitabı zaten ödünç almış ve henüz iade etmemiş');
      }

      book.availableCopies -= 1;
      book.updatedAt = now;

      const loan = {
        id: createId(),
        bookId,
        memberId,
        loanDate: now,
        dueDate: dueDate ?? null,
        status: 'borrowed',
        returnedAt: null,
        note: this.sanitizeNote(note),
        createdAt: now,
        updatedAt: now
      };
      state.loans.push(loan);
      loanRecord = { ...loan };
      return state;
    });

    return loanRecord;
  }

  async returnBook(loanId) {
    let result = null;
    const now = new Date().toISOString();

    await this.store.write((state) => {
      const loan = state.loans.find((item) => item.id === loanId);
      if (!loan) {
        throw new Error(`Belirtilen kimliğe sahip ödünç kaydı bulunamadı: ${loanId}`);
      }
      if (loan.status === 'returned') {
        throw new Error('Bu ödünç kaydı zaten iade edilmiş');
      }

      const book = state.books.find((item) => item.id === loan.bookId);
      if (!book) {
        throw new Error(`Belirtilen kimliğe sahip kitap bulunamadı: ${loan.bookId}`);
      }

      loan.status = 'returned';
      loan.returnedAt = now;
      loan.updatedAt = now;

      book.availableCopies += 1;
      if (book.availableCopies > book.totalCopies) {
        book.availableCopies = book.totalCopies;
      }
      book.updatedAt = now;

      result = { ...loan };
      return state;
    });

    return result;
  }

  async listCategories() {
    const state = await this.store.read();
    if (!Array.isArray(state.categories)) {
      await this.store.write((current) => {
        if (!Array.isArray(current.categories)) {
          current.categories = [];
        }
        return current;
      });
      return [];
    }
    return [...state.categories].sort((a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' }));
  }

  async addCategory(name) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      throw new Error('Kategori adı boş olamaz');
    }
    await this.store.write((state) => {
      this.ensureStateShape(state);
      if (!state.categories.includes(trimmed)) {
        state.categories.push(trimmed);
      }
      return state;
    });
    return this.listCategories();
  }

  async ensureCategories(categories = []) {
    if (!categories || categories.length === 0) {
      return;
    }
    await this.store.write((state) => {
      this.ensureStateShape(state);
      categories.forEach((category) => {
        if (!state.categories.includes(category)) {
          state.categories.push(category);
        }
      });
      return state;
    });
  }

  ensureStateShape(state) {
    if (!Array.isArray(state.categories)) {
      state.categories = [];
    }
    return state;
  }

  normalizeCategories(raw) {
    if (!raw) {
      return [];
    }
    if (typeof raw === 'string') {
      return [raw.trim()].filter(Boolean);
    }
    if (Array.isArray(raw)) {
      return Array.from(
        new Set(
          raw
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
        )
      );
    }
    return [];
  }

  sanitizeNote(note) {
    if (typeof note !== 'string') {
      return null;
    }
    const trimmed = note.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}

module.exports = {
  LibraryService
};
