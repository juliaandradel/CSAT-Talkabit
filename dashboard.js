(() => {
  "use strict";

  const PARTNER_BRANDS = window.PARTNER_BRANDS || [];
  const TALK_MOMENTS = window.TALK_MOMENTS || [];

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fmtPct(n) {
    return `${Math.round(n)}%`;
  }

  function average(rows, field) {
    const vals = rows.map((r) => r[field]).filter((v) => typeof v === "number");
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function getSupabase() {
    if (
      typeof window.supabase === "undefined" ||
      !window.SUPABASE_URL ||
      window.SUPABASE_URL.startsWith("COLE_AQUI")
    ) {
      return null;
    }
    return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }

  const client = getSupabase();

  /* ---------------------------------------------------------
     DOM refs
     --------------------------------------------------------- */
  const loginCard = document.getElementById("login-card");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const loginSubmit = document.getElementById("login-submit");
  const loginSubmitLabel = document.getElementById("login-submit-label");
  const dashboard = document.getElementById("dashboard");
  const dashStatus = document.getElementById("dash-status");
  const logoutBtn = document.getElementById("logout-btn");
  const exportBtn = document.getElementById("export-btn");

  let allRows = [];

  /* ---------------------------------------------------------
     Auth
     --------------------------------------------------------- */
  async function boot() {
    if (!client) {
      loginError.textContent =
        "config.js ainda não tem SUPABASE_URL/SUPABASE_ANON_KEY preenchidos — veja o README.";
      loginError.hidden = false;
      return;
    }

    const {
      data: { session },
    } = await client.auth.getSession();

    if (session) {
      enterDashboard();
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.hidden = true;

    if (!client) return;

    loginSubmit.disabled = true;
    loginSubmitLabel.textContent = "Entrando...";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    const { error } = await client.auth.signInWithPassword({ email, password });

    loginSubmit.disabled = false;
    loginSubmitLabel.textContent = "Entrar";

    if (error) {
      loginError.textContent = "Não consegui entrar — confere e-mail e senha (criados em Authentication > Users no Supabase).";
      loginError.hidden = false;
      return;
    }

    enterDashboard();
  });

  logoutBtn.addEventListener("click", async () => {
    if (!client) return;
    await client.auth.signOut();
    window.location.reload();
  });

  exportBtn.addEventListener("click", () => {
    if (!allRows.length) return;
    downloadCSV(allRows);
  });

  async function enterDashboard() {
    loginCard.hidden = true;
    dashboard.hidden = false;
    logoutBtn.hidden = false;

    const { data, error } = await client.from("csat_responses").select("*").order("created_at", { ascending: false });

    if (error) {
      dashStatus.textContent = "Não consegui carregar as respostas: " + error.message;
      return;
    }

    allRows = data || [];
    exportBtn.hidden = allRows.length === 0;

    if (!allRows.length) {
      dashStatus.textContent = "Ainda não chegou nenhuma resposta.";
      return;
    }

    dashStatus.textContent = `${allRows.length} resposta${allRows.length === 1 ? "" : "s"} recebida${allRows.length === 1 ? "" : "s"}.`;

    renderKPIs(allRows);
    renderNPS(allRows);
    renderMeters(allRows);
    renderHackathon(allRows);
    renderBrandTable(allRows);
    renderTalkRanking(allRows);
    renderTextList(allRows, "sugestoes", "suggestions-list", "Ainda sem elogios, críticas ou sugestões.");
  }

  /* ---------------------------------------------------------
     01 — KPIs
     --------------------------------------------------------- */
  function renderKPIs(rows) {
    const grid = document.getElementById("kpi-grid");
    grid.innerHTML = "";

    const tiles = [
      { value: rows.length, label: "Respostas recebidas" },
      { value: average(rows, "nps_recomendacao")?.toFixed(1) ?? "—", label: "NPS médio (0–10)" },
      { value: average(rows, "exp_geral")?.toFixed(1) ?? "—", label: "Experiência geral (1–5)" },
      { value: average(rows, "estrutura_organizacao")?.toFixed(1) ?? "—", label: "Estrutura/organização (1–5)" },
    ];

    tiles.forEach((t) => {
      const tile = el("div", "kpi-tile");
      tile.appendChild(el("div", "kpi-tile__value", String(t.value)));
      tile.appendChild(el("div", "kpi-tile__label", t.label));
      grid.appendChild(tile);
    });
  }

  /* ---------------------------------------------------------
     02 — NPS: hero number + detrator/neutro/promotor
     --------------------------------------------------------- */
  function renderNPS(rows) {
    const wrap = document.getElementById("nps-report");
    wrap.innerHTML = "";

    const scores = rows.map((r) => r.nps_recomendacao).filter((v) => typeof v === "number");
    const total = scores.length;
    const detractors = scores.filter((v) => v <= 6).length;
    const passives = scores.filter((v) => v >= 7 && v <= 8).length;
    const promoters = scores.filter((v) => v >= 9).length;
    const npsScore = total ? Math.round(((promoters - detractors) / total) * 100) : 0;

    const hero = el("div", "nps-report__hero");
    hero.appendChild(el("div", "nps-report__hero-value", (npsScore > 0 ? "+" : "") + npsScore));
    hero.appendChild(el("div", "nps-report__hero-label", "score NPS"));
    wrap.appendChild(hero);

    const barWrap = el("div", "nps-report__bar-wrap");
    const stack = el("div", "nps-stack");

    [
      ["detractor", detractors],
      ["passive", passives],
      ["promoter", promoters],
    ].forEach(([kind, count]) => {
      if (!count) return;
      const seg = el("div", `nps-stack__seg nps-stack__seg--${kind}`);
      seg.style.width = fmtPct((count / total) * 100 || 0);
      seg.title = `${count} de ${total}`;
      stack.appendChild(seg);
    });
    barWrap.appendChild(stack);

    const legend = el("div", "nps-legend");
    [
      ["detractor", "Detratores (0–6)", detractors],
      ["passive", "Neutros (7–8)", passives],
      ["promoter", "Promotores (9–10)", promoters],
    ].forEach(([kind, label, count]) => {
      const item = el("div", "nps-legend__item");
      item.appendChild(el("span", `nps-legend__dot nps-legend__dot--${kind}`));
      item.appendChild(el("span", null, `${label}: ${count} (${fmtPct((count / total) * 100 || 0)})`));
      legend.appendChild(item);
    });
    barWrap.appendChild(legend);

    wrap.appendChild(barWrap);
  }

  /* ---------------------------------------------------------
     03 — Meters (avaliações médias 1–5)
     --------------------------------------------------------- */
  function meterRow(label, value, max = 5) {
    const row = el("div", "meter-row");
    row.appendChild(el("div", "meter-row__label", label));
    const track = el("div", "meter-row__track");
    const fill = el("div", "meter-row__fill");
    fill.style.width = value == null ? "0%" : fmtPct((value / max) * 100);
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el("div", "meter-row__value", value == null ? "—" : value.toFixed(1)));
    return row;
  }

  function renderMeters(rows) {
    const list = document.getElementById("meter-list");
    list.innerHTML = "";
    list.appendChild(meterRow("Experiência geral", average(rows, "exp_geral")));
    list.appendChild(meterRow("Qualidade do conteúdo", average(rows, "qualidade_conteudo")));
    list.appendChild(meterRow("Estrutura/organização", average(rows, "estrutura_organizacao")));
  }

  /* ---------------------------------------------------------
     04 — Hackathon
     --------------------------------------------------------- */
  function renderHackathon(rows) {
    const participationEl = document.getElementById("hackathon-participation");
    participationEl.innerHTML = "";

    const options = ["Não", "Acaso", "Sieg"];
    const total = rows.length;

    options.forEach((opt) => {
      const count = rows.filter((r) => r.participou_hackathon === opt).length;
      const row = el("div", "bar-row");
      row.appendChild(el("div", "bar-row__label", opt));
      const track = el("div", "bar-row__track");
      const fill = el("div", "bar-row__fill");
      fill.style.width = total ? fmtPct((count / total) * 100) : "0%";
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el("div", "bar-row__value", `${count} (${total ? fmtPct((count / total) * 100) : "0%"})`));
      participationEl.appendChild(row);
    });

    const experienceEl = document.getElementById("hackathon-experience");
    experienceEl.innerHTML = "";
    experienceEl.appendChild(meterRow("Experiência — hackathon Acaso", average(rows, "exp_hackathon_acaso")));
    experienceEl.appendChild(meterRow("Experiência — hackathon Sieg", average(rows, "exp_hackathon_sieg")));
  }

  /* ---------------------------------------------------------
     05 — Relatório por marca parceira
     --------------------------------------------------------- */
  function countBrand(rows, field, brand) {
    return rows.filter((r) => Array.isArray(r[field]) && r[field].includes(brand)).length;
  }

  function renderBrandTable(rows) {
    const wrap = document.getElementById("brand-table");
    wrap.innerHTML = "";

    const total = rows.length;

    const head = el("div", "brand-table__head");
    head.appendChild(el("div", null, "Marca"));
    head.appendChild(el("div", null, "Já conhecia"));
    head.appendChild(el("div", null, "Descobriu / interessou depois"));
    wrap.appendChild(head);

    const data = PARTNER_BRANDS.map((brand) => ({
      brand,
      known: countBrand(rows, "marcas_conhecidas", brand),
      newInterest: countBrand(rows, "marcas_interesse", brand),
    })).sort((a, b) => b.known + b.newInterest - (a.known + a.newInterest));

    data.forEach(({ brand, known, newInterest }) => {
      const row = el("div", "brand-row");
      row.appendChild(el("div", "brand-row__name", brand));

      const knownMetric = el("div", "brand-metric");
      const knownTrack = el("div", "brand-metric__track");
      const knownFill = el("div", "brand-metric__fill brand-metric__fill--known");
      knownFill.style.width = total ? fmtPct((known / total) * 100) : "0%";
      knownTrack.appendChild(knownFill);
      knownMetric.appendChild(knownTrack);
      knownMetric.appendChild(el("div", "brand-metric__value", `${known} (${total ? fmtPct((known / total) * 100) : "0%"})`));
      row.appendChild(knownMetric);

      const newMetric = el("div", "brand-metric");
      const newTrack = el("div", "brand-metric__track");
      const newFill = el("div", "brand-metric__fill brand-metric__fill--new");
      newFill.style.width = total ? fmtPct((newInterest / total) * 100) : "0%";
      newTrack.appendChild(newFill);
      newMetric.appendChild(newTrack);
      newMetric.appendChild(el("div", "brand-metric__value", `${newInterest} (${total ? fmtPct((newInterest / total) * 100) : "0%"})`));
      row.appendChild(newMetric);

      wrap.appendChild(row);
    });

    const nenhuma = countBrand(rows, "marcas_interesse", "Nenhuma");
    if (nenhuma) {
      wrap.appendChild(
        el("p", "empty-note", `${nenhuma} pessoa${nenhuma === 1 ? "" : "s"} disse que não descobriu nenhuma marca nova.`)
      );
    }
  }

  /* ---------------------------------------------------------
     06 — Talk/momento mais marcante: ranking por palestrante +
     lista das respostas livres de quem escolheu "Outro"
     --------------------------------------------------------- */
  function renderTalkRanking(rows) {
    const wrap = document.getElementById("talk-ranking");
    if (!wrap) return;
    wrap.innerHTML = "";

    const answered = rows.filter((r) => typeof r.talk_marcante === "string" && r.talk_marcante.trim().length > 0);
    const total = answered.length;

    const counts = TALK_MOMENTS.map((name) => ({
      name,
      count: answered.filter((r) => r.talk_marcante === name).length,
    }));
    const outroCount = answered.filter((r) => !TALK_MOMENTS.includes(r.talk_marcante)).length;
    if (outroCount) counts.push({ name: "Outro", count: outroCount });

    counts
      .sort((a, b) => b.count - a.count)
      .forEach(({ name, count }) => {
        const row = el("div", "bar-row");
        row.appendChild(el("div", "bar-row__label", name));
        const track = el("div", "bar-row__track");
        const fill = el("div", "bar-row__fill");
        fill.style.width = total ? fmtPct((count / total) * 100) : "0%";
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el("div", "bar-row__value", `${count} (${total ? fmtPct((count / total) * 100) : "0%"})`));
        wrap.appendChild(row);
      });

    if (!total) {
      wrap.appendChild(el("p", "empty-note", "Ninguém respondeu essa pergunta ainda."));
    }

    // A lista de texto só mostra quem escolheu "Outro" — os nomes dos
    // palestrantes já estão contados acima, não precisam repetir aqui.
    const outroRows = answered.filter((r) => !TALK_MOMENTS.includes(r.talk_marcante));
    renderTextList(outroRows, "talk_marcante", "talks-list", "Ninguém marcou \"Outro\" com um texto próprio.");
  }

  /* ---------------------------------------------------------
     06/07 — Listas de texto aberto (nunca via innerHTML com
     conteúdo de usuário — tudo por textContent)
     --------------------------------------------------------- */
  function renderTextList(rows, field, containerId, emptyMessage) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const entries = rows.filter((r) => typeof r[field] === "string" && r[field].trim().length > 0);

    if (!entries.length) {
      container.appendChild(el("p", "empty-note", emptyMessage));
      return;
    }

    entries.forEach((r) => {
      const item = el("div", "text-item");
      item.appendChild(el("p", "text-item__body", r[field]));
      const who = r.nome && r.nome.trim() ? r.nome.trim() : "Anônimo";
      const when = r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "";
      item.appendChild(el("p", "text-item__meta", when ? `${who} · ${when}` : who));
      container.appendChild(item);
    });
  }

  /* ---------------------------------------------------------
     Export CSV
     --------------------------------------------------------- */
  function downloadCSV(rows) {
    const columns = [
      "created_at",
      "nome",
      "email",
      "linkedin",
      "nps_recomendacao",
      "exp_geral",
      "qualidade_conteudo",
      "participou_hackathon",
      "exp_hackathon_acaso",
      "exp_hackathon_sieg",
      "estrutura_organizacao",
      "talk_marcante",
      "marcas_conhecidas",
      "marcas_interesse",
      "sugestoes",
    ];

    function csvCell(value) {
      if (value === null || value === undefined) return "";
      const str = Array.isArray(value) ? value.join("; ") : String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const lines = [columns.join(",")];
    rows.forEach((r) => {
      lines.push(columns.map((c) => csvCell(r[c])).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `talk-a-bit-csat-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  boot();
})();
