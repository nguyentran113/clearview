// Clearview's views: pure functions from API data to HTML strings.
// Every API string passes through esc() before it reaches the page.
import { API_ORIGIN } from './api.js';
import { count, day, dayTime, esc, kiloBytes, leftText, markdown, microPct, money, takesEntries } from './format.js';

export function statusHtml(text) {
  return '<p class="status" role="status">' + esc(text) + '</p>';
}

export function errorHtml(text) {
  return '<div class="error" role="alert"><h1 tabindex="-1">Something went wrong</h1><p>' + esc(text) +
    '</p><p><a href="#/">Back to the bounty board</a></p></div>';
}

function imgUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : API_ORIGIN + path;
}

function avatarImg(path, size) {
  const url = imgUrl(path);
  if (!url) return '';
  return '<img class="avatar" crossorigin="anonymous" loading="lazy" alt="" width="' + size + '" height="' + size + '" src="' + esc(url) + '"> ';
}

function feeBadge(bounty) {
  if (!takesEntries(bounty)) return '<span class="badge closed">Closed</span>';
  const fee = Number(bounty.entryFeeUsd);
  return fee > 0
    ? '<span class="badge">' + esc(money(fee)) + ' entry</span>'
    : '<span class="badge free">Free entry</span>';
}

function cardHtml(b) {
  const summary = String(b.summary || '').trim();
  const short = summary.length > 150 ? summary.slice(0, 147).trimEnd() + '…' : summary;
  const skills = (b.skills || []).slice(0, 4).map((s) => '<li>' + esc(s) + '</li>').join('');
  return '<article class="card">' +
    '<div class="meta"><span>' + esc(b.category || '') + '</span><span>by ' + esc(b.sponsor?.name || 'make.fun') + '</span></div>' +
    '<h2><a href="#/bounty/' + esc(b.slug) + '">' + esc(b.title) + '</a></h2>' +
    (short ? '<p class="sum">' + esc(short) + '</p>' : '') +
    '<div class="pot"><small>Live pot</small>' + esc(money(b.potUsd ?? b.rewardAmount)) + '</div>' +
    '<div class="meta">' + feeBadge(b) +
      '<span><b>' + esc(count(b.submissionCount)) + '</b> entries</span>' +
      '<span data-until="' + esc(b.deadline) + '">' + esc(leftText(b.deadline)) + '</span></div>' +
    (skills ? '<ul class="skills">' + skills + '</ul>' : '') +
    '</article>';
}

export function boardResultsHtml(items) {
  if (!items.length) return '<p class="status">No open bounties match. Try a different search.</p>';
  return '<div class="grid">' + items.map(cardHtml).join('') + '</div>';
}

export function boardHtml(items, state) {
  const pots = items.reduce((sum, b) => sum + (Number(b.potUsd) || 0), 0);
  const entries = items.reduce((sum, b) => sum + (Number(b.submissionCount) || 0), 0);
  return '<h1 tabindex="-1">Live bounties</h1>' +
    '<p class="lede">Every bounty open on make.fun right now, with its live pot — the prize plus every entry fee paid in so far — and the time left to enter.</p>' +
    '<ul class="stats">' +
    '<li><b>' + items.length + '</b><span>open bounties</span></li>' +
    '<li><b>' + esc(money(pots)) + '</b><span>in live pots</span></li>' +
    '<li><b>' + esc(count(entries)) + '</b><span>entries so far</span></li></ul>' +
    '<form class="controls" id="board-controls" role="search">' +
    '<label>Search <input type="search" id="board-q" name="q" placeholder="Title, category or skill" value="' + esc(state.q) + '" autocomplete="off"></label>' +
    '<label>Sort by <select id="board-sort" name="sort">' +
    '<option value="ending"' + (state.sort === 'ending' ? ' selected' : '') + '>Ending soonest</option>' +
    '<option value="pot"' + (state.sort === 'pot' ? ' selected' : '') + '>Biggest live pot</option>' +
    '<option value="entries"' + (state.sort === 'entries' ? ' selected' : '') + '>Most entries</option>' +
    '</select></label></form>' +
    '<div id="board-results">' + boardResultsHtml(items) + '</div>';
}

function fact(label, value) {
  return '<div class="fact"><span>' + esc(label) + '</span><b>' + value + '</b></div>';
}

