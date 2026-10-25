(() => {
  const { CATEGORIES, MAX_TOTAL, scorePeriod } = window.Scoring;
  const { fmtDay, fmtPoints: pts, periodNumber, config } = window.DB;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const colors = CATEGORIES.map((_, i) => `var(--c${i + 1})`);
  let data = null;

  if (config.storeName) $('store').textContent = config.storeName;

  $('legend').replaceChildren(...CATEGORIES.map((c, i) => {
    const s = el('span');
    const sw = el('i');
    sw.style.background = colors[i];
    s.append(sw, c.short);
    return s;
  }));

  const headRow = el('tr');
  headRow.append(el('th', 'l', '#'), el('th', 'l', 'Employee'), el('th', 'l hide-sm', 'Role'));
  const totalTh = el('th', null, 'Total');
  totalTh.append(el('span', 'max', `of ${MAX_TOTAL}`));
  headRow.append(totalTh, el('th', 'hide-sm'));
  CATEGORIES.forEach((c) => { const th = el('th', null, c.short); th.append(el('span', 'max', '/' + c.max)); headRow.append(th); });
  $('board-head').replaceChildren(headRow);

  function scoredFor(period) {
    const byId = new Map(data.employees.map((e) => [e.id, e]));
    const rows = data.scores
      .filter((s) => s.period_id === period.id && byId.has(s.employee_id))
      .map((s) => ({ ...s, employee: byId.get(s.employee_id) }));
    return scorePeriod(rows);
  }

  function render() {
    const periods = data.periods;
    if (!periods.length) {
      $('takeaway').textContent = 'No periods yet. An admin can start the first two-week period from the admin page.';
      $('period').replaceChildren();
      return;
    }
    const sel = $('period');
    if (!sel.options.length) {
      sel.replaceChildren(...periods.map((p) => new Option(`${fmtDay(p.start_date)} – ${fmtDay(p.end_date)}${p.status === 'final' ? '' : ' (in progress)'}`, p.id)));
      const hash = location.hash.slice(1);
      sel.value = periods.some((p) => p.id === hash) ? hash : periods[periods.length - 1].id;
    }
    const period = periods.find((p) => p.id === sel.value);
    const final = period.status === 'final';
    const num = periodNumber(period.start_date);
    const rows = scoredFor(period);
    const top = rows[0];
    const next = rows[1];

    // Tiles
    $('lead-label').textContent = final ? 'Best Employee' : 'Leading this period';
    const pill = $('t-status');
    pill.className = 'pill ' + (final ? 'final' : 'live');
    pill.textContent = final ? 'Final · certificate + $50' : `In progress · ends ${fmtDay(period.end_date)}`;
    $('t-leader').textContent = top ? (rows.filter((r) => r.rank === 1).length > 1 ? 'Tie' : top.employee.name) : '—';
    $('t-total').textContent = top ? pts(top.total) : '—';
    $('t-margin').textContent = next ? pts(top.total - next.total) : '—';
    $('t-runner').textContent = next ? `points ahead of ${next.employee.name}` : 'points';
    $('t-avg').textContent = rows.length ? pts(rows.reduce((t, r) => t + r.total, 0) / rows.length) : '—';
    $('t-reviews').textContent = rows.length ? rows.reduce((t, r) => t + (Number(r.google_reviews) || 0), 0).toLocaleString() : '—';

    // Category averages
    const cats = CATEGORIES.map((c) => {
      const avg = rows.length ? rows.reduce((t, r) => t + r.points[c.key], 0) / rows.length : 0;
      const best = rows.reduce((a, b) => (!a || b.points[c.key] > a.points[c.key] ? b : a), null);
      return { ...c, avg, share: avg / c.max, best };
    });
    const weakest = rows.length ? cats.reduce((a, b) => (b.share < a.share ? b : a)) : null;

    // Takeaway
    const tk = $('takeaway');
    if (!top) tk.textContent = `Period ${num.overall} (${fmtDay(period.start_date)} – ${fmtDay(period.end_date)}) has no scores yet.`;
    else {
      const b = (t) => el('b', null, t);
      const parts = [b(top.employee.name), final ? ' won period ' : ' leads period ', b(String(num.overall)), ' with ', b(pts(top.total)), ` of ${MAX_TOTAL} points`];
      if (next && next.total === top.total) parts.push(', tied with ', b(next.employee.name), '.');
      else if (next) parts.push(', ', b(pts(top.total - next.total)), ' ahead of ', b(next.employee.name), '.');
      else parts.push('.');
      if (weakest) parts.push(' The team’s weakest category is ', b(weakest.label.toLowerCase()), '.');
      tk.replaceChildren(...parts);
    }

    // Leaderboard
    $('board-empty').hidden = rows.length > 0;
    $('board').replaceChildren(...rows.map((r) => {
      const tr = el('tr', r.rank === 1 ? 'first' : '');
      const rank = el('td', 'l');
      rank.append(el('span', 'rank', String(r.rank)));
      const stack = el('div', 'stack');
      CATEGORIES.forEach((c, i) => {
        const seg = el('span');
        seg.style.width = (r.points[c.key] / MAX_TOTAL) * 100 + '%';
        seg.style.background = colors[i];
        seg.title = `${c.label}: ${pts(r.points[c.key])}`;
        stack.append(seg);
      });
      const bar = el('td', 'hide-sm');
      bar.append(stack);
      tr.append(rank, el('td', 'l', r.employee.name), el('td', 'l hide-sm', r.employee.role), el('td', 'total', pts(r.total)), bar,
        ...CATEGORIES.map((c) => el('td', null, pts(r.points[c.key]))));
      return tr;
    }));

    $('cats').replaceChildren(...cats.map((c) => {
      const tr = el('tr');
      const m = el('td');
      const wrap = el('div', 'meter');
      const track = el('span', 'track');
      const fill = el('span', 'fill' + (c === weakest ? ' low' : ''));
      fill.style.width = c.share * 100 + '%';
      track.append(fill);
      wrap.append(el('span', null, Math.round(c.share * 100) + '%'), track);
      m.append(wrap);
      tr.append(el('td', 'l', c.label), el('td', null, `${pts(c.avg)} / ${c.max}`), m,
        el('td', 'l', c.best && c.best.points[c.key] > 0 ? c.best.employee.name : '—'),
        el('td', null, c.best ? pts(c.best.points[c.key]) : '—'));
      return tr;
    }));

    // Certificates in this period's 6-month cycle (ties share a certificate).
    const per = config.periodsPerCycle || 13;
    $('cycle-note').textContent = `This is period ${num.inCycle} of ${per} in the current 6-month race.`;
    const wins = new Map();
    periods
      .filter((p) => p.status === 'final' && periodNumber(p.start_date).cycle === num.cycle)
      .forEach((p) => scoredFor(p).filter((r) => r.rank === 1).forEach((r) => {
        wins.set(r.employee.name, (wins.get(r.employee.name) || 0) + 1);
      }));
    const certRows = [...wins].sort((a, b) => b[1] - a[1]);
    $('cert-empty').hidden = certRows.length > 0;
    $('cert-table').hidden = certRows.length === 0;
    $('certs').replaceChildren(...certRows.map(([name, n], i) => {
      const tr = el('tr', i === 0 ? 'first' : '');
      tr.append(el('td', 'l', name), el('td', null, String(n)));
      return tr;
    }));
  }

  $('period').addEventListener('change', () => { history.replaceState(null, '', '#' + $('period').value); render(); });

  window.DB.loadAll()
    .then((d) => {
      data = d;
      if (d.sample) {
        const b = $('banner');
        b.hidden = false;
        b.innerHTML = '<b>Sample data.</b> These names and scores are examples. Connect your Supabase project in <code>config.js</code> to show real scores (see README).';
      }
      render();
    })
    .catch((err) => {
      $('takeaway').textContent = '';
      $('takeaway').append(el('span', 'error', `Couldn’t load scores: ${err.message}. Check the Supabase settings in config.js.`));
    });
})();
