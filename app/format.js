// Formatting helpers and a small escape-first markdown renderer.
// Everything the API returns is text until it has been through esc().

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const ints = new Intl.NumberFormat('en-US');

export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? usdWhole.format(n) : usd.format(n);
}

export function count(value) {
  const n = Number(value);
  return Number.isFinite(n) ? ints.format(n) : '—';
}

export function day(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dayTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// leftText renders the time until an ISO deadline for [data-until] ticks.
export function leftText(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'closed';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return d + 'd ' + h + 'h left';
  if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm left';
  return m + 'm ' + String(sec).padStart(2, '0') + 's left';
}

export function takesEntries(bounty, now = Date.now()) {
  // A bounty past its deadline may still read "open" until results post,
  // so the deadline, not the status, says whether it still takes entries.
  return bounty.status === 'open' && new Date(bounty.deadline).getTime() > now;
}

// microPct turns the leaderboard's micro win rates (956066) into 95.6%.
export function microPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return (n / 10000).toFixed(1) + '%';
}

export function kiloBytes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n >= 1024 * 1024 ? (n / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
}

// inlineMd handles the inline half of markdown on already-escaped text:
// code spans, bold, italics and links whose target is an http(s) page.
function inlineMd(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

// markdown renders the small markdown subset bounty descriptions use:
// headings, paragraphs, bullet and numbered lists, quotes, code fences.
// The source is escaped first, so API text can never become markup.
export function markdown(source) {
  const lines = esc(source).split('\n');
  const out = [];
  let list = null;
  let fence = false;
  const closeList = () => { if (list) { out.push('</' + list + '>'); list = null; } };
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      closeList();
      out.push(fence ? '</code></pre>' : '<pre><code>');
      fence = !fence;
      continue;
    }
    if (fence) { out.push(line); continue; }
    const head = line.match(/^(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (head) {
      closeList();
      const level = Math.min(head[1].length + 1, 4);
      out.push('<h' + level + '>' + inlineMd(head[2]) + '</h' + level + '>');
    } else if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out.push('<' + kind + '>'); list = kind; }
      out.push('<li>' + inlineMd((bullet || numbered)[1]) + '</li>');
    } else if (line.trim() === '') {
      closeList();
    } else if (line.startsWith('&gt; ')) {
      closeList();
      out.push('<blockquote>' + inlineMd(line.slice(5)) + '</blockquote>');
    } else {
      closeList();
      out.push('<p>' + inlineMd(line) + '</p>');
    }
  }
  closeList();
  if (fence) out.push('</code></pre>');
  return out.join('\n');
}