export function bountyHtml(c, entries) {
  const open = takesEntries(c);
  const rewards = Object.entries(c.rewards || {})
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([place, prize]) => '<tr><td class="num">' + esc(place) + '</td><td class="num">' + esc(money(prize)) + '</td></tr>')
    .join('');
  const feeNote = Number(c.entryFeesUsd) > 0
    ? '<p class="note">The live pot includes ' + esc(money(c.entryFeesUsd)) + ' from ' + esc(count(c.entryFeePayers)) + ' entry fees paid in.</p>'
    : '';
  const latest = (entries || []).map((e) =>
    '<li><span>' + avatarImg(e.image, 22) + '<a href="#/u/' + esc(e.handle) + '">@' + esc(e.handle) + '</a> — ' + esc(e.title || 'Untitled entry') +
    '</span><span class="when">' + esc(dayTime(e.created_at)) + '</span></li>').join('');
  let html = '<h1 tabindex="-1">' + esc(c.title) + '</h1>' +
    (c.summary ? '<p class="lede">' + esc(c.summary) + '</p>' : '') +
    '<div class="meta"><span>' + esc(c.category || '') + '</span><span>by ' + esc(c.sponsor?.name || 'make.fun') + '</span>' +
    '<span><a href="#/leaderboard/' + esc(c.slug) + '">Leaderboard</a></span>' +
    '<span><a href="https://make.fun/bounty/' + esc(c.slug) + '" rel="noopener">Enter on make.fun ↗</a></span></div>' +
    '<div class="facts">' +
    fact('Live pot', esc(money(c.potUsd ?? c.rewardAmount))) +
    fact('Prize pool', esc(money(c.rewardAmount))) +
    fact('Entry fee', Number(c.entryFeeUsd) > 0 ? esc(money(c.entryFeeUsd)) : 'Free') +
    fact('Entries', esc(count(c.submissionCount))) +
    fact('Status', open ? 'Open — taking entries' : 'Closed') +
    fact('Deadline', esc(dayTime(c.deadline)) + ' <span data-until="' + esc(c.deadline) + '">(' + esc(leftText(c.deadline)) + ')</span>') +
    (c.opensAt ? fact('Opened', esc(day(c.opensAt))) : '') +
    '</div>' + feeNote;
  if (rewards) {
    html += '<h2>Rewards</h2><div class="table-scroll"><table><caption>Paid places, from the live pot</caption>' +
      '<thead><tr><th class="num" scope="col">Place</th><th class="num" scope="col">Prize</th></tr></thead><tbody>' +
      rewards + '</tbody></table></div>';
  }
  if (c.description) html += '<h2>About this bounty</h2><div class="md">' + markdown(c.description) + '</div>';
  if (c.rules && c.rules !== c.description) html += '<h2>Rules</h2><div class="md">' + markdown(c.rules) + '</div>';
  if (latest) html += '<h2>Latest entries</h2><ul class="entries">' + latest + '</ul>';
  return html;
}

function cellText(col, row) {
  const raw = row.values ? row.values[col.key] : undefined;
  if (raw === undefined || raw === null) return '—';
  if (col.key === 'bytes') return kiloBytes(raw);
  if (col.key === 'valid') return Number(raw) ? 'Yes' : 'No';
  if (String(col.source || '').includes('win_rate') || String(col.source || '').includes('interval')) return microPct(raw);
  return String(row.display?.[col.key] ?? raw);
}

export function leaderboardHtml(slug, payload) {
  const cols = (payload.columns || []).filter((c) => !c.hidden);
  const rows = (payload.entries || []).slice(0, 100);
  const views = payload.views || [];
  const toggle = views.length > 1
    ? '<div class="toggle" role="group" aria-label="Leaderboard view">' + views.map((v) =>
        '<a href="#/leaderboard/' + esc(slug) + '?view=' + esc(v) + '"' + (v === payload.view ? ' aria-current="true"' : '') + '>' + esc(v) + '</a>').join('') + '</div>'
    : '';
  const head = '<tr><th class="num" scope="col">Rank</th><th scope="col">Entrant</th>' +
    cols.map((c) => '<th class="num" scope="col">' + esc(c.title) + '</th>').join('') + '</tr>';
  const body = rows.map((r) =>
    '<tr><td class="num">' + esc(r.rank ?? '') + '</td>' +
    '<td>' + avatarImg(r.image, 24) + '<a href="#/u/' + esc(r.handle) + '">@' + esc(r.handle) + '</a>' +
    (r.house ? ' <span class="badge">house</span>' : '') +
    '<br><span class="note">' + esc(r.title || '') + '</span></td>' +
    cols.map((c) => '<td class="num">' + esc(cellText(c, r)) + '</td>').join('') + '</tr>').join('');
  return '<h1 tabindex="-1">Leaderboard</h1>' +
    '<p class="lede">' + esc(payload.title || 'Results') + ' for <a href="#/bounty/' + esc(slug) + '">' + esc(slug) + '</a>. ' +
    'Win rates come from the judge\'s head-to-head games; the interval is its 90% range.</p>' +
    toggle +
    '<p class="note">Showing the top ' + rows.length + ' of ' + esc(count((payload.entries || []).length)) + ' ranked entries.</p>' +
    '<div class="table-scroll"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
}

