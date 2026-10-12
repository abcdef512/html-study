// Inspect markup without executing any of the document's scripts.
export function inspectHTML(source) {
  const template = document.createElement('template');
  template.innerHTML = source;
  const doc = template.content;
  const resources = new Set();
  const collect = value => {
    const url = value?.trim();
    if (url && !/^(?:data:|blob:|#)/i.test(url)) resources.add(url);
  };
  for (const node of doc.querySelectorAll('[src], link[rel~="stylesheet"], video[poster], object[data]')) {
    collect(node.getAttribute('src'));
    if (node.matches('link')) collect(node.getAttribute('href'));
    collect(node.getAttribute('poster')); collect(node.getAttribute('data'));
  }
  for (const node of doc.querySelectorAll('style, [style]')) {
    const css = node.tagName === 'STYLE' ? node.textContent : node.getAttribute('style');
    for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/gi)) collect(match[1] || match[2]);
  }
  const srcsets = doc.querySelectorAll('[srcset]').length;
  return {
    title: doc.querySelector('title')?.textContent.trim() || '',
    hasScripts: !!doc.querySelector('script'),
    resources: [...resources],
    hasSrcset: srcsets > 0
  };
}
