// Mock for isomorphic-dompurify — used to prevent ESM parse errors in Jest
const DOMPurify = {
  sanitize: (dirty, options) => dirty,
  addHook: () => {},
  removeHook: () => {},
  isValidAttribute: () => true
};

module.exports = DOMPurify;
module.exports.default = DOMPurify;
