function sanitizeText(value, maxLength = 120) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function isSecureHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

module.exports = { sanitizeText, isSecureHttpsUrl };
