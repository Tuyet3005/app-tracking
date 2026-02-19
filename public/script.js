import { addBlurOrEnterListener, html } from "./utils.js";

// Constants for save statuses
const SAVING_STATUSES = {
  SAVING: "saving",
  SAVED: "saved",
  ERROR: "error",
};

const SAVING_STATUS_TEXT = {
  [SAVING_STATUSES.SAVING]: "Saving…",
  [SAVING_STATUSES.SAVED]: "Saved",
  [SAVING_STATUSES.ERROR]: "Save failed",
};

// Logout functionality
(() => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to logout?")) return;

    try {
      const response = await fetch("/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        window.location.href = "/login.html";
      } else {
        alert("Failed to logout. Please try again.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("An error occurred during logout.");
    }
  });
})();

// User name box: save with progress and show saved state
(() => {
  // Clear cloud input on page load
  const nameInput = /** @type {HTMLInputElement} */ (
    document.getElementById("usernameBox")
  );
  if (!nameInput) return;

  /**
   * @param {string} name
   */
  function showDisplayName(name) {
    document.title = `🌼IELTS Orange tracking 🌼 --- ${name}`;

    const displayNameSpan = document.getElementById("displayName");
    if (displayNameSpan) {
      displayNameSpan.textContent = name;
    }
  }

  // Load user display name on page load
  async function loadUserDisplayName() {
    try {
      const response = await fetch("/me");

      if (response.status === 401) {
        // Not logged in, redirect to login page
        window.location.href = "/login.html";
        return;
      }

      const user = await response.json();
      const displayName = user.displayName || "";

      nameInput.value = "dev by Tuyết 🎐";

      showDisplayName(displayName);

      // Show Manage button only for user with username 'tuyet'
      const manageBtn = document.getElementById("manageBtn");
      if (manageBtn) {
        const uname = (user.username || "").toString().toLowerCase();
        manageBtn.style.display = uname === "tuyet" ? "" : "none";
      }
    } catch (error) {
      console.error("Error loading user display name:", error);
    }
  }

  // Save display name to server
  async function saveDisplayName() {
    const displayName = nameInput.value.trim();

    if (!displayName) {
      setProgressStatus(SAVING_STATUSES.ERROR);
      return;
    }

    showDisplayName(displayName);

    try {
      const response = await fetch("/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName }),
      });

      if (response.ok) {
        setProgressStatus(SAVING_STATUSES.SAVED);
      } else {
        console.error("Failed to update display name");
        setProgressStatus(SAVING_STATUSES.ERROR);
      }
    } catch (error) {
      console.error("Error updating display name:", error);
      setProgressStatus(SAVING_STATUSES.ERROR);
    }
  }

  addBlurOrEnterListener(nameInput, saveDisplayName);

  // Load display name when page loads
  loadUserDisplayName();
})();

// Manage button: open hosted admin page in a new tab
(() => {
  const manageBtn = document.getElementById("manageBtn");
  if (!manageBtn) return;

  manageBtn.addEventListener("click", () => {
    // Open the hosted admin page in a new tab (safe opener)
    window.open("/admin.html", "_blank", "noopener,noreferrer");
  });
})();

