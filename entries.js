document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('entriesList');
  const monthSelect = document.getElementById('monthFilter');
  const res = await fetch('/api/log');
  let log = await res.json();

  const currentQuery = () => document.getElementById('entrySearch').value.trim().toLowerCase();

  const parseEntryDate = (dateStr) => {
    const d = new Date(dateStr);
    return isNaN(d) ? new Date(0) : d;
  };

  const monthKey = (dateStr) => {
    const d = parseEntryDate(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const monthLabel = (key) => {
    const [y, m] = key.split('-');
    return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const populateMonths = () => {
    const months = [...new Set(log.map(e => monthKey(e.date)))].sort().reverse();
    while (monthSelect.options.length > 1) monthSelect.remove(1);
    months.forEach(m => monthSelect.add(new Option(monthLabel(m), m)));
  };

  const groupByVehicle = (items) => {
    const map = new Map();
    items.forEach(({ entry, i }) => {
      const key = `${entry.make}|${entry.model}|${entry.year}|${entry.plate}`;
      if (!map.has(key)) map.set(key, { repEntry: entry, vehicleEntries: [] });
      map.get(key).vehicleEntries.push({ entry, i });
    });
    return [...map.values()];
  };

  const render = (query = '') => {
    const selectedMonth = monthSelect.value;

    const items = log
      .map((entry, i) => ({ entry, i }))
      .filter(({ entry }) => {
        if (query && !(
          entry.make.toLowerCase().includes(query) ||
          entry.model.toLowerCase().includes(query) ||
          entry.year.toString().includes(query) ||
          entry.plate.toLowerCase().includes(query)
        )) return false;
        if (selectedMonth && monthKey(entry.date) !== selectedMonth) return false;
        return true;
      })
      .sort((a, b) => parseEntryDate(a.entry.date) - parseEntryDate(b.entry.date));

    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<li class="no-entries">No entries yet.</li>';
      return;
    }

    groupByVehicle(items).forEach(({ repEntry, vehicleEntries }) => {
      const aggTotal = vehicleEntries.reduce((sum, { entry }) => {
        return sum + (parseFloat((entry.total || '').replace(/[^0-9.]/g, '')) || 0);
      }, 0);

      const entriesHtml = vehicleEntries.map(({ entry, i }) => `
        <div class="expand-entry">
          <div class="expand-entry-header">
            <input type="checkbox" class="entry-checkbox" data-index="${i}" />
            <span class="expand-date">Date: ${entry.date}</span>
            ${entry.loggedBy ? `<span class="expand-logged-by">Logged by: ${entry.loggedBy}</span>` : ''}
            <span class="expand-total">Entry Total: ${entry.total}</span>
          </div>
          <ul class="expand-items">
            ${entry.items.map(item => `
              <li>
                <span class="item-type">${item.type}</span>
                <span class="item-cost">$${item.cost.toFixed(2)}</span>
              </li>`).join('')}
            ${entry.discountTotal ? `
              <li>
                <span class="item-type">Discount</span>
                <span class="item-cost">-$${parseFloat(entry.discountTotal).toFixed(2)}</span>
              </li>` : ''}
          </ul>
        </div>
      `).join('');

      const li = document.createElement('li');
      li.className = 'vehicle-item';
      li.innerHTML = `
        <img src="${repEntry.imageUrl || ''}" class="vehicle-image" />
        <p>${repEntry.make} ${repEntry.model} (${repEntry.year}) — Plate # ${repEntry.plate}</p>
        <span class="vehicle-agg-total">$${aggTotal.toFixed(2)}</span>
        <button class="update-button expand-btn">Expand</button>
        <div class="expand-panel" hidden>
          ${entriesHtml}
        </div>
      `;

      li.querySelector('.expand-btn').addEventListener('click', (e) => {
        const panel = li.querySelector('.expand-panel');
        const opening = panel.hasAttribute('hidden');
        panel.toggleAttribute('hidden');
        e.target.textContent = opening ? 'Collapse' : 'Expand';
      });

      list.appendChild(li);
    });
  };

  populateMonths();
  render();

  document.getElementById('entrySearch').addEventListener('input', (e) => {
    render(e.target.value.trim().toLowerCase());
  });

  monthSelect.addEventListener('change', () => render(currentQuery()));

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
    populateMonths();
    render(currentQuery());
  });

  document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!log.length) return;
    const allItems = log.map((entry, i) => ({ entry, i }))
      .sort((a, b) => parseEntryDate(a.entry.date) - parseEntryDate(b.entry.date));
    const months = [...new Set(allItems.map(({ entry }) => monthKey(entry.date)))].sort().reverse();

    const text = months.map(mk => {
      const monthEntries = allItems.filter(({ entry }) => monthKey(entry.date) === mk);
      const entryLines = monthEntries.map(({ entry }, n) => {
        const itemLines = entry.items.map(item => `        - ${item.type}: $${item.cost.toFixed(2)}`).join('\n');
        return [
          `  [${n + 1}] ${entry.make} ${entry.model} (${entry.year}) — Plate # ${entry.plate}`,
          `      Date: ${entry.date}`,
          entry.loggedBy ? `      Logged by: ${entry.loggedBy}` : null,
          `      Items:\n${itemLines}`,
          entry.discountTotal ? `      Discount: -$${parseFloat(entry.discountTotal).toFixed(2)}` : null,
          `      Total: ${entry.total}`
        ].filter(Boolean).join('\n');
      }).join('\n\n');
      return `${monthLabel(mk)}\n${'-'.repeat(40)}\n${entryLines}`;
    }).join('\n\n');

    const blob = new Blob([`MAINTENANCE LOG\nGenerated: ${new Date().toLocaleDateString()}\n${'='.repeat(40)}\n\n${text}`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `maintenance-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  setInterval(async () => {
    const updated = await fetch('/api/log').then(r => r.json());
    if (JSON.stringify(updated) !== JSON.stringify(log)) {
      log = updated;
      populateMonths();
      render(currentQuery());
    }
  }, 30000);
});
