const showdown = require('showdown');

const mdToHtmlConverter = new showdown.Converter({
  simpleLineBreaks: true,
  strikethrough: true,
  tables: true,
  noHeaderId: true,
  simplifiedAutoLink: true,
  literalMidWordUnderscores: true,
  ghCodeBlocks: true,
});

const markdown = `# Titre 1
## Titre 2

Ceci est un **texte en gras** et *italique*.

- Liste item 1
- Liste item 2

> Une citation`;

const html = mdToHtmlConverter.makeHtml(markdown);
console.log("HTML généré par showdown:");
console.log(html);
console.log("\n---\n");
