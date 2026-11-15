const { addDays, mondayOf, dmy } = require('./dateTime');

const RANGES = {
  day: { label: '14 ngày gần nhất' },
  week: { label: '12 tuần gần nhất' },
  month: { label: '4 tháng gần nhất' }
};

// dailyRows: [{ day: 'YYYY-MM-DD', views: n }]  today: 'YYYY-MM-DD'
// Trả về { from, to, buckets: [{ label, value }], total } — các mốc trống vẫn có mặt với value 0.
function buildSeries(dailyRows, range, today) {
  const sums = new Map();
  for (const r of dailyRows) sums.set(r.day, (sums.get(r.day) || 0) + Number(r.views || 0));
  const buckets = [];

  if (range === 'week') {
    const thisMonday = mondayOf(today);
    for (let i = 11; i >= 0; i--) {
      const start = addDays(thisMonday, -7 * i);
      let value = 0;
      for (let k = 0; k < 7; k++) value += sums.get(addDays(start, k)) || 0;
      buckets.push({ label: dmy(start), start, value });
    }
  } else if (range === 'month') {
    const [ty, tm] = today.split('-').map(Number);
    for (let i = 3; i >= 0; i--) {
      const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
      const key = d.toISOString().slice(0, 7);
      let value = 0;
      for (const [day, v] of sums) if (day.startsWith(key)) value += v;
      buckets.push({ label: `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`, start: `${key}-01`, value });
    }
  } else {
    for (let i = 13; i >= 0; i--) {
      const day = addDays(today, -i);
      buckets.push({ label: dmy(day), start: day, value: sums.get(day) || 0 });
    }
  }
  return {
    from: buckets[0].start,
    to: today,
    buckets,
    total: buckets.reduce((s, b) => s + b.value, 0)
  };
}

module.exports = { RANGES, buildSeries };
