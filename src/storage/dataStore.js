const fs = require('fs');
const path = require('path');

const DEFAULT_STATE = {
  books: [],
  members: [],
  loans: [],
  categories: []
};

class DataStore {
  constructor(filePath = path.join(__dirname, '../../data/library.json')) {
    this.filePath = filePath;
    this.ensureFile();
  }

  ensureFile() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(DEFAULT_STATE, null, 2), 'utf8');
    }
  }

  async read() {
    const raw = await fs.promises.readFile(this.filePath, 'utf8');
    return JSON.parse(raw);
  }

  async write(updater) {
    const current = await this.read();
    const nextState = await updater(JSON.parse(JSON.stringify(current)));
    const tempPath = `${this.filePath}.tmp`;
    await fs.promises.writeFile(tempPath, JSON.stringify(nextState, null, 2));
    await fs.promises.rename(tempPath, this.filePath);
    return nextState;
  }
}

module.exports = {
  DataStore,
  DEFAULT_STATE
};
