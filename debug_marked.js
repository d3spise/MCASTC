const marked = require('marked');
const text = `# Nowy rozdział: Regularne aktualizacje na blogu

Cześć Wszystkim!

Z radością ogłaszam małą reaktywację.
`;

console.log(marked.parse(text));

const text2 = `# Nowy rozdział: Regularne aktualizacje na blogu
Cześć Wszystkim!
Z radością ogłaszam małą reaktywację.
`;
console.log('--- No blank lines ---');
console.log(marked.parse(text2));

console.log('--- Breaks: true ---');
console.log(marked.parse(text2, { breaks: true }));
