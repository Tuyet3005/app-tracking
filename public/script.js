// old echo form removed; no-op

// User name box: save with progress and show saved state
(() => {
    // Clear cloud input on page load
    feelingInput.value = '';
  const nameInput = document.getElementById('usernameBox');
  const saveLabel = document.getElementById('usernameSave');
  if (!nameInput) return;

  let nameTimer = null;
  function markSaved() { if (saveLabel) saveLabel.textContent = 'Saved'; }
  function markSaving() { if (saveLabel) saveLabel.textContent = 'Saving…'; }

  nameInput.addEventListener('input', () => {
    markSaving();
    if (nameTimer) clearTimeout(nameTimer);
    nameTimer = setTimeout(() => {
      // schedule overall save with table state
      if (typeof scheduleSave === 'function') scheduleSave();
      markSaved();
    }, 600);
  });

  // expose helper to populate name during load
  window.__setLoadedUserName = (val) => {
    nameInput.value = val || '';
    markSaved();
  };
})();

// Practice Progress tables (3 passages side-by-side)
(() => {
  const container = document.getElementById('practice-container');
  if (!container) return;

  const passages = ['Passage 1', 'Passage 2', 'Passage 3'];
  const parts = ['Part 1', 'Part 2', 'Part 3', 'Part 4'];
  const rows = Array.from({ length: 11 }, (_, i) => `Cam${10 + i}`); // Cam10..Cam20
  const cols = Array.from({ length: 4 }, (_, i) => `Test${i + 1}`); // Test1..Test4

  function createTableElement(title) {
    const wrapper = document.createElement('div');
    wrapper.className = 'practice-wrapper';
    const h = document.createElement('h3');
    // title with small badge for personality
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = title.replace('Passage ', 'P');
    h.appendChild(badge);
    const tspan = document.createElement('span');
    tspan.style.marginLeft = '6px';
    tspan.style.fontWeight = '600';
    tspan.textContent = title;
    h.appendChild(tspan);
    // per-table stats (completed correct/total)
    const stats = document.createElement('span');
    stats.className = 'table-stats';
    stats.textContent = '0/0';
    stats.dataset.passage = title;
    stats.style.marginLeft = '8px';
    stats.style.fontWeight = '700';
    stats.style.fontSize = '0.85rem';
    stats.style.color = '#475569';
    h.appendChild(stats);
    // Add average x/y for each passage
    let avgSpan = null;
    if (title === 'Passage 1' || title === 'Passage 2' || title === 'Passage 3') {
      avgSpan = document.createElement('span');
      avgSpan.className = 'table-avg table-stats';
      avgSpan.style.marginLeft = '10px';
      avgSpan.style.fontWeight = '800';
      avgSpan.style.fontSize = '0.9rem';
      avgSpan.style.color = '#164e63';
      avgSpan.style.background = 'linear-gradient(90deg, #f0fdf4 0%, #fefce8 100%)';
      avgSpan.style.boxShadow = '0 8px 20px rgba(16,185,129,0.06)';
      avgSpan.style.border = '1px solid rgba(16,185,129,0.08)';
      avgSpan.style.borderRadius = '10px';
      avgSpan.style.padding = '6px 10px';
      if (title === 'Passage 1' || title === 'Passage 2') {
        avgSpan.textContent = '0/13';
      } else if (title === 'Passage 3') {
        avgSpan.textContent = '0/14';
      }
      h.appendChild(avgSpan);
    }
    wrapper.appendChild(h);

    const table = document.createElement('table');
    table.className = 'practice';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.textContent = '';
    headerRow.appendChild(corner);
    cols.forEach(c => {
      const th = document.createElement('th');
      th.textContent = c;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = r;
      tr.appendChild(th);
      cols.forEach(c => {
        const td = document.createElement('td');
          // wrapper to position star overlay and status button
          const wrap = document.createElement('div');
          wrap.className = 'cell-wrap';
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'practice-input';
          input.setAttribute('data-passage', title);
          input.setAttribute('data-col', c);
          input.setAttribute('data-row', r);
          input.placeholder = '0/0';
          input.addEventListener('input', onCellInput);
          input.addEventListener('blur', onCellBlur);
          // status button for reading progress - always visible inside cell
          const statusBtn = document.createElement('button');
          statusBtn.className = 'cell-status-btn';
          statusBtn.setAttribute('type', 'button');
          statusBtn.setAttribute('aria-label', 'Toggle cell status');
          statusBtn.setAttribute('data-passage', title);
          statusBtn.setAttribute('data-col', c);
          statusBtn.setAttribute('data-row', r);
          statusBtn.addEventListener('click', (e) => onStatusBtnClick(e, input, td));
          const star = document.createElement('span');
          star.className = 'cell-star';
          // use a small raster star image instead of inline SVG (18x18)
          star.innerHTML = '<img src="/star.png" alt="star" style="width:18px;height:18px;display:block" />';
          wrap.appendChild(input);
          wrap.appendChild(statusBtn);
          wrap.appendChild(star);
          td.appendChild(wrap);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    // add legend explaining color gradient
    const legend = document.createElement('div');
    legend.className = 'legend';
    const left = document.createElement('span'); left.textContent = 'Low';
    const bar = document.createElement('div'); bar.className = 'legend-bar';
    const right = document.createElement('span'); right.textContent = 'High';
    legend.appendChild(left);
    legend.appendChild(bar);
    legend.appendChild(right);
    wrapper.appendChild(legend);
    return wrapper;
  }

  // create a listening table (uses data-part attributes and saved under `parts`)
  function createListeningTableElement(title) {
    const wrapper = document.createElement('div');
    wrapper.className = 'practice-wrapper';
    const h = document.createElement('h3');
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = title.replace('Part ', 'P');
    h.appendChild(badge);
    const tspan = document.createElement('span');
    tspan.style.marginLeft = '6px';
    tspan.style.fontWeight = '600';
    tspan.textContent = title;
    h.appendChild(tspan);
    const stats = document.createElement('span');
    stats.className = 'table-stats';
    stats.textContent = '0/0';
    stats.dataset.part = title;
    stats.style.marginLeft = '8px';
    stats.style.fontWeight = '700';
    stats.style.fontSize = '0.85rem';
    stats.style.color = '#475569';
    h.appendChild(stats);
    // Add average x/10 for each listening part
    let avgSpan = document.createElement('span');
    avgSpan.className = 'table-avg table-stats';
    avgSpan.style.marginLeft = '10px';
    avgSpan.style.fontWeight = '800';
    avgSpan.style.fontSize = '0.9rem';
    avgSpan.style.color = '#164e63';
    avgSpan.style.background = 'linear-gradient(90deg, #f0fdf4 0%, #fefce8 100%)';
    avgSpan.style.boxShadow = '0 8px 20px rgba(16,185,129,0.06)';
    avgSpan.style.border = '1px solid rgba(16,185,129,0.08)';
    avgSpan.style.borderRadius = '10px';
    avgSpan.style.padding = '6px 10px';
    avgSpan.innerHTML = "<span style='color:#e11d48;font-weight:900;'>0</span>/10";
    h.appendChild(avgSpan);
    wrapper.appendChild(h);

    const table = document.createElement('table');
    table.className = 'practice';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.textContent = '';
    headerRow.appendChild(corner);
    cols.forEach(c => {
      const th = document.createElement('th');
      th.textContent = c;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = r;
      tr.appendChild(th);
      cols.forEach(c => {
        const td = document.createElement('td');
        const wrap = document.createElement('div');
        wrap.className = 'cell-wrap';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'practice-input';
        input.setAttribute('data-part', title);
        input.setAttribute('data-col', c);
        input.setAttribute('data-row', r);
        input.placeholder = '0/0';
        input.addEventListener('input', onCellInput);
        input.addEventListener('blur', onCellBlur);
        // status button for listening progress - always visible inside cell
        const statusBtn = document.createElement('button');
        statusBtn.className = 'cell-status-btn';
        statusBtn.setAttribute('type', 'button');
        statusBtn.setAttribute('aria-label', 'Toggle cell status');
        statusBtn.setAttribute('data-part', title);
        statusBtn.setAttribute('data-col', c);
        statusBtn.setAttribute('data-row', r);
        statusBtn.addEventListener('click', (e) => onStatusBtnClick(e, input, td));
        const star = document.createElement('span');
        star.className = 'cell-star';
        // use a small raster star image instead of inline SVG (18x18)
        star.innerHTML = '<img src="/star.png" alt="star" style="width:18px;height:18px;display:block" />';
        wrap.appendChild(input);
        wrap.appendChild(statusBtn);
        wrap.appendChild(star);
        td.appendChild(wrap);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    const legend = document.createElement('div');
    legend.className = 'legend';
    const left = document.createElement('span'); left.textContent = 'Low';
    const bar = document.createElement('div'); bar.className = 'legend-bar';
    const right = document.createElement('span'); right.textContent = 'High';
    legend.appendChild(left);
    legend.appendChild(bar);
    legend.appendChild(right);
    wrapper.appendChild(legend);
    return wrapper;
  }

  // Debounced save: collect full state and POST to server
  let saveTimer = null;
  let lastSavedState = null;
  let isLoaded = false; // becomes true after initial loadProgress() completes
  // UI helper for progress save status
  function setProgressStatus(state, text) {
    const el = document.getElementById('progressSaveStatus');
    if (!el) return;
    el.classList.remove('saved', 'saving', 'error');
    el.classList.add(state);
    if (typeof text === 'string') el.textContent = text;
  }
  function scheduleSave() {
    if (!isLoaded) return; // do not schedule saves before initial load
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(), 200);
  }
  // expose scheduleSave/saveNow to global so other components (username box) can trigger saves
  window.scheduleSave = scheduleSave;
  window.saveNow = saveNow;
  async function saveNow() {
    if (!isLoaded) return; // don't save until initial load completes
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    const payload = collectState();
    const payloadStr = JSON.stringify(payload);
    // skip sending if nothing changed since last successful save
    if (lastSavedState === payloadStr) {
      setProgressStatus('saved', 'Saved');
      return;
    }
    setProgressStatus('saving', 'Saving…');
    try {
      const res = await fetch('/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadStr
      });
      if (res && res.ok) {
        lastSavedState = payloadStr;
        setProgressStatus('saved', 'Saved');
      } else {
        // server returned error - do not update lastSavedState
        setProgressStatus('error', 'Save failed');
        console.warn('Save returned non-ok response', res && res.status);
      }
    } catch (e) {
      setProgressStatus('error', 'Save failed');
      console.warn('Failed to save progress', e);
    }
  }

  function collectState() {
    const data = { passages: {}, parts: {}, cellStates: {} };
    document.querySelectorAll('input.practice-input').forEach(input => {
      const part = input.getAttribute('data-part');
      const p = input.getAttribute('data-passage');
      const r = input.getAttribute('data-row');
      const c = input.getAttribute('data-col');
      const v = (input.value || '').trim();
      
      if (part) {
        data.parts[part] = data.parts[part] || {};
        data.parts[part][r] = data.parts[part][r] || {};
        data.parts[part][r][c] = v;
      } else {
        const pass = p || 'Passage 1';
        data.passages[pass] = data.passages[pass] || {};
        data.passages[pass][r] = data.passages[pass][r] || {};
        data.passages[pass][r][c] = v;
      }
      
      // collect cell button states (marked status)
      const statusBtn = input.parentElement.querySelector('.cell-status-btn');
      if (statusBtn && v) {
        const key = `${p || part || 'default'}_${r}_${c}`;
        data.cellStates[key] = statusBtn.classList.contains('marked');
      }
    });
    // include username if present
    const unameEl = document.getElementById('usernameBox');
    if (unameEl) data.username = (unameEl.value || '').trim();
    return data;
  }

  // Update per-table and overall totals for reading/listening
  function updateTotals() {
    // reading totals (only practice-container)
    let readingCompleted = 0, readingTotal = 0;
    let passage1Totals = [];
    let passage2Totals = [];
    let passage3Totals = [];
    const practiceContainerEl = document.getElementById('practice-container');
    if (practiceContainerEl) {
      practiceContainerEl.querySelectorAll('.practice-wrapper').forEach(wrapper => {
        const tableStats = wrapper.querySelector('.table-stats');
        const inputs = wrapper.querySelectorAll('input.practice-input');
        const tableTotal = inputs.length;
        let tableCompleted = 0;
        let passage = '';
        if (inputs.length > 0) {
          passage = inputs[0].getAttribute('data-passage');
        }
        let passage1Correct = 0;
        let passage1Total = 0;
        let passage2Correct = 0;
        let passage2Total = 0;
        let passage3Correct = 0;
        let passage3Total = 0;
        inputs.forEach(input => {
          const v = (input.value || '').trim();
          if (v) tableCompleted += 1;
          if (passage === 'Passage 1') {
            const num = parseFloat(v);
            if (!isNaN(num)) {
              passage1Correct += num;
              passage1Total += 1;
            }
          } else if (passage === 'Passage 2') {
            const num = parseFloat(v);
            if (!isNaN(num)) {
              passage2Correct += num;
              passage2Total += 1;
            }
          } else if (passage === 'Passage 3') {
            const num = parseFloat(v);
            if (!isNaN(num)) {
              passage3Correct += num;
              passage3Total += 1;
            }
          }
        });
        if (passage === 'Passage 1' && passage1Total > 0) {
          passage1Totals.push(passage1Correct / passage1Total);
          // Update avgSpan for Passage 1
          const wrapperHeader = wrapper.querySelector('h3');
          const avgSpan = wrapperHeader ? wrapperHeader.querySelector('.table-avg') : null;
          let x = passage1Correct / passage1Total;
          x = Math.round(x * 10) / 10;
          if (avgSpan) {
            avgSpan.innerHTML = `<span style='color:#e11d48;font-weight:900;'>${x}</span>/13`;
          }
        } else if (passage === 'Passage 2' && passage2Total > 0) {
          passage2Totals.push(passage2Correct / passage2Total);
          // Update avgSpan for Passage 2
          const wrapperHeader = wrapper.querySelector('h3');
          const avgSpan = wrapperHeader ? wrapperHeader.querySelector('.table-avg') : null;
          let a = passage2Correct / passage2Total;
          a = Math.round(a * 10) / 10;
          if (avgSpan) {
            avgSpan.innerHTML = `<span style='color:#e11d48;font-weight:900;'>${a}</span>/13`;
          }
        } else if (passage === 'Passage 3' && passage3Total > 0) {
          passage3Totals.push(passage3Correct / passage3Total);
          // Update avgSpan for Passage 3
          const wrapperHeader = wrapper.querySelector('h3');
          const avgSpan = wrapperHeader ? wrapperHeader.querySelector('.table-avg') : null;
          let c = passage3Correct / passage3Total;
          c = Math.round(c * 10) / 10;
          if (avgSpan) {
            avgSpan.innerHTML = `<span style='color:#e11d48;font-weight:900;'>${c}</span>/14`;
          }
        }
        if (passage === 'Passage 2' && passage2Total > 0) {
          passage2Totals.push(passage2Correct / passage2Total);
        }
        if (passage === 'Passage 3' && passage3Total > 0) {
          passage3Totals.push(passage3Correct / passage3Total);
        }
        if (tableStats) {
          const pctTable = tableTotal > 0 ? Math.round((tableCompleted / tableTotal) * 100) : 0;
          tableStats.innerHTML = `${tableCompleted}/${tableTotal} <span class="percent ${pctTable>=90? 'pulse':''}">${pctTable}%</span>`;
        }
        readingCompleted += tableCompleted;
        readingTotal += tableTotal;
      });
    }
    const readingEl = document.getElementById('readingTotals');
    if (readingEl) {
      const pct = readingTotal > 0 ? Math.round((readingCompleted / readingTotal) * 100) : 0;
      readingEl.innerHTML = `Completed ${readingCompleted}/${readingTotal} <span class="percent ${pct>=90? 'pulse':''}">${pct}%</span>`;
    }
    // Update readingExtra for Passage 1 average
    const readingExtra = document.getElementById('readingExtra');
    if (readingExtra) {
      let x = 0, a = 0, c = 0;
      if (passage1Totals.length > 0) {
        x = passage1Totals.reduce((m, n) => m + n, 0) / passage1Totals.length;
      }
      if (passage2Totals.length > 0) {
        a = passage2Totals.reduce((m, n) => m + n, 0) / passage2Totals.length;
      }
      if (passage3Totals.length > 0) {
        c = passage3Totals.reduce((m, n) => m + n, 0) / passage3Totals.length;
      }
      x = Math.round(x * 10) / 10;
      a = Math.round(a * 10) / 10;
      c = Math.round(c * 10) / 10;
      readingExtra.textContent = `Average ~~~P1 ${x}/13 ~~~ P2 ${a}/13 ~~~P3 ${c}/14`;
    }

    // listening totals: elements under #listening-container
    let listenCompleted = 0, listenTotal = 0;
    const listeningContainer = document.getElementById('listening-container');
    if (listeningContainer) {
      listeningContainer.querySelectorAll('.practice-wrapper').forEach(wrapper => {
        const stats = wrapper.querySelector('.table-stats');
        const avgSpan = wrapper.querySelector('.table-avg');
        const inputs = wrapper.querySelectorAll('input.practice-input');
        const tableTotal = inputs.length;
        let tableCompleted = 0;
        let correctSum = 0;
        let correctCount = 0;
        inputs.forEach(input => {
          const v = (input.value || '').trim();
          if (v) tableCompleted += 1;
          const num = parseFloat(v);
          if (!isNaN(num)) {
            correctSum += num;
            correctCount += 1;
          }
        });
        if (stats) {
          const pctTable = tableTotal > 0 ? Math.round((tableCompleted / tableTotal) * 100) : 0;
          stats.innerHTML = `${tableCompleted}/${tableTotal} <span class="percent ${pctTable>=90? 'pulse':''}">${pctTable}%</span>`;
        }
        if (avgSpan) {
          let avg = 0;
          if (correctCount > 0) {
            avg = Math.round((correctSum / correctCount) * 10) / 10;
          }
          avgSpan.innerHTML = `<span style='color:#e11d48;font-weight:900;'>${avg}</span>/10`;
        }
        listenCompleted += tableCompleted;
        listenTotal += tableTotal;
      });
    }
    const listenEl = document.getElementById('listeningTotals');
    if (listenEl) {
      const pct2 = listenTotal > 0 ? Math.round((listenCompleted / listenTotal) * 100) : 0;
      listenEl.innerHTML = `Completed ${listenCompleted}/${listenTotal} <span class="percent ${pct2>=90? 'pulse':''}">${pct2}%</span>`;
    }
  }

  function onCellInput(e) {
    const input = e.target;
    const v = (input.value || '').trim();
    const m = v.match(/^(\d+)\s*\/\s*(\d+)$/);
    const td = input.closest('td');
    
    if (!m) {
      input.style.background = '';
      input.style.color = '';
      input.title = '';
      // remove cell border
      if (td) td.classList.remove('cell-with-value');
      // hide star if any
      const starEl = input.parentElement.querySelector('.cell-star');
      if (starEl) starEl.style.display = 'none';
      return;
    }
    
    const correct = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (isNaN(correct) || isNaN(total) || total <= 0) {
      input.style.background = '';
      input.style.color = '';
      input.title = 'Invalid numbers';
      // remove cell border
      if (td) td.classList.remove('cell-with-value');
      // hide star if any
      const starEl = input.parentElement.querySelector('.cell-star');
      if (starEl) starEl.style.display = 'none';
      return;
    }
    
    const wrong = Math.max(0, total - correct);
    const ratio = Math.max(0, Math.min(1, correct / total));
    applyColor(input, ratio);
    input.title = `${correct}/${total} — wrong: ${wrong} — ${Math.round(ratio * 100)}%`;
    
    // show cell border for cells with values
    if (td) {
      td.classList.add('cell-with-value');
    }
    
    // show star when perfect
    const starEl = input.parentElement.querySelector('.cell-star');
    if (starEl) {
      if (correct === total && total > 0) starEl.style.display = 'block';
      else starEl.style.display = 'none';
    }
  }

  function onCellBlur(e) {
    const input = e.target;
    const prevValue = input.getAttribute('data-prev-value') || '';
    const currentValue = (input.value || '').trim();
    
    const passageName = input.getAttribute('data-passage');
    const cambrigeVersion = input.getAttribute('data-row');
    const testName = input.getAttribute('data-col');

    fetch('/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passageName,
        cambrigeVersion,
        testName,
        result: currentValue
      })
    });
    
    onCellInput(e);
    
    // Mark today as active if user entered a valid value (not 0/0 or empty)
    if (currentValue && currentValue !== '0/0' && currentValue !== prevValue) {
      const match = currentValue.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (match) {
        const correct = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        // Mark active if it's a valid entry (not just 0/0)
        if (total > 0 && (correct > 0 || total > 0)) {
          if (typeof window.markTodayActive === 'function') {
            window.markTodayActive();
          }
        }
      }
    }
    
    // Store current value for next comparison
    input.setAttribute('data-prev-value', currentValue);
    
    saveNow();
  }

  function onStatusBtnClick(e, input, td) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target;
    const isMarked = btn.classList.toggle('marked');
    
    if (isMarked) {
      td.classList.add('marked');
    } else {
      td.classList.remove('marked');
    }
    
    scheduleSave();
    // update totals after cell changes
    try { updateTotals(); } catch (err) {}
  }

  function applyColor(el, ratio) {
    const hue = Math.round(ratio * 120); // 0 (red) -> 120 (green)
    const saturation = 60; // pastel saturation
    const lightness = 82; // pastel lightness
    el.style.background = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    el.style.color = '#000';
  }

  container.innerHTML = '';
  passages.forEach(p => container.appendChild(createTableElement(p)));
  // create listening tables area (Parts)
  const listeningContainer = document.getElementById('listening-container');
  if (listeningContainer) {
    listeningContainer.innerHTML = '';
    parts.forEach(pt => listeningContainer.appendChild(createListeningTableElement(pt)));
    // Clear all listening data cells on load
    listeningContainer.querySelectorAll('input.practice-input').forEach(input => {
      input.value = '';
      input.style.background = '';
      input.style.color = '';
      input.title = '';
      const starEl = input.parentElement.querySelector('.cell-star');
      if (starEl) starEl.style.display = 'none';
    });
  }

  // apply a progress object to the UI (used by initial load and polling)
  function applyProgress(obj) {
    const map = (obj && obj.passages) || {};
    const partsMap = (obj && obj.parts) || {};
    const cellStates = (obj && obj.cellStates) || {};
    // load username if present
    if (obj && obj.username && typeof window.__setLoadedUserName === 'function') {
      window.__setLoadedUserName(obj.username);
    }
    document.querySelectorAll('input.practice-input').forEach(input => {
      const part = input.getAttribute('data-part');
      const p = input.getAttribute('data-passage');
      const r = input.getAttribute('data-row');
      const c = input.getAttribute('data-col');
      let v = '';
      if (part) {
        v = (partsMap[part] && partsMap[part][r] && partsMap[part][r][c]) || '';
      } else {
        const pass = p || 'Passage 1';
        v = (map[pass] && map[pass][r] && map[pass][r][c]) || '';
      }
      input.value = v;
      // Store initial value for activity tracking
      input.setAttribute('data-prev-value', v);
      // trigger coloring
      const ev = { target: input };
      onCellInput(ev);

      // restore button marked state
      if (v) {
        const key = `${p || part || 'default'}_${r}_${c}`;
        const isMarked = cellStates[key] || false;
        const statusBtn = input.parentElement.querySelector('.cell-status-btn');
        const td = input.closest('td');
        if (isMarked && statusBtn && td) {
          statusBtn.classList.add('marked');
          td.classList.add('marked');
        }
      }
    });
    // set lastSavedState to loaded server state to avoid immediately re-saving
    try {
      lastSavedState = JSON.stringify(obj || {});
    } catch (e) {
      lastSavedState = null;
    }
    // reflect saved status in UI and update totals
    try { setProgressStatus('saved', 'Saved'); } catch (e) {}
    try { updateTotals(); } catch (e) {}
  }

  // Load saved progress from server and populate inputs
  async function loadProgress() {
    try {
      const res = await fetch('/progress');
      if (!res.ok) return;
      const obj = await res.json();
      applyProgress(obj);
    } catch (e) {
      console.warn('Failed to load progress', e);
    }
    // mark loaded so autosaves can run
    isLoaded = true;
  }

  loadProgress();

  // Periodically poll for server-side changes and apply them when safe
  const PROGRESS_POLL_INTERVAL = 30 * 1000; // 30s
  async function pollProgressOnce() {
    try {
      const res = await fetch('/progress');
      if (!res.ok) return;
      const obj = await res.json();
      const serverStr = JSON.stringify(obj || {});
      // if server state equals our last saved state, nothing to do
      if (lastSavedState === serverStr) return;
      // if user has local unsaved changes (current != lastSavedState), avoid clobbering
      const current = JSON.stringify(collectState());
      if (current !== lastSavedState) return;
      // safe to apply server state
      applyProgress(obj);
    } catch (e) {
      // silently ignore polling errors
    }
  }

  function startProgressPolling() {
    setInterval(() => {
      if (!isLoaded) return;
      pollProgressOnce();
    }, PROGRESS_POLL_INTERVAL);
  }

  startProgressPolling();
})();

// Feelings Cloud Widget - handle daily feelings
(() => {
  const feelingInput = document.getElementById('feelingInput');
  if (!feelingInput) return;

  // Cloud collapse/expand functionality
  const cloudWidget = document.getElementById('feeling-cloud');
  const cloudImg = document.getElementById('cloudImg');
  const minimizeBtn = document.getElementById('cloudMinimizeBtn');
  
  // Check localStorage for saved state
  const savedCollapsedState = localStorage.getItem('cloudCollapsed');
  if (savedCollapsedState === 'true') {
    cloudWidget.classList.add('collapsed');
  }

  // Minimize button click handler
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cloudWidget.classList.add('collapsed');
      localStorage.setItem('cloudCollapsed', 'true');
    });
  }

  // Cloud image click handler (when collapsed, expand it)
  if (cloudImg) {
    cloudImg.addEventListener('click', (e) => {
      if (cloudWidget.classList.contains('collapsed')) {
        e.stopPropagation();
        cloudWidget.classList.remove('collapsed');
        localStorage.setItem('cloudCollapsed', 'false');
        // Focus on textarea after expanding
        setTimeout(() => feelingInput.focus(), 200);
      }
    });
  }

  function getTodayKey() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `feelings_${today}`;
  }
  // UI helper for feeling save status
  function setFeelingStatus(state, text) {
    const el = document.getElementById('feelingSaveStatus');
    if (!el) return;
    el.classList.remove('saved', 'saving', 'error');
    if (state) el.classList.add(state);
    if (typeof text === 'string') el.textContent = text;
  }

  // Lưu feeling vào localStorage khi nhập liệu
  feelingInput.addEventListener('input', () => {
    const key = getTodayKey();
    localStorage.setItem(key, feelingInput.value || '');
  });

  // Handle Ctrl/Cmd+Enter to save (allow Enter for newline in textarea)
  feelingInput.addEventListener('keydown', async (e) => {
    const isSubmit = (e.key === 'Enter' && (e.ctrlKey || e.metaKey));
    if (!isSubmit) return; // otherwise allow newline
    e.preventDefault();
    e.stopPropagation();

    const today = getTodayKey().replace('feelings_', '');
    const feelingText = (feelingInput.value || '').trim();
    const usernameEl = document.getElementById('usernameBox');
    const username = (usernameEl && usernameEl.value) || 'Anonymous';

    if (!feelingText) return;

    const payload = {
      date: today,
      name: username,
      feeling: feelingText
    };

    try {
      setFeelingStatus('saving', 'Saving…');
      const res = await fetch('/feeling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // server will return the saved entry (with timestamp) so we can append accurately
        const json = await res.json().catch(() => null);
        const entryToAppend = (json && json.entry) ? json.entry : payload;
        appendFeelingToHistory(entryToAppend);
        // Clear all user input in cloud area
        feelingInput.value = '';
        localStorage.removeItem(getTodayKey());
        setFeelingStatus('', ''); // clear status text
        // Nếu có các trường khác trong cloud, clear tại đây nếu cần
        feelingInput.blur();
      } else {
        setFeelingStatus('error', 'Save failed');
        console.warn('Failed to save feeling', await res.text());
      }
    } catch (err) {
      setFeelingStatus('error', 'Save failed');
      console.warn('Failed to save feeling', err);
    }
  });

  // Load today's feeling on page load (ưu tiên localStorage)
  async function loadTodayFeeling() {
    // Luôn clear input khi load lại trang, không tự động điền lại nội dung cũ
    feelingInput.value = '';
    // Nếu muốn load từ server (nếu cần), có thể bổ sung logic ở đây
    // Nếu muốn giữ lại logic cũ, hãy bỏ comment các dòng dưới:
    // try {
    //   const key = getTodayKey();
    //   const local = localStorage.getItem(key);
    //   if (local && local.trim()) {
    //     feelingInput.value = local;
    //     return;
    //   }
    //   const today = key.replace('feelings_', '');
    //   const res = await fetch(`/feeling?date=${today}`);
    //   if (res.ok) {
    //     const data = await res.json();
    //     if (data && data.feeling) {
    //       feelingInput.value = data.feeling;
    //     }
    //   }
    // } catch (e) {
    //   console.warn('Failed to load feeling', e);
    // }
  }

  // Load feeling history from server
  window.loadFeelingHistory = async function() {
    try {
      const res = await fetch('/feelings/history');
      if (!res.ok) return;
      const history = await res.json() || [];
      
      const historyLog = document.getElementById('history-log');
      if (!historyLog) return;

      if (!history || history.length === 0) {
        historyLog.innerHTML = '<div class="history-empty">📝 No feelings logged yet. Start sharing above! 💭</div>';
        return;
      }

      // Sort by timestamp/date descending (newest first)
      history.sort((a, b) => {
        const aTime = new Date(a.timestamp || a.date);
        const bTime = new Date(b.timestamp || b.date);
        return bTime - aTime;
      });

      historyLog.innerHTML = history.map((entry, idx) => {
        // Use stored timestamp when available and display in UTC+7
        const ts = entry.timestamp || (entry.date ? (entry.date + 'T00:00:00Z') : null);
        const dateObj = ts ? new Date(ts) : new Date();
        const weekday = dateObj.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
        const dateOnly = dateObj.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
        const formattedDate = `${weekday}, ${dateOnly}`;
        const emoticon = getEmoticon(entry.feeling);
        const isLoved = entry.loved ? 'loved' : '';
        const heartIcon = entry.loved ? '❤️' : '🤍';
        // Tự động xuống dòng cho URL dài, không ảnh hưởng từ khác, đồng thời in đậm **text**
        let feelingHtml = escapeHtml(entry.feeling).replace(/\n/g, '<br>');
        // In đậm **text**
        feelingHtml = feelingHtml.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // Xuống dòng cho URL dài
        feelingHtml = feelingHtml.replace(/(https?:\/\/[^\s<>"']+)/g, function(url) {
          return `<span class=\"break-url\">${url}</span>`;
        });
        return `
          <div class="history-entry" data-ts="${entry.timestamp || ''}" style="animation: fadeInUp 0.5s ease-out ${idx * 0.05}s both;">
            <div class="history-header">
              <div class="history-left">
                <span class="history-emoticon">${emoticon}</span>
                <span class="history-date">${formattedDate}</span>
                <span class="history-user"> — ${escapeHtml(entry.name)}</span>
              </div>
              <div class="history-actions">
                <button class="feeling-love-btn ${isLoved}" data-ts="${entry.timestamp || ''}" aria-label="Like feeling">${heartIcon}</button>
                <button class="feeling-delete-btn" data-ts="${entry.timestamp || ''}" aria-label="Delete feeling">
                  <img src="/delete.png" alt="Delete" class="feeling-delete-icon" />
                </button>
              </div>
            </div>
            <div class="history-feeling">"${feelingHtml}"</div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Failed to load feeling history', e);
    }
  };

  // Optimistically append a new feeling entry to the top of the history UI
  function appendFeelingToHistory(entry) {
    try {
      const historyLog = document.getElementById('history-log');
      if (!historyLog) return;
      // remove empty placeholder if present
      const empty = historyLog.querySelector('.history-empty');
      if (empty) empty.remove();

      const ts = entry.timestamp || (entry.date ? (entry.date + 'T00:00:00Z') : new Date().toISOString());
      const dateObj = new Date(ts);
      const weekday = dateObj.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
      const dateOnly = dateObj.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
      const formattedDate = `${weekday}, ${dateOnly}`;
      const emoticon = getEmoticon(entry.feeling);

      const wrapper = document.createElement('div');
      wrapper.className = 'history-entry new-entry';
      wrapper.style.animation = 'fadeInUp 0.45s ease-out both';
      // Tự động xuống dòng cho URL dài, không ảnh hưởng từ khác, đồng thời in đậm **text**
      let feelingHtml = escapeHtml(entry.feeling).replace(/\n/g, '<br>');
      // In đậm **text**
      feelingHtml = feelingHtml.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      // Xuống dòng cho URL dài
      feelingHtml = feelingHtml.replace(/(https?:\/\/[^\s<>"']+)/g, function(url) {
        return `<span class=\"break-url\">${url}</span>`;
      });
      wrapper.innerHTML = `
        <div class="history-header">
          <div class="history-left">
            <span class="history-emoticon">${emoticon}</span>
            <span class="history-date">${formattedDate}</span>
            <span class="history-user"> — ${escapeHtml(entry.name)}</span>
          </div>
          <div class="history-actions"></div>
        </div>
        <div class="history-feeling">"${feelingHtml}"</div>
      `;
      // add love and delete action buttons into the header actions container
      const actions = wrapper.querySelector('.history-actions');
      const love = document.createElement('button');
      love.className = 'feeling-love-btn';
      love.setAttribute('data-ts', entry.timestamp || '');
      love.setAttribute('aria-label', 'Like feeling');
      love.textContent = '🤍';
      if (actions) actions.appendChild(love);
      const del = document.createElement('button');
      del.className = 'feeling-delete-btn';
      del.setAttribute('data-ts', entry.timestamp || '');
      del.setAttribute('aria-label', 'Delete feeling');
      del.innerHTML = '<img src="/delete.png" alt="Delete" class="feeling-delete-icon" />';
      if (actions) actions.appendChild(del);
      // prepend to top
      if (historyLog.firstChild) historyLog.insertBefore(wrapper, historyLog.firstChild);
      else historyLog.appendChild(wrapper);

      // temporary highlight for positive feedback
      wrapper.style.boxShadow = '0 8px 30px rgba(99,102,241,0.08)';
      wrapper.style.border = '1.5px solid rgba(99,102,241,0.09)';
      setTimeout(() => {
        wrapper.style.boxShadow = '';
        wrapper.style.border = '';
      }, 2000);
    } catch (e) {
      // fallback: refresh later
      console.warn('Failed to optimistically append feeling', e);
    }
  }

  // delegated handler for love buttons in history log

  // Enable double-click to edit feelings in the log
  document.addEventListener('dblclick', function(ev) {
    const feelingDiv = ev.target.closest('.history-feeling');
    if (!feelingDiv) return;
    if (feelingDiv.querySelector('textarea')) return; // already editing
    const original = feelingDiv.innerText.replace(/^"|"$/g, '').replace(/\n/g, '\n');
    const textarea = document.createElement('textarea');
    textarea.value = original;
    textarea.style.width = '98%';
    textarea.style.minHeight = '40px';
    textarea.style.fontSize = '1rem';
    textarea.style.fontFamily = 'inherit';
    textarea.style.borderRadius = '8px';
    textarea.style.border = '1px solid #cbd5e1';
    textarea.style.margin = '2px 0';
    textarea.style.padding = '4px 8px';
    feelingDiv.innerHTML = '';
    feelingDiv.appendChild(textarea);
    textarea.focus();

    textarea.addEventListener('keydown', function(e) {
      // Ctrl+B to bold selected text
      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        if (start !== end) {
          const before = textarea.value.substring(0, start);
          const selected = textarea.value.substring(start, end);
          const after = textarea.value.substring(end);
          // Use ** for markdown-like bold
          textarea.value = before + '**' + selected + '**' + after;
          // Restore selection
          textarea.selectionStart = start;
          textarea.selectionEnd = end + 4;
        }
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Blur textarea to trigger blur handler, which will safely update innerHTML
        textarea.blur();
      }
      if (e.key === 'Escape') {
        let html = original.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
        html = html.replace(/(https?:\/\/[^\s<>"]+)/g, function(url) {
          if (url.length > 30) {
            return `<span style="word-break:break-all;">${url}</span>`;
          }
          return url;
        });
        feelingDiv.innerHTML = '"' + html + '"';
      }
    });
    textarea.addEventListener('blur', function() {
      // Đảm bảo textarea vẫn còn là con của feelingDiv và feelingDiv còn trong DOM
      if (!feelingDiv.isConnected) return;
      if (feelingDiv.contains(textarea)) {
        const newText = textarea.value.trim();
        const entryDiv = feelingDiv.closest('.history-entry');
        const ts = entryDiv ? entryDiv.getAttribute('data-ts') : null;
        const userSpan = entryDiv ? entryDiv.querySelector('.history-user') : null;
        let username = 'Anonymous';
        if (userSpan) {
          // Lấy tên user từ text: ' — username'
          const match = userSpan.textContent.match(/—\s*(.*)/);
          if (match) username = match[1].trim();
        }
        // Gửi request chỉnh sửa cảm xúc đúng entry (không tạo mới)
        if (ts && newText) {
          fetch('/feeling/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timestamp: ts, feeling: newText })
          }).catch(() => {});
        }
        let html = newText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
        html = html.replace(/(https?:\/\/[^\s<>"]+)/g, function(url) {
          if (url.length > 30) {
            return `<span style="word-break:break-all;">${url}</span>`;
          }
          return url;
        });
        feelingDiv.innerHTML = '"' + html + '"';
      }
    });
  });
  document.addEventListener('click', async (ev) => {
    const loveBtn = ev.target.closest && ev.target.closest('.feeling-love-btn');
    if (loveBtn) {
      ev.preventDefault();
      const ts = loveBtn.getAttribute('data-ts');
      if (!ts) return;
      try {
        const isCurrentlyLoved = loveBtn.classList.contains('loved');
        const newLovedState = !isCurrentlyLoved;
        // Optimistically update UI
        loveBtn.classList.toggle('loved', newLovedState);
        loveBtn.textContent = newLovedState ? '❤️' : '🤍';
        // Send to server
        const res = await fetch('/feeling/love', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp: ts, loved: newLovedState })
        });
        if (!res.ok) {
          // Revert on error
          loveBtn.classList.toggle('loved', isCurrentlyLoved);
          loveBtn.textContent = isCurrentlyLoved ? '❤️' : '🤍';
          console.warn('Failed to update love status', await res.text());
        }
      } catch (err) {
        console.warn('Failed to update love status', err);
      }
      return;
    }
  });

  // delegated handler for delete buttons in history log
  document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest && ev.target.closest('.feeling-delete-btn');
    if (!btn) return;
    ev.preventDefault();
    const ts = btn.getAttribute('data-ts');
    if (!ts) return;
    try {
      btn.disabled = true;
      btn.classList.add('deleting');
      const res = await fetch('/feeling', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: ts })
      });
      if (res.ok) {
        // remove the entry element from DOM
        const entryEl = btn.closest('.history-entry');
        if (entryEl) entryEl.remove();
      } else {
        console.warn('Failed to delete feeling', await res.text());
        btn.disabled = false;
        btn.classList.remove('deleting');
      }
    } catch (err) {
      console.warn('Failed to delete feeling', err);
      btn.disabled = false;
      btn.classList.remove('deleting');
    }
  });

  function getEmoticon(feeling) {
    const lower = feeling.toLowerCase();
    if (lower.includes('happy') || lower.includes('great') || lower.includes('wonderful') || lower.includes('excellent') || lower.includes('amazing')) return '😊';
    if (lower.includes('sad') || lower.includes('bad') || lower.includes('terrible') || lower.includes('awful')) return '😢';
    if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('sleepy')) return '😴';
    if (lower.includes('stressed') || lower.includes('anxious') || lower.includes('worried')) return '😰';
    if (lower.includes('confused') || lower.includes('puzzled')) return '🤔';
    if (lower.includes('excited') || lower.includes('thrilled')) return '🤩';
    if (lower.includes('love') || lower.includes('grateful') || lower.includes('thankful')) return '🥰';
    if (lower.includes('normal') || lower.includes('okay') || lower.includes('fine')) return '😐';
    return '💭';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Add fade-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  loadTodayFeeling();
  loadFeelingHistory();
})();

