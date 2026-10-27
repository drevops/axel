// jsdom cannot navigate and reports every followed link and submitted form as
// an error. Other clicks keep their default action, so checkboxes still toggle.
['click', 'auxclick'].forEach((type) => window.addEventListener(type, (event) => event.target.closest?.('a[href]') && event.preventDefault()));
window.addEventListener('submit', (event) => event.preventDefault());
