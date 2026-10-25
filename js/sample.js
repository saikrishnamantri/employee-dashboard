// Example data shown only until Supabase is connected in config.js.
window.SAMPLE_DATA = (() => {
  const people = [
    ['Maya', 'Crew', 18, 14, 23, 5, 15, 13, 2],
    ['Daniel', 'Crew', 16, 12, 14, 2, 13, 14, 1],
    ['Priya', 'Shift lead', 19, 13, 18, 4, 14, 11, 4],
    ['Jordan', 'Crew', 14, 15, 9, 1, 12, 9, 6],
    ['Sofia', 'Crew', 17, 10, 21, 3, 11, 12, 3],
    ['Liam', 'Crew', 12, 11, 6, 0, 14, 8, 8],
    ['Aisha', 'Shift lead', 15, 14, 12, 2, 15, 10, 5],
    ['Ethan', 'Crew', 13, 9, 4, 1, 10, 13, 11],
    ['Noah', 'Crew', 11, 13, 7, 0, 12, 6, 9],
    ['Grace', 'Crew', 16, 12, 15, 2, 13, 11, 7],
  ];
  const employees = people.map(([name, role], i) => ({ id: 'e' + i, name, role, active: true }));
  const periods = [{ id: 'p1', start_date: '2026-10-19', end_date: '2026-11-01', status: 'in_progress' }];
  const scores = people.map(([, , cs, cl, gr, tv, un, up, qr], i) => ({
    period_id: 'p1', employee_id: 'e' + i,
    customer_service: cs, cleaning: cl, google_reviews: gr, teamwork_votes: tv,
    uniform: un, upselling: up, quiz_rank: qr,
  }));
  return { employees, periods, scores };
})();
