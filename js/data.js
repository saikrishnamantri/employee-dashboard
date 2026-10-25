// Connects to Supabase, or falls back to sample data when config.js is empty.
window.DB = (() => {
  const config = window.APP_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const client = configured ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;

  async function loadAll() {
    if (!client) return { ...window.SAMPLE_DATA, sample: true };
    const [employees, periods, scores] = await Promise.all([
      client.from('employees').select('*').order('name'),
      client.from('periods').select('*').order('start_date'),
      client.from('scores').select('*'),
    ]);
    const failed = [employees, periods, scores].find((r) => r.error);
    if (failed) throw failed.error;
    return { employees: employees.data, periods: periods.data, scores: scores.data, sample: false };
  }

  const addDays = (iso, n) => {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const fmtDay = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const fmtPoints = (x) => (Math.round(x * 10) / 10).toString();

  // Which period of the program a period is (1-based), and which 6-month cycle.
  function periodNumber(startDate) {
    const start = Date.parse((config.programStart || startDate) + 'T00:00:00Z');
    const n = Math.floor((Date.parse(startDate + 'T00:00:00Z') - start) / (14 * 864e5));
    const per = config.periodsPerCycle || 13;
    return { overall: n + 1, inCycle: (((n % per) + per) % per) + 1, cycle: Math.floor(n / per) };
  }

  // "Week 3–4" for the second period of the program.
  function weekLabel(startDate) {
    const n = periodNumber(startDate).overall;
    return `Week ${2 * n - 1}\u2013${2 * n}`;
  }

  // The day the Best Employee is announced, e.g. the Tuesday after a period ends.
  const announceDate = (endDate) => addDays(endDate, config.announceAfterDays ?? 2);

  const periodTitle = (p) => `${weekLabel(p.start_date)} · ${fmtDay(p.start_date)} – ${fmtDay(p.end_date)}`;

  return { client, configured, config, loadAll, addDays, fmtDay, fmtPoints, periodNumber, weekLabel, announceDate, periodTitle };
})();
