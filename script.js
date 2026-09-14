(() => {
  "use strict";

  /* ---------------------------------------------------------
     Face icon (1–5 rating) — thin-line SVG, color reacts to value
     --------------------------------------------------------- */
  const FACE_MOUTHS = {
    1: "M9,22 Q16,15 23,22",
    2: "M9,20 Q16,17 23,20",
    3: "M9,19 L23,19",
    4: "M9,17 Q16,21 23,17",
    5: "M8,15 Q16,24 24,15",
  };

  function faceSVG(value) {
    const mouth = FACE_MOUTHS[value] || FACE_MOUTHS[3];
    return `
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="13.5" stroke="currentColor" stroke-width="1.6"/>
        <circle cx="11.5" cy="13" r="1.4" fill="currentColor"/>
        <circle cx="20.5" cy="13" r="1.4" fill="currentColor"/>
        <path d="${mouth}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      </svg>`;
  }

  function lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  // low (1) -> muted lavender, high (5) -> brand lime
  const COLOR_LOW = [122, 105, 153]; // --muted-2
  const COLOR_HIGH = [201, 253, 82]; // --lime

  function faceColor(value) {
    const t = (value - 1) / 4;
    const [r, g, b] = [
      lerp(COLOR_LOW[0], COLOR_HIGH[0], t),
      lerp(COLOR_LOW[1], COLOR_HIGH[1], t),
      lerp(COLOR_LOW[2], COLOR_HIGH[2], t),
    ];
    return `rgb(${r}, ${g}, ${b})`;
  }

  const touchedSliders = new Set();

  function wireRating(sliderId, faceId) {
    const slider = document.getElementById(sliderId);
    const face = document.getElementById(faceId);
    if (!slider || !face) return;

    function render() {
      const v = Number(slider.value);
      face.innerHTML = faceSVG(v);
      face.style.color = faceColor(v);
    }

    slider.addEventListener("input", () => {
      touchedSliders.add(sliderId);
      clearError();
      render();
    });
    render();
  }

  ["exp-geral", "qualidade-conteudo", "estrutura", "exp-hackathon-acaso", "exp-hackathon-sieg"].forEach((id) =>
    wireRating(id, `${id}-face`)
  );

  /* ---------------------------------------------------------
     NPS slider — big readout
     --------------------------------------------------------- */
  (function wireNPS() {
    const slider = document.getElementById("nps");
    const valueEl = document.getElementById("nps-value");
    if (!slider) return;

    function render() {
      valueEl.textContent = slider.value;
    }

    slider.addEventListener("input", () => {
      touchedSliders.add("nps");
      clearError();
      render();
    });
    render();
  })();

  /* ---------------------------------------------------------
     Hackathon segmented control + conditional follow-up
     Só dá pra participar de uma trilha por vez (Acaso ou Sieg),
     então só a pergunta daquela trilha aparece.
     --------------------------------------------------------- */
  let hackathonValue = null;

  (function wireHackathon() {
    const group = document.getElementById("hackathon-group");
    const follow = document.getElementById("hackathon-follow");
    const followAcaso = document.getElementById("hackathon-follow-acaso");
    const followSieg = document.getElementById("hackathon-follow-sieg");
    if (!group) return;

    const buttons = Array.from(group.querySelectorAll(".segmented__opt"));

    buttons.forEach((btn) => {
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        hackathonValue = btn.dataset.value;

        follow.hidden = hackathonValue === "Não";
        followAcaso.hidden = hackathonValue !== "Acaso";
        followSieg.hidden = hackathonValue !== "Sieg";

        clearError();
      });
    });
  })();

  /* ---------------------------------------------------------
     Talk/momento mais marcante — seleção única entre os palestrantes
     confirmados.
     --------------------------------------------------------- */
  let talkValue = null;

  (function wireTalkOptions() {
    const container = document.getElementById("talk-options");
    if (!container) return;

    const options = window.TALK_MOMENTS || [];

    options.forEach((label) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = label;
      chip.setAttribute("role", "radio");
      chip.setAttribute("aria-checked", "false");
      chip.addEventListener("click", () => {
        const already = chip.getAttribute("aria-checked") === "true";
        container.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-checked", "false"));

        if (already) {
          // Clicar de novo no já selecionado limpa a escolha.
          talkValue = null;
        } else {
          chip.setAttribute("aria-checked", "true");
          talkValue = label;
        }
        clearError();
      });
      container.appendChild(chip);
    });
  })();

  /* ---------------------------------------------------------
     Brand chips (multi-select), with a mutually-exclusive "Nenhuma"
     --------------------------------------------------------- */
  const PARTNER_BRANDS = window.PARTNER_BRANDS || [];

  function buildChips(containerId, options, { withNone = false } = {}) {
    const el = document.getElementById(containerId);
    if (!el) return () => [];

    const state = new Set();
    const all = withNone ? [...options, "Nenhuma"] : options;

    all.forEach((label) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (label === "Nenhuma" ? " chip--none" : "");
      chip.textContent = label;
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", () => {
        if (label === "Nenhuma") {
          const nowOn = chip.getAttribute("aria-pressed") !== "true";
          el.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
          state.clear();
          if (nowOn) {
            chip.setAttribute("aria-pressed", "true");
            state.add(label);
          }
        } else {
          const noneChip = el.querySelector(".chip--none");
          if (noneChip) {
            noneChip.setAttribute("aria-pressed", "false");
            state.delete("Nenhuma");
          }
          const pressed = chip.getAttribute("aria-pressed") === "true";
          chip.setAttribute("aria-pressed", pressed ? "false" : "true");
          if (pressed) state.delete(label);
          else state.add(label);
        }
        clearError();
      });
      el.appendChild(chip);
    });

    return () => Array.from(state);
  }

  const getConhecidas = buildChips("chips-conhecidas", PARTNER_BRANDS, { withNone: true });
  const getInteresse = buildChips("chips-interesse", PARTNER_BRANDS, { withNone: true });

  /* ---------------------------------------------------------
     Submit
     --------------------------------------------------------- */
  const form = document.getElementById("csat-form");
  const errorEl = document.getElementById("form-error");
  const submitBtn = document.getElementById("submit-btn");
  const submitLabel = document.getElementById("submit-label");
  const successEl = document.getElementById("success");

  function showError(message, el) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    (el || errorEl).scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const validations = [
      {
        ok: touchedSliders.has("nps"),
        message: "Falta responder o quanto você recomendaria o Talk a Bit.",
        el: document.getElementById("nps"),
      },
      {
        ok: touchedSliders.has("exp-geral"),
        message: "Falta avaliar sua experiência geral no evento.",
        el: document.getElementById("exp-geral"),
      },
      {
        ok: touchedSliders.has("qualidade-conteudo"),
        message: "Falta avaliar a relevância/qualidade do conteúdo das talks.",
        el: document.getElementById("qualidade-conteudo"),
      },
      {
        ok: !!hackathonValue,
        message: "Falta responder se você participou do hackathon.",
        el: document.getElementById("hackathon-group"),
      },
      {
        ok: hackathonValue !== "Acaso" || touchedSliders.has("exp-hackathon-acaso"),
        message: "Falta avaliar sua experiência no hackathon Acaso.",
        el: document.getElementById("exp-hackathon-acaso"),
      },
      {
        ok: hackathonValue !== "Sieg" || touchedSliders.has("exp-hackathon-sieg"),
        message: "Falta avaliar sua experiência no hackathon Sieg.",
        el: document.getElementById("exp-hackathon-sieg"),
      },
      {
        ok: touchedSliders.has("estrutura"),
        message: "Falta avaliar a estrutura/organização do evento.",
        el: document.getElementById("estrutura"),
      },
      {
        ok: !!talkValue,
        message: "Falta escolher qual talk ou momento mais te marcou.",
        el: document.getElementById("talk-options"),
      },
      {
        ok: getConhecidas().length > 0,
        message: 'Falta marcar as marcas parceiras que você já conhecia (ou "Nenhuma").',
        el: document.getElementById("chips-conhecidas"),
      },
      {
        ok: getInteresse().length > 0,
        message: 'Falta marcar se alguma marca despertou seu interesse (ou "Nenhuma").',
        el: document.getElementById("chips-interesse"),
      },
    ];

    const firstFail = validations.find((v) => !v.ok);
    if (firstFail) {
      showError(firstFail.message, firstFail.el);
      return;
    }

    const payload = {
      nps_recomendacao: Number(document.getElementById("nps").value),
      exp_geral: Number(document.getElementById("exp-geral").value),
      qualidade_conteudo: Number(document.getElementById("qualidade-conteudo").value),
      participou_hackathon: hackathonValue,
      exp_hackathon_acaso:
        hackathonValue === "Acaso"
          ? Number(document.getElementById("exp-hackathon-acaso").value)
          : null,
      exp_hackathon_sieg:
        hackathonValue === "Sieg"
          ? Number(document.getElementById("exp-hackathon-sieg").value)
          : null,
      estrutura_organizacao: Number(document.getElementById("estrutura").value),
      talk_marcante: talkValue,
      marcas_conhecidas: getConhecidas(),
      marcas_interesse: getInteresse(),
      sugestoes: document.getElementById("sugestoes").value.trim() || null,
    };

    const client = getSupabase();
    if (!client) {
      showError(
        "O envio ainda não foi conectado ao banco de dados. Preencha SUPABASE_URL e SUPABASE_ANON_KEY em config.js (veja o README)."
      );
      console.info("Payload que seria enviado ao Supabase:", payload);
      return;
    }

    submitBtn.disabled = true;
    submitLabel.textContent = "Enviando...";

    const { error } = await client.from("csat_responses").insert([payload]);

    if (error) {
      submitBtn.disabled = false;
      submitLabel.textContent = "Enviar respostas";
      showError("Não deu pra enviar agora. Tenta de novo em alguns segundos — " + error.message);
      return;
    }

    form.hidden = true;
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
