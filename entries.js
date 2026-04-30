document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('entriesList');
  const res = await fetch('/api/log');
  let log = await res.json();

  const getWeekBounds = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const sun = new Date(d);
    sun.setDate(d.getDate() - day);
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    return { sun, sat, key: sun.getTime() };
  };

  const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const groupByWeek = (items) => {
    const weekMap = new Map();
    items.forEach(({ entry, i }) => {
      const { sun, sat, key } = getWeekBounds(entry.date);
      if (!weekMap.has(key)) weekMap.set(key, { sun, sat, entries: [] });
      weekMap.get(key).entries.push({ entry, i });
    });
    return Array.from(weekMap.entries()).sort((a, b) => b[0] - a[0]);
  };

  const currentQuery = () => document.getElementById('entrySearch').value.trim().toLowerCase();

  const render = (query = '') => {
    const items = log
      .map((entry, i) => ({ entry, i }))
      .filter(({ entry }) => !query ||
        entry.make.toLowerCase().includes(query) ||
        entry.model.toLowerCase().includes(query) ||
        entry.year.toString().includes(query) ||
        entry.plate.toLowerCase().includes(query));

    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<li class="no-entries">No entries yet.</li>';
      return;
    }

    groupByWeek(items).forEach(([, { sun, sat, entries }]) => {
      const header = document.createElement('li');
      header.className = 'week-header';
      header.textContent = `Sun ${fmtDate(sun)}  —  Sat ${fmtDate(sat)}`;
      list.appendChild(header);

      entries.forEach(({ entry, i }) => {
        const li = document.createElement('li');
        li.className = 'entry-item';
        li.dataset.index = i;
        li.innerHTML = `
          <input type="checkbox" class="entry-checkbox" data-index="${i}" />
          <img src="${entry.imageUrl || ''}" class="vehicle-image" />
          <strong>${entry.make} ${entry.model} (${entry.year}) — Plate # ${entry.plate}</strong>
          <span class="entry-date">${entry.date}</span>
          ${entry.loggedBy ? `<span class="entry-logged-by">Logged by: ${entry.loggedBy}</span>` : ''}
          <ul class="entry-items">
            ${entry.items.map(item => `<li>${item.type} — $${item.cost.toFixed(2)}</li>`).join('')}
          </ul>
          <span class="entry-total">Total: ${entry.total}</span>
        `;
        list.appendChild(li);
      });
    });
  };

  render();

  document.getElementById('entrySearch').addEventListener('input', (e) => {
    render(e.target.value.trim().toLowerCase());
  });

  document.getElementById('removeSelectedBtn').addEventListener('click', async () => {
    const checked = Array.from(list.querySelectorAll('.entry-checkbox:checked'))
      .map(cb => parseInt(cb.dataset.index));
    if (!checked.length) return;
    if (!confirm(`Remove ${checked.length} selected entr${checked.length > 1 ? 'ies' : 'y'}?`)) return;
    log = log.filter((_, i) => !checked.includes(i));
    await fetch('/api/log', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
    render(currentQuery());
  });

  document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!log.length) return;
    const allItems = log.map((entry, i) => ({ entry, i }));
    const weeks = groupByWeek(allItems).map(([, { sun, sat, entries }]) => {
      const entryLines = entries.map(({ entry }, n) => {
        const itemLines = entry.items.map(item => `        - ${item.type}: $${item.cost.toFixed(2)}`).join('\n');
        return [
          `  [${n + 1}] ${entry.make} ${entry.model} (${entry.year}) — Plate # ${entry.plate}`,
          `      Date: ${entry.date}`,
          entry.loggedBy ? `      Logged by: ${entry.loggedBy}` : null,
          `      Items:\n${itemLines}`,
          `      Total: ${entry.total}`
        ].filter(Boolean).join('\n');
      }).join('\n\n');
      return `Sun ${fmtDate(sun)}  —  Sat ${fmtDate(sat)}\n${'-'.repeat(40)}\n${entryLines}`;
    });

    const text = `MAINTENANCE LOG\nGenerated: ${new Date().toLocaleDateString()}\n${'='.repeat(40)}\n\n${weeks.join('\n\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `maintenance-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // auto-refresh every 30 seconds
  setInterval(async () => {
    const updated = await fetch('/api/log').then(r => r.json());
    if (JSON.stringify(updated) !== JSON.stringify(log)) {
      log = updated;
      render(currentQuery());
    }
  }, 30000);
});