// Practice Progress tables (3 passages side-by-side)
(() => {
  const container = document.getElementById("practice-container");
  if (!container) return;

  const passages = ["Passage 1", "Passage 2", "Passage 3"];
  const parts = ["Part 1", "Part 2", "Part 3", "Part 4"];
  const rows = Array.from({ length: 11 }, (_, i) => `Cam${10 + i}`); // Cam10..Cam20
  const cols = Array.from({ length: 4 }, (_, i) => `Test${i + 1}`); // Test1..Test4

  // Centralized function to generate input cell HTML
  function inputCellHtml({ dataType, dataValue, col, row }) {
    return html`
      <td>
        <div class="cell-wrapper">
          <input
            type="text"
            class="practice-input"
            data-${dataType}="${dataValue}"
            data-col="${col}"
            data-row="${row}"
            placeholder="0/0"
          />
          <button
            type="button"
            class="cell-status-btn"
            aria-label="Toggle cell status"
            data-${dataType}="${dataValue}"
            data-col="${col}"
            data-row="${row}"
          ></button>
        </div>
      </td>
    `;
  }

  function createTableElement(title) {
    const wrapper = document.createElement("div");
    wrapper.className = "practice-wrapper";

    // Create header with badge, title, stats, and average
    const avgValue = title === "Passage 3" ? "0/14" : "0/13";
    const avgSpanHTML =
      title === "Passage 1" || title === "Passage 2" || title === "Passage 3"
        ? `<span class="table-avg table-stats" style="margin-left:10px;font-weight:800;font-size:0.9rem;color:#164e63;background:linear-gradient(90deg, #f0fdf4 0%, #fefce8 100%);box-shadow:0 8px 20px rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.08);border-radius:10px;padding:6px 10px;">${avgValue}</span>`
        : "";

    wrapper.innerHTML = html`
      <h3>
        <span class="badge">${title.replace("Passage ", "P")}</span>
        <span style="width:8ch;margin-left:6px;font-weight:600;">${title}</span>
        <span
          class="table-stats"
          data-passage="${title}"
          style="margin-left:8px;font-weight:700;font-size:0.85rem;color:#475569;"
          >0/0</span
        >
        ${avgSpanHTML}
      </h3>
      <table class="practice">
        <thead>
          <tr>
            <th></th>
            ${cols.map((c) => `<th>${c}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
          <tr>
            <th>${r}</th>
            ${cols
              .map((c) =>
                inputCellHtml({
                  dataType: "passage",
                  dataValue: title,
                  col: c,
                  row: r,
                }),
              )
              .join("")}
          </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
      <div class="legend">
        <span>Low</span>
        <div class="legend-bar"></div>
        <span>High</span>
      </div>
    `;

    // Add event listeners after DOM creation
    wrapper.querySelectorAll("input.practice-input").forEach((input) => {
      input.addEventListener("input", onPracticeCellInput);
      addBlurOrEnterListener(input, onPracticeCellConfirm);

      const statusBtn = input.parentElement.querySelector(".cell-status-btn");
      const td = input.closest("td");
      if (statusBtn && td) {
        statusBtn.addEventListener("click", (e) =>
          onStatusBtnClick(e, input, td),
        );
      }
    });

    return wrapper;
  }

  // create a listening table (uses data-part attributes and saved under `parts`)
  function createListeningTableElement(title) {
    const wrapper = document.createElement("div");
    wrapper.className = "practice-wrapper";

    wrapper.innerHTML = html`
      <h3>
        <span class="badge">${title.replace("Part ", "P")}</span>
        <span style="width:8ch;margin-left:6px;font-weight:600;">${title}</span>
        <span
          class="table-stats"
          data-part="${title}"
          style="margin-left:8px;font-weight:700;font-size:0.85rem;color:#475569;"
          >0/0</span
        >
        <span
          class="table-avg table-stats"
          style="margin-left:10px;font-weight:800;font-size:0.9rem;color:#164e63;background:linear-gradient(90deg, #f0fdf4 0%, #fefce8 100%);box-shadow:0 8px 20px rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.08);border-radius:10px;padding:6px 10px;"
          ><span style="color:#e11d48;font-weight:900;">0</span>/10</span
        >
      </h3>
      <table class="practice">
        <thead>
          <tr>
            <th></th>
            ${cols.map((c) => `<th>${c}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <th>${r}</th>
              ${cols
                .map((c) =>
                  inputCellHtml({
                    dataType: "part",
                    dataValue: title,
                    col: c,
                    row: r,
                  }),
                )
                .join("")}
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      <div class="legend">
        <span>Low</span>
        <div class="legend-bar"></div>
        <span>High</span>
      </div>
    `;

    // Add event listeners after DOM creation
    wrapper.querySelectorAll("input.practice-input").forEach((input) => {
      input.addEventListener("input", onPracticeCellInput);
      input.addEventListener("blur", onPracticeCellConfirm);

      const statusBtn = input.parentElement.querySelector(".cell-status-btn");
      const td = input.closest("td");
      if (statusBtn && td) {
        statusBtn.addEventListener("click", (e) =>
          onStatusBtnClick(e, input, td),
        );
      }
    });

    return wrapper;
  }

  // Update per-table and overall totals for reading/listening
  function updateTotals() {
    const containers = document.querySelectorAll(".practice-wrapper");
    const statsMap = {};

    for (const container of containers) {
      const results = [
        ...container.querySelectorAll("input.practice-input"),
      ].map((input) => (input.value || "").trim());

      let totalDone = 0;
      let total = results.length;
      let totalScore = 0;
      let totalMaxScore = 0;

      for (const result of results) {
        if (!result) continue;

        try {
          const [correct, max] = result
            .split("/")
            .map((s) => parseInt(s.trim()));
          if (isNaN(correct) || isNaN(max)) continue;

          totalDone += 1;
          totalScore += correct;
          totalMaxScore += max;
        } catch {}
      }

      const donePercentage =
        total > 0 ? Math.round((totalDone / total) * 100) : 0;
      const avgMaxScore =
        totalDone > 0 ? Math.round((totalMaxScore / totalDone) * 10) / 10 : 0;
      const avgScore =
        totalDone > 0
          ? Math.min(
              avgMaxScore,
              Math.round((totalScore / totalDone) * 10) / 10,
            )
          : 0;

      const statsEl = container.querySelector(".table-stats:not(.table-avg)");
      statsEl.innerHTML = html`
        ${totalDone}/${total}
        <span class="percent ${donePercentage >= 90 ? "pulse" : ""}"
          >${donePercentage}%</span
        >
      `;

      const avgEl = container.querySelector(".table-avg");
      avgEl.innerHTML = html`
        <span style="color:#e11d48;font-weight:900;">${avgScore}</span>
        /${avgMaxScore}
      `;

      const statsId = container.parentElement.dataset.statsId;
      statsMap[statsId] = statsMap[statsId] || { done: 0, total: 0 };
      statsMap[statsId].done += totalDone;
      statsMap[statsId].total += total;
    }

    for (const [key, stats] of Object.entries(statsMap)) {
      const statSpan = document.getElementById(key);
      const donePercentage =
        stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
      statSpan.innerHTML = html`
        Completed ${stats.done}/${stats.total}
        <span class="percent ${donePercentage >= 90 ? "pulse" : ""}">
          ${donePercentage}%
        </span>
      `;
    }
  }

  function onPracticeCellInput(e) {
    const input = e.target;
    const v = (input.value || "").trim();
    const m = v.match(/^(\d+)\s*\/\s*(\d+)$/);
    const td = input.closest("td");

    if (!m) {
      input.parentElement.style.background = "";
      input.parentElement.style.color = "";
      input.title = "";
      // remove cell border
      if (td) td.classList.remove("cell-with-value");
      // hide star
      input.parentElement.classList.remove("starred");
      return;
    }

    const correct = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (isNaN(correct) || isNaN(total) || total <= 0) {
      input.parentElement.style.background = "";
      input.parentElement.style.color = "";
      input.title = "Invalid numbers";
      // remove cell border
      if (td) td.classList.remove("cell-with-value");
      // hide star
      input.parentElement.classList.remove("starred");
      return;
    }

    const wrong = Math.max(0, total - correct);
    const ratio = Math.max(0, Math.min(1, correct / total));
    applyColor(input.parentElement, ratio);
    input.title = `${correct}/${total} — wrong: ${wrong} — ${Math.round(ratio * 100)}%`;

    // show cell border for cells with values
    if (td) {
      td.classList.add("cell-with-value");
    }

    // show star when perfect
    if (correct === total && total > 0) {
      input.parentElement.classList.add("starred");
    } else {
      input.parentElement.classList.remove("starred");
    }
  }

  function onPracticeCellConfirm(e) {
    const input = e.target;
    const prevValue = input.getAttribute("data-prev-value") || "";
    const currentValue = (input.value || "").trim();

    // Skip API call if value hasn't changed
    if (prevValue === currentValue) {
      onPracticeCellInput(e);
      return;
    }

    const partName =
      input.getAttribute("data-passage") || input.getAttribute("data-part");
    const cambridgeVersion = input.getAttribute("data-row");
    const testName = input.getAttribute("data-col");

    setProgressStatus(SAVING_STATUSES.SAVING, "Saving…");
    fetch("/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partName,
        cambridgeVersion,
        testName,
        result: currentValue,
      }),
    })
      .then(() => {
        setProgressStatus(SAVING_STATUSES.SAVED, "Saved");
        updateTotals();
      })
      .catch(() => setProgressStatus(SAVING_STATUSES.ERROR, "Save failed"));

    onPracticeCellInput(e);

    // Mark today as active if user entered a valid value (not 0/0 or empty)
    if (currentValue && currentValue !== "0/0" && currentValue !== prevValue) {
      const match = currentValue.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (match) {
        const correct = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        // Mark active if it's a valid entry (not just 0/0)
        if (total > 0 && (correct > 0 || total > 0)) {
          if (typeof window.markTodayActive === "function") {
            window.markTodayActive();
          }
        }
      }
    }

    // Store current value for next comparison
    input.setAttribute("data-prev-value", currentValue);
  }

  function onStatusBtnClick(e, input, td) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target;
    const isMarked = btn.classList.toggle("marked");

    const partName =
      input.getAttribute("data-passage") || input.getAttribute("data-part");
    const cambridgeVersion = input.getAttribute("data-row");
    const testName = input.getAttribute("data-col");

    setProgressStatus(SAVING_STATUSES.SAVING, "Saving…");
    fetch("/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partName,
        cambridgeVersion,
        testName,
        result: input.value.trim(),
        needReview: isMarked,
      }),
    })
      .then(() => setProgressStatus(SAVING_STATUSES.SAVED, "Saved"))
      .catch(() => setProgressStatus(SAVING_STATUSES.ERROR, "Save failed"));

    if (isMarked) {
      td.classList.add("marked");
    } else {
      td.classList.remove("marked");
    }

    // update totals after cell changes
    try {
      updateTotals();
    } catch (err) {}
  }

  function applyColor(el, ratio) {
    const hue = Math.round(ratio * 120); // 0 (red) -> 120 (green)
    const saturation = 60; // pastel saturation
    const lightness = 82; // pastel lightness
    el.style.background = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    el.style.color = "#000";
  }

  container.innerHTML = "";
  passages.forEach((p) => container.appendChild(createTableElement(p)));
  // create listening tables area (Parts)
  const listeningContainer = document.getElementById("listening-container");
  if (listeningContainer) {
    listeningContainer.innerHTML = "";
    parts.forEach((pt) =>
      listeningContainer.appendChild(createListeningTableElement(pt)),
    );
    // Clear all listening data cells on load
    listeningContainer
      .querySelectorAll("input.practice-input")
      .forEach((input) => {
        input.value = "";
        input.parentElement.style.background = "";
        input.parentElement.style.color = "";
        input.title = "";
        input.parentElement.classList.remove("starred");
      });
  }

  // apply a progress object to the UI (used by initial load and polling)
  function applyProgress(obj) {
    const map = (obj && obj.passages) || {};
    const partsMap = (obj && obj.parts) || {};
    const cellStates = (obj && obj.cellStates) || {};
    document.querySelectorAll("input.practice-input").forEach((input) => {
      const part = input.getAttribute("data-part");
      const p = input.getAttribute("data-passage");
      const r = input.getAttribute("data-row");
      const c = input.getAttribute("data-col");
      let v = "";
      if (part) {
        v = (partsMap[part] && partsMap[part][r] && partsMap[part][r][c]) || "";
      } else {
        const pass = p || "Passage 1";
        v = (map[pass] && map[pass][r] && map[pass][r][c]) || "";
      }
      input.value = v;
      // Store initial value for activity tracking
      input.setAttribute("data-prev-value", v);
      // trigger coloring
      const ev = { target: input };
      onPracticeCellInput(ev);

      // restore button marked state
      if (v) {
        const key = `${p || part || "default"}_${r}_${c}`;
        const isMarked = cellStates[key] || false;
        const statusBtn = input.parentElement.querySelector(".cell-status-btn");
        const td = input.closest("td");
        if (isMarked && statusBtn && td) {
          statusBtn.classList.add("marked");
          td.classList.add("marked");
        }
      }
    });
    // reflect saved status in UI and update totals
    try {
      setProgressStatus(SAVING_STATUSES.SAVED, "Saved");
    } catch (e) {
      console.error("Failed to set progress status after loading", e);
    }
    try {
      updateTotals();
    } catch (e) {
      console.error("Failed to update totals after loading", e);
    }
  }

  // Load saved progress from server and populate inputs
  async function loadProgress() {
    try {
      const res = await fetch("/progress");
      if (!res.ok) return;
      const obj = await res.json();
      applyProgress(obj);
    } catch (e) {
      console.warn("Failed to load progress", e);
    }
  }

  loadProgress();
})();

