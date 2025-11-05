const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_STATE = {
  books: [],
  members: [],
  loans: [],
  categories: []
};

const PRODUCT_NAME = 'LibraryAutomation';

function fallbackUserDataDir() {
  const homeDir = os.homedir();

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    return path.join(appData, PRODUCT_NAME);
  }

  if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', PRODUCT_NAME);
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
  return path.join(configHome, PRODUCT_NAME);
}

function resolveDataDirectory() {
  if (process.env.LIBRARY_DATA_DIR) {
    return process.env.LIBRARY_DATA_DIR;
  }

  const projectDataDir = path.join(__dirname, '../../data');

  if (!process.versions?.electron) {
    return projectDataDir;
  }

  try {
    // electron is only available when running inside the packaged/desktop app
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      if (!app.isPackaged) {
        return projectDataDir;
      }

      const userDataDir = app.getPath('userData');
      if (userDataDir) {
        return userDataDir;
      }
    }
  } catch (error) {
    // Ignore and fall back to platform-specific user data directory.
    return fallbackUserDataDir();
  }

  return fallbackUserDataDir();
}

function resolveDefaultFilePath() {
  if (process.env.LIBRARY_DATA_FILE) {
    return process.env.LIBRARY_DATA_FILE;
  }

  return path.join(resolveDataDirectory(), 'library.json');
}

class DataStore {
  constructor(filePath = resolveDefaultFilePath()) {
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
  DEFAULT_STATE,
  resolveDataDirectory,
  resolveDefaultFilePath
};
