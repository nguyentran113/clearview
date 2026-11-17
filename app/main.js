// Clearview's router: hash routes for the board, a bounty, its leaderboard,
// a profile and an about page. One ticker drives every countdown on the
// page; views render from the API client's cache first and refresh in place.
import { get } from './api.js';
import { leftText, takesEntries } from './format.js';
import { aboutHtml, boardHtml, boardResultsHtml, bountyHtml, errorHtml, leaderboardHtml, profileHtml, statusHtml } from './views.js';

const main = document.getElementById('main');
const boardState = { q: '', sort: 'ending' };
let boardItems = null;
let routeToken = 0;

window.__shotReady = false;

// The skip link points at #main, which the router would read as a route;
// intercept it and move focus to <main> directly instead.
document.getElementById('skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView();
});

// One interval for the whole app: every countdown element carries its
// deadline in data-until and is re-rendered locally, with no refetching.
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll('[data-until]').forEach((el) => {
    const text = leftText(el.getAttribute('data-until'), now);
    const wrapped = el.textContent.startsWith('(') ? '(' + text + ')' : text;
    if (el.textContent !== wrapped) el.textContent = wrapped;
  });
}, 1000);

function render(html, title) {
  main.innerHTML = html;
  document.title = title;
  const heading = main.querySelector('h1');
  if (heading) heading.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function loading(title) {
  window.__shotReady = false;
  if (!main.querySelector('.card, table, .facts')) main.innerHTML = statusHtml('Loading…');
  document.title = title;
}

function parseRoute() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { parts, params: new URLSearchParams(query || '') };
}

function visibleBoard() {
  const q = boardState.q.trim().toLowerCase();
  let items = (boardItems || []).slice();
  if (q) {
    items = items.filter((b) =>
      [b.title, b.category, b.sponsor?.name, ...(b.skills || [])]
        .join(' ').toLowerCase().includes(q));
  }
  if (boardState.sort === 'pot') items.sort((a, b) => (b.potUsd || 0) - (a.potUsd || 0));
  else if (boardState.sort === 'entries') items.sort((a, b) => (b.submissionCount || 0) - (a.submissionCount || 0));
  else {
    // Ending soonest, but bounties that still take entries come first:
    // the API's "open" list can hold past-deadline bounties awaiting results.
    const rank = (b) => (takesEntries(b) ? 0 : 1);
    items.sort((a, b) => rank(a) - rank(b) || new Date(a.deadline) - new Date(b.deadline));
  }
  return items;
}

async function showBoard(token) {
  loading('Clearview — live bounties');
  try {
    const data = await get('/competitions?status=open&activity=times', (fresh) => {
      if (token !== routeToken) return;
      boardItems = fresh.items || [];
      render(boardHtml(visibleBoard(), boardState), 'Clearview — live bounties');
      wireBoard();
    });
    if (token !== routeToken) return;
    boardItems = data.items || [];
    render(boardHtml(visibleBoard(), boardState), 'Clearview — live bounties');
    wireBoard();
  } catch {
    if (token === routeToken) render(errorHtml('The live bounty list could not be loaded. Check your connection and try again.'), 'Clearview — error');
  }
}

function wireBoard() {
  const form = document.getElementById('board-controls');
  if (!form) return;
  form.addEventListener('submit', (event) => event.preventDefault());
  document.getElementById('board-q').addEventListener('input', (event) => {
    boardState.q = event.target.value;
    document.getElementById('board-results').innerHTML = boardResultsHtml(visibleBoard());
  });
  document.getElementById('board-sort').addEventListener('change', (event) => {
    boardState.sort = event.target.value;
    document.getElementById('board-results').innerHTML = boardResultsHtml(visibleBoard());
  });
}

async function showBounty(slug, token) {
  loading('Clearview — bounty');
  try {
    const [detail, subs] = await Promise.all([
      get('/competitions/' + encodeURIComponent(slug)),
      get('/competitions/' + encodeURIComponent(slug) + '/submissions?limit=8').catch(() => ({ items: [] })),
    ]);
    if (token !== routeToken) return;
    const c = detail.competition || detail;
    render(bountyHtml(c, subs.items || []), c.title + ' — Clearview');
  } catch {
    if (token === routeToken) render(errorHtml('That bounty could not be loaded. It may not exist, or the API is unreachable.'), 'Clearview — error');
  }
}

async function showLeaderboard(slug, params, token) {
  loading('Clearview — leaderboard');
  const view = params.get('view');
  const path = '/competitions/' + encodeURIComponent(slug) + '/leaderboard' + (view ? '?view=' + encodeURIComponent(view) : '');
  try {
    const payload = await get(path);
    if (token !== routeToken) return;
    render(leaderboardHtml(slug, payload), 'Leaderboard — ' + slug + ' — Clearview');
  } catch {
    if (token === routeToken) render(errorHtml('That leaderboard could not be loaded. The bounty may not exist, or the API is unreachable.'), 'Clearview — error');
  }
}

async function showProfile(handle, token) {
  loading('Clearview — profile');
  try {
    const data = await get('/profiles/' + encodeURIComponent(handle));
    if (token !== routeToken) return;
    const p = data.profile || data;
    render(profileHtml(p), '@' + p.handle + ' — Clearview');
  } catch {
    if (token === routeToken) render(errorHtml('That profile could not be loaded. The account may not exist, or the API is unreachable.'), 'Clearview — error');
  }
}

function route() {
  const token = ++routeToken;
  const { parts, params } = parseRoute();
  if (parts.length === 0) return showBoard(token);
  if (parts[0] === 'bounty' && parts[1]) return showBounty(parts[1], token);
  if (parts[0] === 'leaderboard' && parts[1]) return showLeaderboard(parts[1], params, token);
  if (parts[0] === 'u' && parts[1]) return showProfile(parts[1], token);
  if (parts[0] === 'about') { render(aboutHtml(), 'About — Clearview'); return; }
  render(errorHtml('That page does not exist in Clearview.'), 'Clearview — not found');
}

window.addEventListener('hashchange', route);
route();
