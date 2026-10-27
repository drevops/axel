// jsdom cannot navigate and reports every followed link and submitted form as
// an error.
['click', 'auxclick', 'submit'].forEach((type) => window.addEventListener(type, (event) => event.preventDefault()));
