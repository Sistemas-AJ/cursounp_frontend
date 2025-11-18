export function setMessage(element, message, status = 'info') {
  if (!element) return;
  element.textContent = message;
  element.dataset.status = status;
  element.hidden = !message;
}

export function toIsoTime(value) {
  if (!value) return null;
  return `${value}:00Z`;
}

export function fromIsoTime(value) {
  if (!value) return '';
  if (value.includes('T')) {
    return value.substring(11, 16);
  }
  return value.substring(0, 5);
}

export function formatDateLabel(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatFileSize(size) {
  if (!size && size !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
