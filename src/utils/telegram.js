function escapeTelegramMarkdown(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/([_*`\[\]()])/g, '\\$1');
}

module.exports = {
  escapeTelegramMarkdown
};
