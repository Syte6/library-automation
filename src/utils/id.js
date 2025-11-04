const { randomUUID } = require('crypto');

function createId() {
  return randomUUID();
}

module.exports = {
  createId
};
