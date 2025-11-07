const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { DataStore } = require('../storage/dataStore');
const { LibraryService } = require('../services/libraryService');

async function run() {
  const testDataPath = path.join(__dirname, '../../data/library-test.json');
  if (fs.existsSync(testDataPath)) {
    fs.unlinkSync(testDataPath);
  }

  const store = new DataStore(testDataPath);
  const service = new LibraryService(store);

  const book = await service.addBook({
    title: 'Test Driven Development',
    author: 'Kent Beck',
    isbn: '9780321146533',
    totalCopies: 3
  });

  assert.strictEqual(book.title, 'Test Driven Development');
  assert.strictEqual(book.availableCopies, 3);

  const member = await service.registerMember({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+90-555-000'
  });

  assert.strictEqual(member.name, 'Ada Lovelace');

  const loan = await service.lendBook(book.id, member.id, '2024-12-31');

  assert.strictEqual(loan.bookId, book.id);
  assert.strictEqual(loan.memberId, member.id);

  const booksAfterLoan = await service.listBooks();
  assert.strictEqual(booksAfterLoan[0].availableCopies, 2);

  await assert.rejects(
    () => service.deleteBook(book.id),
    /Ödünçte olan kitap silinemez/
  );

  const returned = await service.returnBook(loan.id);
  assert.strictEqual(returned.status, 'returned');

  const loans = await service.listLoans();
  assert.strictEqual(loans.length, 1);
  assert.strictEqual(loans[0].status, 'returned');

  const deleted = await service.deleteBook(book.id);
  assert.strictEqual(deleted.id, book.id);

  const booksAfterDelete = await service.listBooks();
  assert.strictEqual(booksAfterDelete.length, 0);

  if (fs.existsSync(testDataPath)) {
    fs.unlinkSync(testDataPath);
  }

  console.log('Tüm testler başarıyla tamamlandı');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