// Notes Widget - handle user notes with auto-save
(() => {
  const notesInput = document.getElementById('notesInput');
  if (!notesInput) return;

  let notesTimer = null;

  function setNotesStatus(state, text) {
    const el = document.getElementById('notesSaveStatus');
    if (!el) return;
    el.classList.remove('saved', 'saving', 'error');
    if (state) el.classList.add(state);
    if (typeof text === 'string') el.textContent = text;
  }

  // Auto-save notes when user stops typing
  notesInput.addEventListener('input', () => {
    setNotesStatus('saving', 'Saving…');
    if (notesTimer) clearTimeout(notesTimer);
    notesTimer = setTimeout(async () => {
      await saveNotes();
    }, 1000); // Save after 1 second of no typing
  });

  async function saveNotes() {
    const notesText = notesInput.value || '';
    try {
      const res = await fetch('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesText })
      });
      if (res.ok) {
        setNotesStatus('saved', 'Saved ✓');
        setTimeout(() => setNotesStatus('', ''), 2000);
      } else {
        setNotesStatus('error', 'Save failed');
        console.warn('Failed to save notes', await res.text());
      }
    } catch (err) {
      setNotesStatus('error', 'Save failed');
      console.warn('Failed to save notes', err);
    }
  }

  // Load notes on page load
  async function loadNotes() {
    try {
      const res = await fetch('/notes');
      if (res.ok) {
        const data = await res.json();
        if (data && data.notes !== undefined) {
          notesInput.value = data.notes;
        }
      }
    } catch (e) {
      console.warn('Failed to load notes', e);
    }
  }

  loadNotes();
})();

