// new york clock + status line
(() => {
  const el = document.getElementById("clock");
  if (!el) return;

  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hourCycle: "h23",
  });

  function tick() {
    const now = new Date();
    // \s also catches the narrow no-break space some ICU versions put before am/pm
    const time = timeFmt.format(now).toLowerCase().replace(/\s/g, "");
    const hour = parseInt(hourFmt.format(now), 10);
    let status = "probably building.";
    if (hour >= 2 && hour < 8) status = "should be asleep.";
    else if (hour >= 8 && hour < 15) status = "touching grass (allegedly).";
    el.textContent = `it's ${time} in new york. ${status}`;
  }

  tick();
  setInterval(tick, 30000);
})();

// the market: odds count up on load, drift on their own & react to you
(() => {
  const board = document.getElementById("market-board");
  if (!board) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rows = new Map();
  board.querySelectorAll("li").forEach((li) => {
    const base = parseFloat(li.dataset.pct);
    rows.set(li.dataset.market, {
      li,
      base,
      pct: base,
      small: base < 5,
      pctEl: li.querySelector(".pct"),
      sideEl: li.querySelector(".side"),
      deltaEl: li.querySelector(".delta"),
      resolved: false,
      boosted: false,
      inlineEl: null,
    });
  });

  // the closing line quotes the email market live
  const inlineOdds = document.getElementById("email-odds");
  if (inlineOdds && rows.has("email")) rows.get("email").inlineEl = inlineOdds;

  function render(m, dir) {
    const text = m.pct.toFixed(m.small ? 1 : 0) + "%";
    m.pctEl.textContent = text;
    if (m.inlineEl) m.inlineEl.textContent = text;
    if (dir > 0) {
      m.deltaEl.textContent = "▲";
      m.deltaEl.className = "delta up";
    } else if (dir < 0) {
      m.deltaEl.textContent = "▼";
      m.deltaEl.className = "delta down";
    } else {
      m.deltaEl.textContent = "";
      m.deltaEl.className = "delta";
    }
  }

  // entrance: every market counts up from zero, staggered
  if (!reduced) {
    let i = 0;
    for (const m of rows.values()) {
      const start = performance.now() + i++ * 120;
      const duration = 700;
      m.pct = 0;
      render(m, 0);
      const step = (now) => {
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        const eased = 1 - Math.pow(1 - t, 3);
        m.pct = m.base * eased;
        render(m, 0);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  function drift() {
    for (const m of rows.values()) {
      if (m.resolved || m.boosted) continue;
      const lo = m.small ? Math.max(0.3, m.base - 1.2) : Math.max(2, m.base - 6);
      const hi = m.small ? m.base + 1.8 : Math.min(99, m.base + 4);
      const step = (Math.random() - 0.5) * (m.small ? 0.5 : 2.6);
      const next = Math.min(hi, Math.max(lo, m.pct + step));
      const digits = m.small ? 1 : 0;
      const dir = Math.sign(+next.toFixed(digits) - +m.pct.toFixed(digits));
      m.pct = next;
      render(m, dir);
    }
  }

  if (!reduced) setInterval(drift, 1500);

  // "you email jeff after this" trades on intent
  const email = rows.get("email");
  const mailtos = document.querySelectorAll('a[href^="mailto:"]');
  if (email && mailtos.length) {
    const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const resolve = () => {
      if (email.resolved) return;
      email.resolved = true;
      email.li.classList.add("resolved");
      email.sideEl.textContent = "resolved yes";
      email.pctEl.textContent = "✓";
      email.deltaEl.textContent = "";
      email.deltaEl.className = "delta";
      if (email.inlineEl) email.inlineEl.textContent = "100%";
    };

    mailtos.forEach((link) => {
      if (hoverable) {
        link.addEventListener("mouseenter", () => {
          if (email.resolved) return;
          email.boosted = true;
          const prev = email.pct;
          email.pct = 64;
          render(email, Math.sign(email.pct - prev));
        });

        link.addEventListener("mouseleave", () => {
          if (email.resolved) return;
          email.boosted = false;
          const prev = email.pct;
          email.pct = 16; // it lingers a little. hope does that.
          render(email, Math.sign(email.pct - prev));
        });
      }
      link.addEventListener("click", resolve);
    });
  }
})();
