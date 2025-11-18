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