// Feelings Cloud Widget - handle daily feelings
(() => {
  const feelingInput = document.getElementById("feelingInput");
  if (!feelingInput) return;

  // Cloud collapse/expand functionality
  const cloudWidget = document.getElementById("feeling-cloud");
  const cloudImg = document.getElementById("cloudImg");
  const minimizeBtn = document.getElementById("cloudMinimizeBtn");

  // Check localStorage for saved state
  const savedCollapsedState = localStorage.getItem("cloudCollapsed");
  if (savedCollapsedState === "true") {
    cloudWidget.classList.add("collapsed");
  }

  // Minimize button click handler
  minimizeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    cloudWidget.classList.add("collapsed");
    localStorage.setItem("cloudCollapsed", "true");
  });

  // Cloud image click handler (when collapsed, expand it)
  if (cloudImg) {
    cloudImg.addEventListener("click", (e) => {
      if (cloudWidget.classList.contains("collapsed")) {
        e.stopPropagation();
        cloudWidget.classList.remove("collapsed");
        localStorage.setItem("cloudCollapsed", "false");
        // Focus on textarea after expanding
        setTimeout(() => feelingInput.focus(), 200);
      }
    });
  }

  function getTodayKey() {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `feelings_${today}`;
  }
  // UI helper for feeling save status
  function setFeelingStatus(state, text) {
    const el = document.getElementById("feelingSaveStatus");
    if (!el) return;
    el.classList.remove(
      SAVING_STATUSES.SAVED,
      SAVING_STATUSES.SAVING,
      SAVING_STATUSES.ERROR,
    );
    if (state) el.classList.add(state);
    if (typeof text === "string") el.textContent = text;
    // Refresh backup status when save completes (not while saving)
    if (
      state !== SAVING_STATUSES.SAVING &&
      typeof window.refreshBackupStatus === "function"
    ) {
      window.refreshBackupStatus();
    }
  }

  // Lưu feeling vào localStorage khi nhập liệu
  feelingInput.addEventListener("input", () => {
    const key = getTodayKey();
    localStorage.setItem(key, feelingInput.value || "");
  });

  // Handle Ctrl/Cmd+Enter to save (allow Enter for newline in textarea)
  feelingInput.addEventListener("keydown", async (e) => {
    const isSubmit = e.key === "Enter" && (e.ctrlKey || e.metaKey);
    if (!isSubmit) return; // otherwise allow newline
    e.preventDefault();
    e.stopPropagation();

    const feelingText = (feelingInput.value || "").trim();
    const usernameEl = document.getElementById("usernameBox");
    const username = (usernameEl && usernameEl.value) || "Anonymous";

    if (!feelingText) return;

    const payload = {
      timestamp: new Date().toISOString(),
      name: username,
      feeling: feelingText,
    };

    try {
      setFeelingStatus(SAVING_STATUSES.SAVING, "Saving…");
      const res = await fetch("/feelings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // Reload the full history to get the new entry with its ID
        await loadFeelingHistory();
        // Clear all user input in cloud area
        feelingInput.value = "";
        localStorage.removeItem(getTodayKey());
        setFeelingStatus("", ""); // clear status text
        feelingInput.blur();
      } else {
        setFeelingStatus(SAVING_STATUSES.ERROR, "Save failed");
        console.warn("Failed to save feeling", await res.text());
      }
    } catch (err) {
      setFeelingStatus(SAVING_STATUSES.ERROR, "Save failed");
      console.warn("Failed to save feeling", err);
    }
  });

  // Load feeling history from server
  window.loadFeelingHistory = async function () {
    try {
      const res = await fetch("/feelings");
      if (!res.ok) return;
      const history = (await res.json()) || [];

      const historyLog = document.getElementById("history-log");
      if (!historyLog) return;

      if (!history || history.length === 0) {
        historyLog.innerHTML =
          '<div class="history-empty">📝 No feelings logged yet. Start sharing above! 💭</div>';
        return;
      }

      // Sort by timestamp/date descending (newest first)
      history.sort((a, b) => {
        const aTime = new Date(a.timestamp || a.date);
        const bTime = new Date(b.timestamp || b.date);
        return bTime - aTime;
      });

      historyLog.innerHTML = history
        .map((entry, idx) => {
          // Use stored timestamp when available and display in UTC+7
          const ts =
            entry.timestamp || (entry.date ? entry.date + "T00:00:00Z" : null);
          const dateObj = ts ? new Date(ts) : new Date();
          const weekday = dateObj.toLocaleDateString("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            weekday: "short",
          });
          const dateOnly = dateObj.toLocaleDateString("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const formattedDate = `${weekday}, ${dateOnly}`;
          const emoticon = getEmoticon(entry.feeling);
          const isLoved = entry.isLoved ? "loved" : "";
          const heartIcon = entry.isLoved ? "❤️" : "🤍";
          // Tự động xuống dòng cho URL dài, không ảnh hưởng từ khác, đồng thời in đậm **text**
          let feelingHtml = escapeHtml(entry.feeling).replace(/\n/g, "<br>");
          // In đậm **text**
          feelingHtml = feelingHtml.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
          // Xuống dòng cho URL dài
          feelingHtml = feelingHtml.replace(
            /(https?:\/\/[^\s<>"']+)/g,
            function (url) {
              return `<span class=\"break-url\">${url}</span>`;
            },
          );
          return `
          <div class="history-entry" data-id="${entry.id || ""}" style="animation: fadeInUp 0.5s ease-out ${idx * 0.05}s both;">
            <div class="history-header">
              <div class="history-left">
                <span class="history-emoticon">${emoticon}</span>
                <span class="history-date">${formattedDate}</span>
                <span class="history-user"> — ${escapeHtml(entry.name)}</span>
              </div>
              <div class="history-actions">
                <button class="feeling-love-btn ${isLoved}" data-id="${entry.id || ""}" aria-label="Like feeling">${heartIcon}</button>
                <button class="feeling-delete-btn" data-id="${entry.id || ""}" aria-label="Delete feeling">
                  <img src="/delete.png" alt="Delete" class="feeling-delete-icon" />
                </button>
              </div>
            </div>
            <div class="history-feeling">"${feelingHtml}"</div>
          </div>
        `;
        })
        .join("");
    } catch (e) {
      console.warn("Failed to load feeling history", e);
    }
  };

  // Enable double-click to edit feelings in the log
  document.addEventListener("dblclick", function (ev) {
    const feelingDiv = ev.target.closest(".history-feeling");
    if (!feelingDiv) return;
    if (feelingDiv.querySelector("textarea")) return; // already editing
    const original = feelingDiv.innerText
      .replace(/^"|"$/g, "")
      .replace(/\n/g, "\n");
    const textarea = document.createElement("textarea");
    textarea.value = original;
    Object.assign(textarea.style, {
      width: "98%",
      minHeight: "40px",
      fontSize: "1rem",
      fontFamily: "inherit",
      borderRadius: "8px",
      border: "1px solid #cbd5e1",
      margin: "2px 0",
      padding: "4px 8px",
    });
    feelingDiv.innerHTML = "";
    feelingDiv.appendChild(textarea);
    textarea.focus();

    textarea.addEventListener("keydown", function (e) {
      // Ctrl+B to bold selected text
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        if (start !== end) {
          const before = textarea.value.substring(0, start);
          const selected = textarea.value.substring(start, end);
          const after = textarea.value.substring(end);
          // Use ** for markdown-like bold
          textarea.value = before + "**" + selected + "**" + after;
          // Restore selection
          textarea.selectionStart = start;
          textarea.selectionEnd = end + 4;
        }
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // Blur textarea to trigger blur handler, which will safely update innerHTML
        textarea.blur();
      }
      if (e.key === "Escape") {
        let html = original
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/\n/g, "<br>");
        html = html.replace(/(https?:\/\/[^\s<>"]+)/g, function (url) {
          if (url.length > 30) {
            return `<span style="word-break:break-all;">${url}</span>`;
          }
          return url;
        });
        feelingDiv.innerHTML = '"' + html + '"';
      }
    });
    textarea.addEventListener("blur", function () {
      // Đảm bảo textarea vẫn còn là con của feelingDiv và feelingDiv còn trong DOM
      if (!feelingDiv.isConnected) return;
      if (feelingDiv.contains(textarea)) {
        const newText = textarea.value.trim();
        const entryDiv = feelingDiv.closest(".history-entry");
        const id = entryDiv ? entryDiv.getAttribute("data-id") : null;
        const userSpan = entryDiv
          ? entryDiv.querySelector(".history-user")
          : null;
        let username = "Anonymous";
        if (userSpan) {
          // Lấy tên user từ text: ' — username'
          const match = userSpan.textContent.match(/—\s*(.*)/);
          if (match) username = match[1].trim();
        }
        // Gửi request chỉnh sửa cảm xúc đúng entry (không tạo mới)
        if (id && newText) {
          fetch(`/feelings/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ feeling: newText }),
          }).catch(() => {});
        }
        let html = newText
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/\n/g, "<br>");
        html = html.replace(/(https?:\/\/[^\s<>"]+)/g, function (url) {
          if (url.length > 30) {
            return `<span style="word-break:break-all;">${url}</span>`;
          }
          return url;
        });
        feelingDiv.innerHTML = '"' + html + '"';
      }
    });
  });
  document.addEventListener("click", async (ev) => {
    const loveBtn = ev.target.closest && ev.target.closest(".feeling-love-btn");
    if (loveBtn) {
      ev.preventDefault();
      const id = loveBtn.getAttribute("data-id");
      if (!id) return;
      try {
        const isCurrentlyLoved = loveBtn.classList.contains("loved");
        const newLovedState = !isCurrentlyLoved;
        // Optimistically update UI
        loveBtn.classList.toggle("loved", newLovedState);
        loveBtn.textContent = newLovedState ? "❤️" : "🤍";
        // Send to server
        const res = await fetch(`/feelings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isLoved: newLovedState }),
        });
        if (!res.ok) {
          // Revert on error
          loveBtn.classList.toggle("loved", isCurrentlyLoved);
          loveBtn.textContent = isCurrentlyLoved ? "❤️" : "🤍";
          console.warn("Failed to update love status", await res.text());
        }
      } catch (err) {
        console.warn("Failed to update love status", err);
      }
      return;
    }
  });

  // delegated handler for delete buttons in history log
  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest && ev.target.closest(".feeling-delete-btn");
    if (!btn) return;
    ev.preventDefault();
    const id = btn.getAttribute("data-id");
    if (!id) return;
    try {
      btn.disabled = true;
      btn.classList.add("deleting");
      const res = await fetch(`/feelings/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // remove the entry element from DOM
        const entryEl = btn.closest(".history-entry");
        if (entryEl) entryEl.remove();
      } else {
        console.warn("Failed to delete feeling", await res.text());
        btn.disabled = false;
        btn.classList.remove("deleting");
      }
    } catch (err) {
      console.warn("Failed to delete feeling", err);
      btn.disabled = false;
      btn.classList.remove("deleting");
    }
  });

  function getEmoticon(feeling) {
    const lower = feeling.toLowerCase();
    if (
      lower.includes("happy") ||
      lower.includes("great") ||
      lower.includes("wonderful") ||
      lower.includes("excellent") ||
      lower.includes("amazing")
    )
      return "😊";
    if (
      lower.includes("sad") ||
      lower.includes("bad") ||
      lower.includes("terrible") ||
      lower.includes("awful")
    )
      return "😢";
    if (
      lower.includes("tired") ||
      lower.includes("exhausted") ||
      lower.includes("sleepy")
    )
      return "😴";
    if (
      lower.includes("stressed") ||
      lower.includes("anxious") ||
      lower.includes("worried")
    )
      return "😰";
    if (lower.includes("confused") || lower.includes("puzzled")) return "🤔";
    if (lower.includes("excited") || lower.includes("thrilled")) return "🤩";
    if (
      lower.includes("love") ||
      lower.includes("grateful") ||
      lower.includes("thankful")
    )
      return "🥰";
    if (
      lower.includes("normal") ||
      lower.includes("okay") ||
      lower.includes("fine")
    )
      return "😐";
    return "💭";
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Add fade-in animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  loadFeelingHistory();
})();

// Notes Widget - handle user notes with auto-save
(() => {
  const notesInput = document.getElementById("notesInput");
  if (!notesInput) return;

  let notesTimer = null;

  function setNotesStatus(state, text) {
    const el = document.getElementById("notesSaveStatus");
    if (!el) return;
    el.classList.remove(
      SAVING_STATUSES.SAVED,
      SAVING_STATUSES.SAVING,
      SAVING_STATUSES.ERROR,
    );
    if (state) el.classList.add(state);
    if (typeof text === "string") el.textContent = text;
    // Refresh backup status when save completes (not while saving)
    if (
      state !== SAVING_STATUSES.SAVING &&
      typeof window.refreshBackupStatus === "function"
    ) {
      window.refreshBackupStatus();
    }
  }

  // Auto-save notes when user stops typing
  notesInput.addEventListener("input", () => {
    setNotesStatus(SAVING_STATUSES.SAVING, "Saving…");
    if (notesTimer) clearTimeout(notesTimer);
    notesTimer = setTimeout(async () => {
      await saveNotes();
    }, 1000); // Save after 1 second of no typing
  });

  async function saveNotes() {
    const notesText = notesInput.value || "";
    try {
      const res = await fetch("/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText }),
      });
      if (res.ok) {
        setNotesStatus(SAVING_STATUSES.SAVED, "Saved ✓");
        setTimeout(() => setNotesStatus("", ""), 2000);
      } else {
        setNotesStatus(SAVING_STATUSES.ERROR, "Save failed");
        console.warn("Failed to save notes", await res.text());
      }
    } catch (err) {
      setNotesStatus(SAVING_STATUSES.ERROR, "Save failed");
      console.warn("Failed to save notes", err);
    }
  }

  // Load notes on page load
  async function loadNotes() {
    try {
      const res = await fetch("/notes");
      if (res.ok) {
        const data = await res.json();
        if (data && data.notes !== undefined) {
          notesInput.value = data.notes;
        }
      }
    } catch (e) {
      console.warn("Failed to load notes", e);
    }
  }

  loadNotes();
})();

// To-Do List Widget - handle todo items with auto-save
(() => {
  const todoInput = document.getElementById("todoInput");
  const addTodoBtn = document.getElementById("addTodoBtn");
  const todoListActive = document.getElementById("todoListActive");
  const todoListCompleted = document.getElementById("todoListCompleted");
  if (!todoInput || !addTodoBtn || !todoListActive || !todoListCompleted)
    return;

  let todos = [];

  function setTodoStatus(state, text) {
    const el = document.getElementById("todoSaveStatus");
    if (!el) return;
    el.classList.remove(
      SAVING_STATUSES.SAVED,
      SAVING_STATUSES.SAVING,
      SAVING_STATUSES.ERROR,
    );
    if (state) el.classList.add(state);
    if (typeof text === "string") el.textContent = text;
    // Refresh backup status when save completes (not while saving)
    if (
      state !== SAVING_STATUSES.SAVING &&
      typeof window.refreshBackupStatus === "function"
    ) {
      window.refreshBackupStatus();
    }
  }

  function formatTodoText(text) {
    // First escape HTML
    let html = escapeHtml(text);
    // Then convert URLs to clickable links
    html = html.replace(
      /(https?:\/\/[^\s<>"']+)/g,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="break-url">${url}</a>`,
    );
    return html;
  }

  function renderTodos() {
    const activeTodos = todos.filter((t) => !t.completed);
    const completedTodos = todos.filter((t) => t.completed);

    // Render active todos
    if (activeTodos.length === 0) {
      todoListActive.innerHTML =
        '<div class="todo-empty">No active tasks ✨</div>';
    } else {
      todoListActive.innerHTML = activeTodos
        .map((todo) => {
          const dateStr = formatDate(todo.createdAt);
          const formattedText = formatTodoText(todo.text);
          return `
          <div class="todo-item" data-id="${todo.id}">
            <div class="todo-checkbox" data-id="${todo.id}"></div>
            <div class="todo-text">${formattedText}</div>
            <div class="todo-date">${dateStr}</div>
            <button class="todo-delete" data-id="${todo.id}">
              <img src="/delete.png" alt="Delete" class="todo-delete-icon" />
            </button>
          </div>
        `;
        })
        .join("");
    }

    // Render completed todos
    if (completedTodos.length === 0) {
      todoListCompleted.innerHTML =
        '<div class="todo-empty">No completed tasks</div>';
    } else {
      todoListCompleted.innerHTML = completedTodos
        .map((todo) => {
          const dateStr = formatDate(todo.createdAt);
          const formattedText = formatTodoText(todo.text);
          return `
          <div class="todo-item completed" data-id="${todo.id}">
            <div class="todo-checkbox" data-id="${todo.id}"></div>
            <div class="todo-text">${formattedText}</div>
            <div class="todo-date">${dateStr}</div>
            <button class="todo-delete" data-id="${todo.id}">
              <img src="/delete.png" alt="Delete" class="todo-delete-icon" />
            </button>
          </div>
        `;
        })
        .join("");
    }
  }

  function formatDate(isoString) {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "N/A";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "N/A";
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Create a new todo
  async function createTodo(text) {
    try {
      setTodoStatus(SAVING_STATUSES.SAVING, "Saving…");
      const res = await fetch("/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, completed: false }),
      });
      if (res.ok) {
        setTodoStatus(SAVING_STATUSES.SAVED, "Saved ✓");
        setTimeout(() => setTodoStatus("", ""), 2000);
        // Reload todos to get the new one with its ID
        await loadTodos();
      } else {
        setTodoStatus(SAVING_STATUSES.ERROR, "Save failed");
        console.warn("Failed to create todo", await res.text());
      }
    } catch (err) {
      setTodoStatus(SAVING_STATUSES.ERROR, "Save failed");
      console.warn("Failed to create todo", err);
    }
  }

  // Update a todo (text or completed status)
  async function updateTodo(id, updates) {
    try {
      setTodoStatus(SAVING_STATUSES.SAVING, "Saving…");
      const res = await fetch(`/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setTodoStatus(SAVING_STATUSES.SAVED, "Saved ✓");
        setTimeout(() => setTodoStatus("", ""), 2000);
      } else {
        setTodoStatus(SAVING_STATUSES.ERROR, "Save failed");
        console.warn("Failed to update todo", await res.text());
      }
    } catch (err) {
      setTodoStatus(SAVING_STATUSES.ERROR, "Save failed");
      console.warn("Failed to update todo", err);
    }
  }

  // Delete a todo
  async function deleteTodo(id) {
    try {
      setTodoStatus(SAVING_STATUSES.SAVING, "Saving…");
      const res = await fetch(`/todos/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTodoStatus(SAVING_STATUSES.SAVED, "Saved ✓");
        setTimeout(() => setTodoStatus("", ""), 2000);
      } else {
        setTodoStatus(SAVING_STATUSES.ERROR, "Save failed");
        console.warn("Failed to delete todo", await res.text());
      }
    } catch (err) {
      setTodoStatus(SAVING_STATUSES.ERROR, "Save failed");
      console.warn("Failed to delete todo", err);
    }
  }

  async function loadTodos() {
    try {
      const res = await fetch("/todos");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.todos)) {
          // Convert database format (completed: 0/1) to boolean
          todos = data.todos.map((todo) => ({
            ...todo,
            completed: !!todo.completed, // Convert 0/1 to boolean
            createdAt: todo.createdAt || new Date().toISOString(),
          }));
          renderTodos();
        }
      }
    } catch (e) {
      console.warn("Failed to load todos", e);
    }
  }

  async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    todoInput.value = "";
    await createTodo(text);
  }

  // Add todo on button click
  addTodoBtn.addEventListener("click", addTodo);

  // Add todo on Enter key
  todoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTodo();
    }
  });

  // Toggle complete and delete using event delegation on both lists
  async function handleTodoClick(e) {
    const checkbox = e.target.closest(".todo-checkbox");
    const deleteBtn = e.target.closest(".todo-delete");

    if (checkbox) {
      const id = checkbox.getAttribute("data-id");
      const todo = todos.find((t) => t.id == id); // Use == for type coercion
      if (todo) {
        const newCompleted = !todo.completed;
        // Update locally first for immediate UI feedback
        todo.completed = newCompleted;
        renderTodos();
        // Then sync with server
        await updateTodo(id, { completed: newCompleted });
      }
    } else if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-id");
      // Remove from local array first for immediate UI feedback
      todos = todos.filter((t) => t.id != id); // Use != for type coercion
      renderTodos();
      // Then sync with server
      await deleteTodo(id);
    }
  }

  // Handle double click to edit todo text
  function handleTodoDoubleClick(e) {
    const todoText = e.target.closest(".todo-text");
    if (!todoText) return;

    const todoItem = todoText.closest(".todo-item");
    const id = todoItem?.getAttribute("data-id");
    const todo = todos.find((t) => t.id == id); // Use == instead of === for type coercion

    if (!todo) return;

    // Create input element
    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-edit-input";
    input.value = todo.text;

    // Replace text with input
    todoText.replaceWith(input);
    input.focus();
    input.select();

    // Save on Enter or blur
    async function saveEdit() {
      const newText = input.value.trim();
      if (newText && newText !== todo.text) {
        // Update locally first
        todo.text = newText;
        renderTodos();
        // Then sync with server
        await updateTodo(id, { text: newText });
      } else {
        renderTodos();
      }
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit();
      } else if (e.key === "Escape") {
        renderTodos(); // Cancel edit
      }
    });

    input.addEventListener("blur", saveEdit);
  }

  todoListActive.addEventListener("click", handleTodoClick);
  todoListCompleted.addEventListener("click", handleTodoClick);
  todoListActive.addEventListener("dblclick", handleTodoDoubleClick);
  todoListCompleted.addEventListener("dblclick", handleTodoDoubleClick);

  loadTodos();
})();

