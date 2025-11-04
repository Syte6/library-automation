#!/usr/bin/env node

const { LibraryService } = require('./services/libraryService');

const service = new LibraryService();

function parseArguments(argv) {
  const positional = [];
  const options = {};

  argv.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [rawKey, rawValue] = arg.slice(2).split('=');
      const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      const value = rawValue ?? true;
      options[key] = value;
    } else {
      positional.push(arg);
    }
  });

  return { positional, options };
}

async function main() {
  const [, , ...argv] = process.argv;
  const { positional, options } = parseArguments(argv);

  if (positional.length === 0) {
    console.log('Kütüphane Otomasyonu CLI');
    console.log('Komutlar:');
    console.log('  kitap-ekle --title= --author= --isbn= [--totalCopies=] [--categories=Roman,Fantastik] [--publisher=] [--publishYear=] [--pageCount=] [--purchasePrice=] [--note=]');
    console.log('  uye-kaydet --name= [--email=] [--phone=] [--note=]');
    console.log('  kitap-ver --bookId= --memberId= [--dueDate=YYYY-AA-GG (ör. 2025-12-31)] [--note=]');
    console.log('  iade-al --loanId=');
    console.log('  listele kitaplar|uyeler|oduncler');
    process.exit(0);
  }

  const [rawCommand, rawSubject] = positional;
  const commandMap = {
    'kitap-ekle': 'add-book',
    'uye-kaydet': 'register-member',
    'kitap-ver': 'lend-book',
    'iade-al': 'return-book',
    listele: 'list'
  };

  const subjectMap = {
    kitaplar: 'books',
    uyeler: 'members',
    üyeler: 'members',
    oduncler: 'loans',
    ödüncler: 'loans',
    odunc: 'loans',
    oduncIslemleri: 'loans'
  };

  const optionAliases = {
    baslik: 'title',
    yazar: 'author',
    toplamKopya: 'totalCopies',
    toplamKopyalar: 'totalCopies',
    mevcutKopya: 'availableCopies',
    mevcutKopyalar: 'availableCopies',
    uyeId: 'memberId',
    kitapId: 'bookId',
    uyeAdi: 'name',
    isim: 'name',
    eposta: 'email',
    telefon: 'phone',
    teslimTarihi: 'dueDate',
    oduncId: 'loanId',
    yayinEvi: 'publisher',
    yayin: 'publisher',
    sayfa: 'pageCount',
    sayfaSayisi: 'pageCount',
    basimYili: 'publishYear',
    yil: 'publishYear',
    fiyat: 'purchasePrice',
    alisFiyati: 'purchasePrice',
    kategoriler: 'categories',
    kategori: 'categories',
    not: 'note'
  };

  Object.entries(optionAliases).forEach(([alias, target]) => {
    if (options[alias] !== undefined && options[target] === undefined) {
      options[target] = options[alias];
    }
  });

  const command = commandMap[rawCommand] ?? rawCommand;
  const subject = rawSubject ? subjectMap[rawSubject] ?? rawSubject : undefined;

  try {
    switch (command) {
      case 'add-book': {
        const payload = {
          title: options.title,
          author: options.author,
          isbn: options.isbn,
          publisher: options.publisher ?? null,
          publishYear: options.publishYear ? Number(options.publishYear) : undefined,
          pageCount: options.pageCount ? Number(options.pageCount) : undefined,
          purchasePrice: options.purchasePrice ? Number(options.purchasePrice) : undefined,
          note: options.note ?? null,
          categories: parseCategories(options.categories),
          totalCopies: options.totalCopies ? Number(options.totalCopies) : undefined,
          availableCopies: options.availableCopies
            ? Number(options.availableCopies)
            : undefined
        };
        validateFields(payload, ['title', 'author']);
        if (payload.totalCopies !== undefined && Number.isNaN(payload.totalCopies)) {
          throw new Error('totalCopies değeri sayısal olmalıdır');
        }
        if (payload.publishYear !== undefined && Number.isNaN(payload.publishYear)) {
          throw new Error('publishYear değeri sayısal olmalıdır');
        }
        if (payload.pageCount !== undefined && Number.isNaN(payload.pageCount)) {
          throw new Error('pageCount değeri sayısal olmalıdır');
        }
        if (payload.purchasePrice !== undefined && Number.isNaN(payload.purchasePrice)) {
          throw new Error('purchasePrice değeri sayısal olmalıdır');
        }
        const book = await service.addBook(payload);
        console.log('Kitap eklendi:', book);
        break;
      }
      case 'register-member': {
        const payload = {
          name: options.name,
          email: options.email,
          phone: options.phone ?? null,
          note: options.note ?? null
        };
        validateFields(payload, ['name']);
        const member = await service.registerMember(payload);
        console.log('Üye kaydedildi:', member);
        break;
      }
      case 'lend-book': {
        validateFields(options, ['bookId', 'memberId']);
        const loan = await service.lendBook(
          options.bookId,
          options.memberId,
          options.dueDate,
          options.note ?? null
        );
        console.log('Ödünç işlemi oluşturuldu:', loan);
        break;
      }
      case 'return-book': {
        validateFields(options, ['loanId']);
        const loan = await service.returnBook(options.loanId);
        console.log('Ödünç kaydı iade edildi:', loan);
        break;
      }
      case 'list': {
        if (!subject) {
          throw new Error('Listelemek için hedef belirtin: kitaplar, uyeler ya da oduncler');
        }
        if (subject === 'books') {
          const books = await service.listBooks();
          console.log(JSON.stringify(books, null, 2));
        } else if (subject === 'members') {
          const members = await service.listMembers();
          console.log(JSON.stringify(members, null, 2));
        } else if (subject === 'loans') {
          const loans = await service.listLoans();
          console.log(JSON.stringify(loans, null, 2));
        } else {
          throw new Error(`Bilinmeyen liste hedefi: ${subject}`);
        }
        break;
      }
      default:
        throw new Error(`Bilinmeyen komut: ${command}`);
    }
  } catch (error) {
    console.error('Hata:', error.message);
    process.exitCode = 1;
  }
}

function validateFields(obj, requiredFields) {
  const missing = requiredFields.filter((field) => !obj[field]);
  if (missing.length > 0) {
    throw new Error(`Eksik zorunlu alanlar: ${missing.join(', ')}`);
  }
}

function parseCategories(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

main();