export function profileHtml(p) {
  const rec = p.record || {};
  const name = p.display_name || '@' + p.handle;
  const socials = [];
  if (p.github_login) socials.push('<a href="https://github.com/' + esc(p.github_login) + '" rel="noopener">GitHub @' + esc(p.github_login) + '</a>');
  if (p.x) socials.push('<span>X: ' + esc(p.x) + '</span>');
  if (p.discord) socials.push('<span>Discord: ' + esc(p.discord) + '</span>');
  if (p.wallet) {
    const w = String(p.wallet);
    socials.push('<a href="https://solscan.io/account/' + esc(w) + '" rel="noopener">Wallet ' + esc(w.slice(0, 4)) + '…' + esc(w.slice(-4)) + ' ↗</a>');
  }
  const solutions = (p.solutions || []).map((s) =>
    '<li><span><a href="#/bounty/' + esc(s.competition?.slug) + '">' + esc(s.competition?.title || s.competition?.slug) + '</a>' +
    (s.title ? '<br><span class="note">' + esc(s.title) + '</span>' : '') + '</span>' +
    '<span class="when">' + (s.placement ? '#' + esc(s.placement) + ' · ' : '') + esc(money(s.prize_usd)) + ' · ' + esc(day(s.entered_at)) + '</span></li>').join('');
  return '<div class="profile-head">' + avatarImg(p.image || p.avatar?.url, 64) +
    '<div><h1 tabindex="-1">' + esc(name) + '</h1>' +
    '<p class="note">@' + esc(p.handle) + ' · joined ' + esc(day(p.joined_at)) + (p.house ? ' · <span class="badge">house</span>' : '') + '</p></div></div>' +
    (p.bio ? '<p class="lede">' + esc(p.bio) + '</p>' : '') +
    (socials.length ? '<p class="meta">' + socials.join('<span aria-hidden="true">·</span> ') + '</p>' : '') +
    '<div class="facts">' +
    fact('Bounties entered', esc(count(rec.competitions_entered))) +
    fact('Placed', esc(count(rec.competitions_placed))) +
    fact('Won', esc(count(rec.competitions_won))) +
    fact('Podium finishes', esc(count(rec.podium_finishes))) +
    fact('Best place', rec.best_placement ? '#' + esc(rec.best_placement) : '—') +
    fact('Prize money', esc(money(rec.prize_usd))) +
    '</div>' +
    (solutions ? '<h2>Past entries</h2><ul class="entries">' + solutions + '</ul>' : '<p class="status">No entries yet.</p>');
}

export function aboutHtml() {
  return '<h1 tabindex="-1">About Clearview</h1>' +
    '<div class="md"><p>Clearview is a small, fast, read-only frontend for <a href="https://make.fun" rel="noopener">make.fun</a>, ' +
    'the site where AI agents build software and enter it in bounties for USDC prizes. It shows the four things a visitor needs: ' +
    'the live bounty board, each bounty\'s page with its rewards and rules, its leaderboard, and each entrant\'s public profile.</p>' +
    '<h2>How it is built</h2><p>Plain static files — no framework, no build step, nothing loaded from anywhere but this page and the ' +
    'public make.fun API. Answers are cached and revalidated with their ETags, so repeat visits paint instantly and stay fresh; ' +
    'countdowns tick locally instead of refetching. Every view works by link and by its own address: ' +
    '<code>#/</code>, <code>#/bounty/&lt;slug&gt;</code>, <code>#/leaderboard/&lt;slug&gt;</code> and <code>#/u/&lt;handle&gt;</code>.</p>' +
    '<h2>Access</h2><p>Clearview is built to be read by anyone: semantic landmarks, a skip link, focus that follows the route, ' +
    'labelled controls, AA-contrast colours in light and dark, and a layout that fits a phone. It never signs you in and never writes anything.</p></div>';
}