// Progress Calendar Widget - track daily activity
(() => {
  const calendarGrid = document.getElementById("calendarGrid");
  const calendarMonth = document.getElementById("calendarMonth");
  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");

  if (!calendarGrid) return;

  let currentDate = new Date();
  let activeDays = new Set(); // Store active dates in YYYY-MM-DD format

  // Load activity data from backend with optional month parameter
  async function loadActivityData(month = null) {
    try {
      // If month is provided, use it; otherwise fetch all data
      const url = month ? `/activity?month=${month}` : "/activity";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        activeDays = new Set(data.activeDays || []);
      }
    } catch (e) {
      console.warn("Failed to load activity data", e);
    }
    // Always render calendar even if data fetch fails
    renderCalendar();
  }

  // Helper function to get YYYY-MM format from currentDate
  function getCurrentMonthKey() {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  // Add activity day to backend
  async function addActivityDay(dateKey) {
    try {
      const res = await fetch("/activity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey }),
      });
      if (!res.ok) {
        console.error("Failed to add activity day, status:", res.status);
      }
    } catch (e) {
      console.warn("Failed to add activity day", e);
    }
  }

  // Remove activity day from backend
  async function removeActivityDay(dateKey) {
    try {
      const res = await fetch("/activity", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey }),
      });
      if (!res.ok) {
        console.error("Failed to remove activity day, status:", res.status);
      }
    } catch (e) {
      console.warn("Failed to remove activity day", e);
    }
  }

  // Mark today as active (called when user updates reading/listening)
  window.markTodayActive = function () {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (!activeDays.has(dateKey)) {
      activeDays.add(dateKey);
      addActivityDay(dateKey);
      renderCalendar();
    }
  };

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update header
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    calendarMonth.textContent = `${monthNames[month]} ${year}`;

    // Get calendar data
    const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const firstDay = new Date(year, month, 1).getDay();
    const firstDayMon = firstDay === 0 ? 6 : firstDay - 1;
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() === month;

    // Generate previous month days
    const prevMonthDays = Array.from(
      { length: firstDayMon },
      (_, i) =>
        `<div class="calendar-day other-month">${prevMonthLastDate - firstDayMon + i + 1}</div>`,
    ).join("");

    // Generate current month days
    const currentMonthDays = Array.from({ length: lastDate }, (_, i) => {
      const date = i + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
      const isToday = isCurrentMonth && date === today.getDate();
      const isActive = activeDays.has(dateKey);
      const classes = ["calendar-day", isToday && "today", isActive && "active"]
        .filter(Boolean)
        .join(" ");
      return `<div class="${classes}" data-date="${dateKey}">${date}</div>`;
    }).join("");

    // Calculate next month days needed
    const totalDays = firstDayMon + lastDate;
    const remainingCells = Math.ceil(totalDays / 7) * 7 - totalDays;
    const nextMonthDays = Array.from(
      { length: remainingCells },
      (_, i) => `<div class="calendar-day other-month">${i + 1}</div>`,
    ).join("");

    // Render calendar grid
    calendarGrid.innerHTML = `
      ${dayHeaders.map((day) => `<div class="calendar-day-header">${day}</div>`).join("")}
      ${prevMonthDays}
      ${currentMonthDays}
      ${nextMonthDays}
    `;

    // Update stats
    updateStats();
  }

  function updateStats() {
    const activeDaysCountEl = document.getElementById("activeDaysCount");
    if (activeDaysCountEl) {
      activeDaysCountEl.textContent = activeDays.size;
    }
  }

  // Navigation
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      loadActivityData(getCurrentMonthKey());
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      loadActivityData(getCurrentMonthKey());
    });
  }

  // Double-click to toggle active day
  if (calendarGrid) {
    calendarGrid.addEventListener("dblclick", (e) => {
      const dayElement = e.target;

      // Only process clicks on calendar days (not headers or other-month days)
      if (
        !dayElement.classList.contains("calendar-day") ||
        dayElement.classList.contains("calendar-day-header") ||
        dayElement.classList.contains("other-month")
      ) {
        return;
      }

      const dateKey = dayElement.getAttribute("data-date");
      if (!dateKey) return;

      // Toggle active state
      if (activeDays.has(dateKey)) {
        activeDays.delete(dateKey);
        removeActivityDay(dateKey);
      } else {
        activeDays.add(dateKey);
        addActivityDay(dateKey);
      }

      // Re-render
      renderCalendar();
    });
  }

  // Initial render - load current month
  loadActivityData(getCurrentMonthKey());
})();

