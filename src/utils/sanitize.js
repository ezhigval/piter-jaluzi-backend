function sanitizeText(value, maxLength = 200) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeLongText(value, maxLength = 2000) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[<>]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function sanitizePhone(value) {
  return sanitizeText(value, 32);
}

function sanitizeStringArray(value, maxItems = 10, maxLength = 500) {
  if (typeof value === 'string') {
    const normalized = sanitizeText(value, maxLength);
    return normalized ? [normalized] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parsePositiveNumber(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseRating(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }

  return parsed;
}

function parseOptionalBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (value === '1') {
    return true;
  }

  if (value === '0') {
    return false;
  }

  return Boolean(value);
}

const blindsTypeMap = {
  roller: 'Рулонные',
  vertical: 'Вертикальные',
  horizontal: 'Горизонтальные',
  other: 'Другое',
  'рулонные': 'Рулонные',
  'вертикальные': 'Вертикальные',
  'горизонтальные': 'Горизонтальные',
  'другое': 'Другое'
};

function normalizeBlindsType(value) {
  const sanitized = sanitizeText(value, 80);
  const normalizedKey = sanitized.toLowerCase();

  return blindsTypeMap[normalizedKey] || sanitized;
}

module.exports = {
  sanitizeLongText,
  sanitizePhone,
  sanitizeStringArray,
  sanitizeText,
  parsePositiveNumber,
  parseRating,
  parseOptionalBoolean,
  normalizeBlindsType
};