// To-Do List Widget - handle todo items with auto-save
(() => {
  const todoInput = document.getElementById('todoInput');
  const addTodoBtn = document.getElementById('addTodoBtn');
  const todoListActive = document.getElementById('todoListActive');
  const todoListCompleted = document.getElementById('todoListCompleted');
  if (!todoInput || !addTodoBtn || !todoListActive || !todoListCompleted) return;

  let todos = [];

  function setTodoStatus(state, text) {
    const el = document.getElementById('todoSaveStatus');
    if (!el) return;
    el.classList.remove('saved', 'saving', 'error');
    if (state) el.classList.add(state);
    if (typeof text === 'string') el.textContent = text;
  }

  function renderTodos() {
    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

    // Render active todos
    if (activeTodos.length === 0) {
      todoListActive.innerHTML = '<div class="todo-empty">No active tasks ✨</div>';
    } else {
      todoListActive.innerHTML = activeTodos.map((todo) => {
        const dateStr = formatDate(todo.createdAt);
        return `
          <div class="todo-item" data-id="${todo.id}">
            <div class="todo-checkbox" data-id="${todo.id}"></div>
            <div class="todo-text">${escapeHtml(todo.text)}</div>
            <div class="todo-date">${dateStr}</div>
            <button class="todo-delete" data-id="${todo.id}">
              <img src="/delete.png" alt="Delete" class="todo-delete-icon" />
            </button>
          </div>
        `;
      }).join('');
    }

    // Render completed todos
    if (completedTodos.length === 0) {
      todoListCompleted.innerHTML = '<div class="todo-empty">No completed tasks</div>';
    } else {
      todoListCompleted.innerHTML = completedTodos.map((todo) => {
        const dateStr = formatDate(todo.createdAt);
        return `
          <div class="todo-item completed" data-id="${todo.id}">
            <div class="todo-checkbox" data-id="${todo.id}"></div>
            <div class="todo-text">${escapeHtml(todo.text)}</div>
            <div class="todo-date">${dateStr}</div>
            <button class="todo-delete" data-id="${todo.id}">
              <img src="/delete.png" alt="Delete" class="todo-delete-icon" />
            </button>
          </div>
        `;
      }).join('');
    }
  }

  function formatDate(isoString) {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'N/A';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch (e) {
      return 'N/A';
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function saveTodos() {
    try {
      setTodoStatus('saving', 'Saving…');
      console.log('Saving todos:', todos);
      const res = await fetch('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos })
      });
      if (res.ok) {
        const result = await res.json();
        console.log('Save result:', result);
        setTodoStatus('saved', 'Saved ✓');
        setTimeout(() => setTodoStatus('', ''), 2000);
      } else {
        setTodoStatus('error', 'Save failed');
        console.warn('Failed to save todos', await res.text());
      }
    } catch (err) {
      setTodoStatus('error', 'Save failed');
      console.warn('Failed to save todos', err);
    }
  }

  async function loadTodos() {
    try {
      const res = await fetch('/todos');
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded todos data:', data);
        if (data && Array.isArray(data.todos)) {
          todos = data.todos;
          // Ensure all todos have createdAt
          todos = todos.map(todo => ({
            ...todo,
            createdAt: todo.createdAt || new Date().toISOString()
          }));
          console.log('Todos after load:', todos);
          renderTodos();
        }
      }
    } catch (e) {
      console.warn('Failed to load todos', e);
    }
  }

  function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    const newTodo = {
      id: Date.now().toString(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString()
    };

    todos.push(newTodo);
    todoInput.value = '';
    renderTodos();
    saveTodos();
  }

  // Add todo on button click
  addTodoBtn.addEventListener('click', addTodo);

  // Add todo on Enter key
  todoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTodo();
    }
  });

  // Toggle complete and delete using event delegation on both lists
  function handleTodoClick(e) {
    const checkbox = e.target.closest('.todo-checkbox');
    const deleteBtn = e.target.closest('.todo-delete');
    const todoText = e.target.closest('.todo-text');

    if (checkbox) {
      const id = checkbox.getAttribute('data-id');
      const todo = todos.find(t => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
        renderTodos();
        saveTodos();
      }
    } else if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      todos = todos.filter(t => t.id !== id);
      renderTodos();
      saveTodos();
    }
  }

  // Handle double click to edit todo text
  function handleTodoDoubleClick(e) {
    const todoText = e.target.closest('.todo-text');
    if (!todoText) return;

    const id = todoText.closest('.todo-item').getAttribute('data-id');
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-edit-input';
    input.value = todo.text;

    // Replace text with input
    const todoItem = todoText.closest('.todo-item');
    todoText.replaceWith(input);
    input.focus();
    input.select();

    // Save on Enter or blur
    function saveEdit() {
      const newText = input.value.trim();
      if (newText && newText !== todo.text) {
        todo.text = newText;
        saveTodos();
      }
      renderTodos();
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        renderTodos(); // Cancel edit
      }
    });

    input.addEventListener('blur', saveEdit);
  }

  todoListActive.addEventListener('click', handleTodoClick);
  todoListCompleted.addEventListener('click', handleTodoClick);
  todoListActive.addEventListener('dblclick', handleTodoDoubleClick);
  todoListCompleted.addEventListener('dblclick', handleTodoDoubleClick);

  loadTodos();
})();