// Backup Status Display - show last backup time
(() => {
  const backupStatus = document.getElementById("backupStatus");
  if (!backupStatus) return;

  // Manual backup button handler
  const manualBackupBtn = document.getElementById("manualBackupBtn");
  if (manualBackupBtn) {
    manualBackupBtn.addEventListener("click", async () => {
      try {
        // Disable button and show loading state
        manualBackupBtn.disabled = true;
        manualBackupBtn.textContent = "⏳ Backing up...";
        manualBackupBtn.style.opacity = "0.6";

        backupStatus.textContent = "💾 Creating backup...";
        backupStatus.style.color = "#f59e0b";

        // Trigger backup via /api/cron endpoint
        const res = await fetch("/api/cron", {
          method: "GET",
        });

        if (res.ok) {
          backupStatus.textContent = "💾 Backup completed!";
          backupStatus.style.color = "#10b981";
          // Refresh backup status after a short delay to get the new timestamp
          setTimeout(() => loadBackupStatus(), 500);
        } else {
          backupStatus.textContent = "💾 Backup failed";
          backupStatus.style.color = "#ef4444";
          console.error("Backup failed with status:", res.status);
        }
      } catch (e) {
        console.error("Failed to trigger backup:", e);
        backupStatus.textContent = "💾 Backup failed";
        backupStatus.style.color = "#ef4444";
      } finally {
        // Re-enable button after 2 seconds
        setTimeout(() => {
          manualBackupBtn.disabled = false;
          manualBackupBtn.textContent = "� Backup Now";
          manualBackupBtn.style.opacity = "1";
        }, 2000);
      }
    });
  }

  // Load backup status on page load
  loadBackupStatus();

  // Refresh backup status every 1 minute
  setInterval(loadBackupStatus, 60000);
})();

