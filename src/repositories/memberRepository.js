const { createId } = require('../utils/id');

class MemberRepository {
  constructor(store) {
    this.store = store;
  }

  async getAll() {
    const { members } = await this.store.read();
    return members;
  }

  async findById(id) {
    const { members } = await this.store.read();
    return members.find((member) => member.id === id) || null;
  }

  async findByEmail(email) {
    if (!email) {
      return null;
    }
    const normalized = email.trim().toLowerCase();
    const { members } = await this.store.read();
    return (
      members.find((member) => member.email && member.email.toLowerCase() === normalized) || null
    );
  }

  async create(payload) {
   const now = new Date().toISOString();
   const member = {
     id: createId(),
     name: payload.name,
      email: payload.email ? payload.email.trim() : null,
      phone: payload.phone,
      note: this.sanitizeNote(payload.note),
      createdAt: now,
      updatedAt: now
    };

    await this.store.write((state) => {
      if (
        member.email &&
        state.members.some(
          (existing) =>
            existing.email && existing.email.toLowerCase() === member.email.toLowerCase()
        )
      ) {
        throw new Error(`Bu e-posta adresiyle kayıtlı bir üye zaten var: ${member.email}`);
      }
      state.members.push(member);
      return state;
    });

    return member;
  }

  async update(id, updates) {
    let updatedMember = null;
    const now = new Date().toISOString();

    await this.store.write((state) => {
      const target = state.members.find((member) => member.id === id);
      if (!target) {
        throw new Error(`Belirtilen kimliğe sahip üye bulunamadı: ${id}`);
      }

      if (updates.email !== undefined && updates.email !== target.email) {
        const normalized = updates.email ? updates.email.trim().toLowerCase() : null;
        if (
          normalized &&
          state.members.some(
            (member) => member.email && member.email.toLowerCase() === normalized && member.id !== id
          )
        ) {
          throw new Error(`Bu e-posta adresi başka bir üye tarafından kullanılıyor: ${updates.email}`);
        }
        target.email = normalized ? updates.email.trim() : null;
      }

      if (updates.name) {
        target.name = updates.name;
      }

      if (updates.phone !== undefined) {
        target.phone = updates.phone;
      }

      target.updatedAt = now;
      if (updates.note !== undefined) {
        target.note = this.sanitizeNote(updates.note);
      }
      updatedMember = { ...target };
      return state;
    });

    return updatedMember;
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
  MemberRepository
};