// Progress Calendar Widget - track daily activity
(() => {
  const calendarGrid = document.getElementById('calendarGrid');
  const calendarMonth = document.getElementById('calendarMonth');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  
  if (!calendarGrid) return;

  let currentDate = new Date();
  let activeDays = new Set(); // Store active dates in YYYY-MM-DD format

  // Load activity data from backend
  async function loadActivityData() {
    try {
      const res = await fetch('/activity');
      if (res.ok) {
        const data = await res.json();
        activeDays = new Set(data.activeDays || []);
        console.log('Loaded activity data from storage:', data);
      }
    } catch (e) {
      console.warn('Failed to load activity data', e);
    }
    // Always render calendar even if data fetch fails
    renderCalendar();
  }

  // Save activity data to backend
  async function saveActivityData() {
    try {
      const dataToSave = Array.from(activeDays);
      console.log('Saving activity data:', dataToSave);
      const res = await fetch('/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeDays: dataToSave })
      });
      if (res.ok) {
        console.log('Activity data saved successfully');
      } else {
        console.error('Failed to save activity data, status:', res.status);
      }
    } catch (e) {
      console.warn('Failed to save activity data', e);
    }
  }

  // Mark today as active (called when user updates reading/listening)
  window.markTodayActive = function() {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    console.log('Marking day as active:', dateKey);
    if (!activeDays.has(dateKey)) {
      activeDays.add(dateKey);
      console.log('New active day added. Total active days:', activeDays.size);
      saveActivityData();
      renderCalendar();
    } else {
      console.log('Day already marked as active');
    }
  };

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    calendarMonth.textContent = `${monthNames[month]} ${year}`;

    // Clear grid
    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayHeaders.forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      calendarGrid.appendChild(header);
    });

    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    const firstDay = new Date(year, month, 1).getDay();
    // Convert to Monday-first (0 = Monday, 6 = Sunday)
    const firstDayMon = firstDay === 0 ? 6 : firstDay - 1;

    // Get last day of month
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    // Get last day of previous month
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    // Add previous month days
    for (let i = firstDayMon - 1; i >= 0; i--) {
      const day = document.createElement('div');
      day.className = 'calendar-day other-month';
      day.textContent = prevMonthLastDate - i;
      calendarGrid.appendChild(day);
    }

    // Add current month days
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    
    for (let date = 1; date <= lastDate; date++) {
      const day = document.createElement('div');
      day.className = 'calendar-day';
      day.textContent = date;

      // Store date key for click handling
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      day.setAttribute('data-date', dateKey);

      // Check if today
      if (isCurrentMonth && date === today.getDate()) {
        day.classList.add('today');
      }

      // Check if active day
      if (activeDays.has(dateKey)) {
        day.classList.add('active');
      }

      calendarGrid.appendChild(day);
    }

    // Add next month days to fill the grid
    const totalCells = calendarGrid.children.length - 7; // Subtract day headers
    const remainingCells = (Math.ceil(totalCells / 7) * 7) - totalCells;
    for (let date = 1; date <= remainingCells; date++) {
      const day = document.createElement('div');
      day.className = 'calendar-day other-month';
      day.textContent = date;
      calendarGrid.appendChild(day);
    }

    // Update stats
    updateStats();
  }

  function updateStats() {
    const activeDaysCountEl = document.getElementById('activeDaysCount');
    if (activeDaysCountEl) {
      activeDaysCountEl.textContent = activeDays.size;
    }
  }

  // Navigation
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });
  }

  // Double-click to toggle active day
  if (calendarGrid) {
    calendarGrid.addEventListener('dblclick', (e) => {
      const dayElement = e.target;
      
      // Only process clicks on calendar days (not headers or other-month days)
      if (!dayElement.classList.contains('calendar-day') || 
          dayElement.classList.contains('calendar-day-header') ||
          dayElement.classList.contains('other-month')) {
        return;
      }

      const dateKey = dayElement.getAttribute('data-date');
      if (!dateKey) return;

      // Toggle active state
      if (activeDays.has(dateKey)) {
        activeDays.delete(dateKey);
        console.log('Removed active day:', dateKey);
      } else {
        activeDays.add(dateKey);
        console.log('Added active day:', dateKey);
      }

      console.log('Total active days:', activeDays.size);
      
      // Save and re-render
      saveActivityData();
      renderCalendar();
    });
  }

  // Initial render
  loadActivityData();
})();
