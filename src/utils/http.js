const config = require('../config');

function getBaseUrl(req) {
  return config.publicApiBaseUrl || `${req.protocol}://${req.get('host')}`;
}

function resolveAssetUrl(req, value) {
  if (!value) {
    return '';
  }

  if (value.startsWith('/uploads/')) {
    return `${getBaseUrl(req)}${value}`;
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);

      if (url.pathname.startsWith('/uploads/')) {
        return `${getBaseUrl(req)}${url.pathname}`;
      }

      return value;
    } catch {
      return value;
    }
  }

  return value;
}

module.exports = {
  getBaseUrl,
  resolveAssetUrl
};
