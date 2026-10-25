(() => {
  const { scorePeriod } = window.Scoring;
  const { client, configured, config, addDays, fmtDay, fmtPoints: pts, weekLabel, announceDate, periodTitle } = window.DB;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  // Raw input columns, in table order.
  const FIELDS = [
    { key: 'customer_service', min: 0, max: 20, step: 0.5 },
    { key: 'cleaning', min: 0, max: 15, step: 0.5 },
    { key: 'google_reviews', min: 0, step: 1 },
    { key: 'teamwork_votes', min: 0, step: 1 },
    { key: 'uniform', min: 0, max: 15, step: 0.5 },
    { key: 'upselling', min: 0, max: 15, step: 0.5 },
    { key: 'quiz_rank', min: 1, step: 1 },
  ];

  let preview = false;
  let user = null;
  let data = { employees: [], periods: [], scores: [] };
  let periodId = null;
  let draft = new Map(); // employee_id -> raw row being edited
  let dirty = false;

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, 3000);
  }

  function setDirty(v) {
    dirty = v;
    $('dirty').hidden = !v;
    $('save-btn').disabled = !v;
  }

  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- Sign-in ----------
  function showLogin(message) {
    $('admin-view').hidden = true;
    $('login-view').hidden = false;
    $('setup').hidden = configured;
    $('login-form').hidden = !configured;
    const err = $('login-error');
    err.hidden = !message;
    err.textContent = message || '';
  }

  async function enter(sessionUser) {
    const { data: row, error } = await client.from('admins').select('user_id').eq('user_id', sessionUser.id).maybeSingle();
    if (error || !row) {
      await client.auth.signOut();
      showLogin(error ? `Couldn’t check admin access: ${error.message}` : 'This account isn’t an admin. Ask the owner to add you.');
      return;
    }
    user = sessionUser;
    $('who').textContent = user.email;
    await openWorkspace();
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('login-btn');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    const { data: res, error } = await client.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
    btn.disabled = false;
    btn.textContent = 'Sign in';
    if (error) return showLogin(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
    await enter(res.user);
  });

  $('preview-btn').addEventListener('click', () => {
    preview = true;
    $('who').textContent = 'preview';
    $('preview-banner').hidden = false;
    openWorkspace();
  });

  $('logout-btn').addEventListener('click', async () => {
    if (dirty && !window.confirm('You have unsaved scores. Sign out anyway?')) return;
    setDirty(false);
    if (client && !preview) await client.auth.signOut();
    preview = false;
    $('preview-banner').hidden = true;
    showLogin();
  });

  // ---------- Data ----------
  async function reload() {
    data = preview ? structuredClone(window.SAMPLE_DATA) : await window.DB.loadAll();
  }

  async function openWorkspace() {
    $('login-view').hidden = true;
    $('admin-view').hidden = false;
    try {
      await reload();
    } catch (err) {
      toast(`Couldn’t load data: ${err.message}`);
      return;
    }
    periodId = data.periods.length ? data.periods[data.periods.length - 1].id : null;
    renderAll();
  }

  const currentPeriod = () => data.periods.find((p) => p.id === periodId) || null;

  function loadDraft() {
    draft = new Map();
    data.scores.filter((s) => s.period_id === periodId).forEach((s) => draft.set(s.employee_id, { ...s }));
    setDirty(false);
  }

  // ---------- Periods ----------
  function renderPeriods() {
    const sel = $('period');
    sel.replaceChildren(...data.periods.map((p) => new Option(periodTitle(p), p.id)));
    const p = currentPeriod();
    const final = p && p.status === 'final';
    if (p) sel.value = p.id;
    sel.disabled = !p;
    $('period-status').hidden = !p;
    $('period-status').className = 'pill ' + (final ? 'final' : 'live');
    $('period-status').textContent = final ? 'Final' : 'In progress';
    $('final-btn').hidden = !p;
    $('final-btn').textContent = final ? 'Reopen period' : 'Mark final';
    const last = data.periods[data.periods.length - 1];
    const nextStart = last ? addDays(last.end_date, 1) : config.programStart;
    $('new-period-btn').textContent = `Start ${weekLabel(nextStart)} (${fmtDay(nextStart)} – ${fmtDay(addDays(nextStart, 13))})`;
    $('period-help').textContent = !p
      ? 'Start the first two-week period to begin entering scores.'
      : final
        ? 'This period is final: the winner has their certificate. Reopen it only to correct a mistake.'
        : `Scoring ends ${fmtDay(p.end_date)}. Mark the period final once every score is in, before the announcement on ${fmtDay(announceDate(p.end_date))}.`;
  }

  $('period').addEventListener('change', () => {
    if (dirty && !window.confirm('You have unsaved scores for this period. Switch anyway?')) {
      $('period').value = periodId;
      return;
    }
    periodId = $('period').value;
    renderAll();
  });

  $('new-period-btn').addEventListener('click', async () => {
    if (dirty) return toast('Save your scores first.');
    const last = data.periods[data.periods.length - 1];
    const start = last ? addDays(last.end_date, 1) : config.programStart;
    const row = { start_date: start, end_date: addDays(start, 13), status: 'in_progress' };
    if (preview) {
      data.periods.push({ ...row, id: 'p' + (data.periods.length + 1) });
    } else {
      const { error } = await client.from('periods').insert(row);
      if (error) return toast(`Couldn’t start the period: ${error.message}`);
      await reload();
    }
    periodId = data.periods[data.periods.length - 1].id;
    renderAll();
    toast(`Started ${periodTitle(row)}`);
  });

  $('final-btn').addEventListener('click', async () => {
    const p = currentPeriod();
    if (!p) return;
    if (dirty) return toast('Save your scores first.');
    const status = p.status === 'final' ? 'in_progress' : 'final';
    if (status === 'final') {
      const leader = scoredRows()[0];
      const msg = leader ? `Mark this period final? ${leader.employee.name} will be Best Employee with ${pts(leader.total)} points.` : 'Mark this period final?';
      if (!window.confirm(msg)) return;
    }
    if (preview) p.status = status;
    else {
      const { error } = await client.from('periods').update({ status }).eq('id', p.id);
      if (error) return toast(`Couldn’t update the period: ${error.message}`);
      await reload();
    }
    renderAll();
    toast(status === 'final' ? 'Period marked final' : 'Period reopened');
  });

  // ---------- Score entry ----------
  function entryEmployees() {
    // Active people, plus anyone inactive who already has scores this period.
    return data.employees
      .filter((e) => e.active || draft.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function scoredRows() {
    const byId = new Map(data.employees.map((e) => [e.id, e]));
    return scorePeriod([...draft.values()].filter((r) => byId.has(r.employee_id)).map((r) => ({ ...r, employee: byId.get(r.employee_id) })));
  }

  function updateTotals() {
    const scored = new Map(scoredRows().map((r) => [r.employee_id, r]));
    document.querySelectorAll('#entry tr').forEach((tr) => {
      const r = scored.get(tr.dataset.id);
      tr.querySelector('.total').textContent = r ? pts(r.total) : '—';
      tr.querySelector('.rk').textContent = r ? '#' + r.rank : '—';
    });
  }

  function renderEntry() {
    const p = currentPeriod();
    const locked = !p || p.status === 'final';
    const people = entryEmployees();
    $('entry-card').hidden = !p;
    $('entry-empty').hidden = people.length > 0;
    $('entry').replaceChildren(...people.map((emp) => {
      const tr = el('tr');
      tr.dataset.id = emp.id;
      const who = el('td', 'l who', emp.name);
      who.append(el('span', 'role', emp.role + (emp.active ? '' : ' · inactive')));
      tr.append(who);
      FIELDS.forEach((f) => {
        const td = el('td');
        const input = el('input');
        input.type = 'number';
        input.id = `in-${emp.id}-${f.key}`;
        input.min = f.min;
        if (f.max !== undefined) input.max = f.max;
        input.step = f.step;
        input.inputMode = f.step === 1 ? 'numeric' : 'decimal';
        input.disabled = locked;
        input.setAttribute('aria-label', `${emp.name} ${f.key.replace('_', ' ')}`);
        const v = draft.get(emp.id)?.[f.key];
        input.value = v === null || v === undefined ? '' : v;
        input.addEventListener('input', () => {
          const row = draft.get(emp.id) || { period_id: periodId, employee_id: emp.id };
          row[f.key] = input.value === '' ? null : Number(input.value);
          draft.set(emp.id, row);
          setDirty(true);
          updateTotals();
        });
        td.append(input);
        tr.append(td);
      });
      tr.append(el('td', 'total', '—'), el('td', 'rk', '—'));
      return tr;
    }));
    updateTotals();
  }

  $('save-btn').addEventListener('click', async () => {
    const invalid = document.querySelector('#entry input:invalid');
    if (invalid) {
      invalid.focus();
      return toast('One score is outside its allowed range. Fix the box outlined in red.');
    }
    const rows = [...draft.values()].map((r) => {
      const out = { period_id: periodId, employee_id: r.employee_id, updated_at: new Date().toISOString() };
      FIELDS.forEach((f) => { out[f.key] = r[f.key] === undefined ? null : r[f.key]; });
      if (user) out.updated_by = user.id;
      return out;
    });
    if (!preview) {
      const btn = $('save-btn');
      btn.disabled = true;
      btn.textContent = 'Saving…';
      const { error } = await client.from('scores').upsert(rows, { onConflict: 'period_id,employee_id' });
      btn.textContent = 'Save scores';
      if (error) { btn.disabled = false; return toast(`Couldn’t save: ${error.message}`); }
      await reload();
    } else {
      data.scores = data.scores.filter((s) => s.period_id !== periodId).concat(rows);
    }
    loadDraft();
    renderEntry();
    toast(`Saved scores for ${rows.length} employee${rows.length === 1 ? '' : 's'}`);
  });

  // ---------- Employees ----------
  function renderPeople() {
    const list = [...data.employees].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
    $('people').replaceChildren(...list.map((emp) => {
      const row = el('div', 'person' + (emp.active ? '' : ' off'));
      const name = el('span', null, emp.name);
      name.append(el('span', 'role', emp.role));
      const btn = el('button', null, emp.active ? 'Turn off' : 'Turn on');
      btn.type = 'button';
      btn.addEventListener('click', async () => {
        if (preview) emp.active = !emp.active;
        else {
          const { error } = await client.from('employees').update({ active: !emp.active }).eq('id', emp.id);
          if (error) return toast(`Couldn’t update ${emp.name}: ${error.message}`);
          await reload();
        }
        renderPeople();
        if (!dirty) renderEntry();
      });
      row.append(name, btn);
      return row;
    }));
  }

  $('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('new-name').value.trim();
    const role = $('new-role').value.trim() || 'Crew';
    if (!name) return;
    if (preview) data.employees.push({ id: 'e' + Date.now(), name, role, active: true });
    else {
      const { error } = await client.from('employees').insert({ name, role });
      if (error) return toast(`Couldn’t add ${name}: ${error.message}`);
      const keep = new Map(draft);
      await reload();
      draft = keep;
    }
    $('new-name').value = '';
    $('new-role').value = '';
    renderPeople();
    renderEntry();
    toast(`Added ${name}`);
  });

  function renderAll() {
    loadDraft();
    renderPeriods();
    renderEntry();
    renderPeople();
  }

  // ---------- Start ----------
  if (!configured) showLogin();
  else {
    client.auth.getSession().then(({ data: s }) => (s.session ? enter(s.session.user) : showLogin()));
  }
})();