/**
 * @param {typeof SAVING_STATUSES[keyof typeof SAVING_STATUSES]} state
 * @param {string | null} text
 */
function setProgressStatus(state, text = null) {
  const el = document.getElementById("progressSaveStatus");
  if (!el) return;

  el.classList.remove(
    SAVING_STATUSES.SAVED,
    SAVING_STATUSES.SAVING,
    SAVING_STATUSES.ERROR,
  );
  el.classList.add(state);
  el.textContent = text || SAVING_STATUS_TEXT[state] || "";

  // Refresh backup status when save completes (not while saving)
  if (state !== SAVING_STATUSES.SAVING) {
    loadBackupStatus();
  }
}

async function loadBackupStatus() {
  const backupStatus = document.getElementById("backupStatus");
  if (!backupStatus) return;

  try {
    const res = await fetch("/backup");
    if (res.ok) {
      const data = await res.json();
      if (data && data.lastBackup) {
        const backupDate = new Date(data.lastBackup);
        const now = new Date();
        const diffMs = now.getTime() - backupDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let timeAgo = "";
        if (diffMins < 1) {
          timeAgo = "just now";
        } else if (diffMins < 60) {
          timeAgo = `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
        } else if (diffHours < 24) {
          timeAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        } else {
          timeAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        }

        // Format the exact date for tooltip
        const formattedDate = backupDate.toLocaleString("en-GB", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        backupStatus.textContent = `💾 Last backup: ${timeAgo}`;
        backupStatus.title = `Backup at ${formattedDate}`;
        backupStatus.style.color = "#10b981";
      } else {
        backupStatus.textContent = "💾 No backup yet";
        backupStatus.style.color = "#9ca3af";
      }
    } else {
      backupStatus.textContent = "� Backup info unavailable";
      backupStatus.style.color = "#ef4444";
    }
  } catch (e) {
    console.warn("Failed to load backup status", e);
    backupStatus.textContent = "💾 Backup check failed";
    backupStatus.style.color = "#ef4444";
  }
}
