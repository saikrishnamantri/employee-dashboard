// Turns raw inputs (manager scores, review count, votes, quiz rank) into points.
// Change the rules here and the scoreboard and admin page both follow.
window.Scoring = (() => {
  const CATEGORIES = [
    { key: 'customer_service', label: 'Customer service', short: 'Service', max: 20 },
    { key: 'cleaning', label: 'Cleaning duties', short: 'Cleaning', max: 15 },
    { key: 'reviews', label: 'Google reviews', short: 'Reviews', max: 10 },
    { key: 'teamwork', label: 'Teamwork', short: 'Teamwork', max: 15 },
    { key: 'uniform', label: 'Uniform, hygiene & meals', short: 'Uniform', max: 15 },
    { key: 'upselling', label: 'Upselling', short: 'Upsell', max: 15 },
    { key: 'quiz', label: 'Online quiz', short: 'Quiz', max: 10 },
  ];
  const MAX_TOTAL = CATEGORIES.reduce((t, c) => t + c.max, 0); // 100
  const REVIEW_TARGET = 20; // reviews needed for full points

  const num = (x) => (x === null || x === undefined || x === '' ? 0 : Number(x) || 0);
  const clamp = (x, max) => Math.max(0, Math.min(num(x), max));
  const round1 = (x) => Math.round(x * 10) / 10;

  // Rank 1–3: 10, rank 4: 9, rank 5: 8, rank 6–10: 5, others: 0.
  function quizPoints(rank) {
    const r = num(rank);
    if (!r) return 0;
    if (r <= 3) return 10;
    if (r === 4) return 9;
    if (r === 5) return 8;
    if (r <= 10) return 5;
    return 0;
  }

  // rows: raw score rows for ONE period. Returns rows with .points, .total, .rank.
  function scorePeriod(rows) {
    const topVotes = Math.max(0, ...rows.map((r) => num(r.teamwork_votes)));
    const scored = rows.map((r) => {
      const points = {
        customer_service: clamp(r.customer_service, 20),
        cleaning: clamp(r.cleaning, 15),
        reviews: round1(Math.min(num(r.google_reviews) / REVIEW_TARGET, 1) * 10),
        teamwork: topVotes ? round1((num(r.teamwork_votes) / topVotes) * 15) : 0,
        uniform: clamp(r.uniform, 15),
        upselling: clamp(r.upselling, 15),
        quiz: quizPoints(r.quiz_rank),
      };
      const total = round1(CATEGORIES.reduce((t, c) => t + points[c.key], 0));
      return { ...r, points, total };
    });
    scored.forEach((a) => { a.rank = 1 + scored.filter((b) => b.total > a.total).length; });
    return scored.sort((a, b) => a.rank - b.rank);
  }

  return { CATEGORIES, MAX_TOTAL, REVIEW_TARGET, quizPoints, scorePeriod };
})();
