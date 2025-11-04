const { createId } = require('../utils/id');

class LoanRepository {
  constructor(store) {
    this.store = store;
  }

  async getAll() {
    const { loans } = await this.store.read();
    return loans;
  }

  async findById(id) {
    const { loans } = await this.store.read();
    return loans.find((loan) => loan.id === id) || null;
  }

  async findActiveLoan(bookId, memberId) {
    const { loans } = await this.store.read();
    return (
      loans.find(
        (loan) =>
          loan.bookId === bookId &&
          loan.memberId === memberId &&
          loan.status === 'borrowed'
      ) || null
    );
  }

  async create(payload) {
    const now = new Date().toISOString();
    const loan = {
      id: createId(),
      bookId: payload.bookId,
      memberId: payload.memberId,
      loanDate: payload.loanDate ?? now,
      dueDate: payload.dueDate,
      status: 'borrowed',
      returnedAt: null,
      note: this.sanitizeNote(payload.note),
      createdAt: now,
      updatedAt: now
    };

    await this.store.write((state) => {
      state.loans.push(loan);
      return state;
    });

    return loan;
  }

  async markReturned(id, returnedAt = new Date().toISOString()) {
    let updatedLoan = null;

    await this.store.write((state) => {
      const target = state.loans.find((loan) => loan.id === id);
      if (!target) {
        throw new Error(`Belirtilen kimliğe sahip ödünç kaydı bulunamadı: ${id}`);
      }
      if (target.status === 'returned') {
        throw new Error('Bu ödünç kaydı daha önce iade edilmiş');
      }
      target.status = 'returned';
      target.returnedAt = returnedAt;
      target.updatedAt = returnedAt;
      updatedLoan = { ...target };
      return state;
    });

    return updatedLoan;
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
  LoanRepository
};
