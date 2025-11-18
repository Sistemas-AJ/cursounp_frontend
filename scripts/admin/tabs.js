const tabs = document.querySelectorAll('[data-config-tab]');
const panels = document.querySelectorAll('.config-panel');

function showPanel(targetId) {
  panels.forEach((panel) => {
    panel.classList.toggle('is-visible', panel.id === targetId);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.configTab === targetId);
  });
}

export function initTabs() {
  if (!tabs.length) return;
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.configTab));
  });
}
