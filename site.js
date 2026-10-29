// Progressive enhancement: article text and links are already in the HTML.
document.documentElement.classList.add('has-js');
const searchIndexUrl = new URL('search-index.json', document.currentScript.src);
const byId = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const categories = ['all', 'Content', 'SEO basics', 'Tools'];
function filterArticles(category, updateUrl = true) {
  if (!categories.includes(category)) category = 'all';
  let count = 0;
  document.querySelectorAll('.article-card').forEach(card => {
    card.hidden = category !== 'all' && card.dataset.category !== category;
    if (!card.hidden) count++;
  });
  document.querySelectorAll('.filter').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  byId('library-empty').hidden = count > 0;
  byId('filter-status').textContent = `${count} ${count === 1 ? 'article' : 'articles'} shown`;
  if (updateUrl) {
    const url = new URL(location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    history.replaceState(null, '', url);
  }
}
if (byId('article-grid')) {
  document.querySelector('.filters').hidden = false;
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => filterArticles(button.dataset.filter)));
  byId('reset-filter').addEventListener('click', () => filterArticles('all'));
  filterArticles(params.get('category') || 'all', false);
}
const menu = byId('menu-toggle');
menu.hidden = false;
function closeMenu() {
  byId('main-nav').classList.remove('is-open');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open navigation');
}
menu.addEventListener('click', () => {
  const open = byId('main-nav').classList.toggle('is-open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
byId('main-nav').addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && byId('search-dialog').open) {
    event.preventDefault(); byId('search-dialog').close(); return;
  }
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    closeMenu(); menu.focus();
  }
});
let articles;
let pendingSearch;
async function loadSearch() {
  if (!pendingSearch) pendingSearch = fetch(searchIndexUrl, {signal: AbortSignal.timeout(10000)})
    .then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
    .then(rows => { if (!Array.isArray(rows)) throw new Error('Invalid index'); articles = rows; })
    .catch(error => { pendingSearch = null; throw error; });
  return pendingSearch;
}
function updateSearch() {
  const query = byId('search-input').value.trim().toLocaleLowerCase();
  const matches = articles.filter(article => article.searchText.toLocaleLowerCase().includes(query));
  byId('search-results').replaceChildren();
  for (const article of matches) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const title = document.createElement('strong');
    const meta = document.createElement('small');
    link.href = article.url;
    title.textContent = article.title;
    meta.textContent = `${article.category} · ${article.readTime}`;
    link.append(title, meta); item.append(link); byId('search-results').append(item);
  }
  byId('search-state').hidden = matches.length > 0;
  byId('search-state').textContent = 'No matching articles. Try “content”, “Squarespace”, or “tools”.';
}
const dialog = byId('search-dialog');
byId('open-search').hidden = false;
byId('open-search').addEventListener('click', async () => {
  closeMenu(); dialog.showModal(); byId('search-input').focus();
  byId('search-results').replaceChildren();
  byId('search-state').hidden = false;
  byId('search-state').textContent = 'Loading articles…';
  try { await loadSearch(); updateSearch(); }
  catch { byId('search-state').textContent = 'Search couldn’t load. Close this window to browse the reading list, or reopen it to try again.'; }
});
byId('close-search').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
byId('search-input').addEventListener('input', () => { if (articles) updateSearch(); });
byId('copy-link')?.addEventListener('click', async () => {
  try {
    const url = new URL(location.href); url.search = ''; url.hash = '';
    await navigator.clipboard.writeText(url.href);
    byId('copy-status').textContent = 'Link copied';
  } catch { byId('copy-status').textContent = 'Copy the link from your address bar.'; }
});
