// old echo form removed; no-op

// User name box: save with progress and show saved state
(() => {
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
          // prettier SVG star so it's crisp and doesn't obscure input text
          star.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#f4f402" stroke="#D1D100" stroke-width="0.2"/></svg>';
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
        star.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#FFFF00" stroke="#ffd700" stroke-width="0.2"/></svg>';
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
    onCellInput(e);
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
    // reflect saved status in UI
    try { setProgressStatus('saved', 'Saved'); } catch (e) {}
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

  // Handle Enter key to save and update log immediately
  feelingInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
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
            // optimistically prepend the new entry to history without reloading from server
            appendFeelingToHistory(payload);
          feelingInput.value = '';
          feelingInput.blur();
          setFeelingStatus('saved', 'Saved');
        } else {
          setFeelingStatus('error', 'Save failed');
          console.warn('Failed to save feeling', await res.text());
        }
      } catch (err) {
        setFeelingStatus('error', 'Save failed');
        console.warn('Failed to save feeling', err);
      }
    }
  });

  // Load today's feeling on page load
  async function loadTodayFeeling() {
    try {
      const today = getTodayKey().replace('feelings_', '');
      const res = await fetch(`/feeling?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.feeling) {
          feelingInput.value = data.feeling;
        }
      }
    } catch (e) {
      console.warn('Failed to load feeling', e);
    }
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

      // Sort by date descending (newest first)
      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      historyLog.innerHTML = history.map((entry, idx) => {
        // Use stored timestamp when available and display in UTC+7
        const ts = entry.timestamp || (entry.date ? (entry.date + 'T00:00:00Z') : null);
        const dateObj = ts ? new Date(ts) : new Date();
        const formattedDate = dateObj.toLocaleString('en-GB', {
          timeZone: 'Asia/Ho_Chi_Minh',
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) + ' (UTC+7)';
        const emoticon = getEmoticon(entry.feeling);
        
        return `
          <div class="history-entry" style="animation: fadeInUp 0.5s ease-out ${idx * 0.05}s both;">
            <div class="history-date">
              <span>${emoticon}</span>
              <span>${formattedDate}</span>
            </div>
            <div class="history-name">${escapeHtml(entry.name)}</div>
            <div class="history-feeling">"${escapeHtml(entry.feeling)}"</div>
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
      const formattedDate = dateObj.toLocaleString('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }) + ' (UTC+7)';
      const emoticon = getEmoticon(entry.feeling);

      const wrapper = document.createElement('div');
      wrapper.className = 'history-entry new-entry';
      wrapper.style.animation = 'fadeInUp 0.45s ease-out both';
      wrapper.innerHTML = `
        <div class="history-date">
          <span>${emoticon}</span>
          <span>${formattedDate}</span>
        </div>
        <div class="history-name">${escapeHtml(entry.name)}</div>
        <div class="history-feeling">"${escapeHtml(entry.feeling)}"</div>
      `;
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
