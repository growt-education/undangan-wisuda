/*
  app.js — logika. Dibagi per fungsi dengan satu tugas masing-masing.
  Urutan eksekusi ada di init() paling bawah.
*/
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

  /* 1. Isi teks dari CONFIG ke elemen ber-atribut data-bind.
        Memakai textContent (bukan innerHTML) agar teks tidak pernah dianggap HTML. */
  function bindText() {
    document.querySelectorAll("[data-bind]").forEach((el) => {
      const value = getPath(CONFIG, el.dataset.bind);
      if (value != null) el.textContent = value;
    });
    $("#mapsLink").href = CONFIG.mapsUrl;
    $("#mapOpen").href = CONFIG.mapsUrl;
    document.title = `Undangan Wisuda – ${CONFIG.graduate.name}`;
  }

  /* 2. Nama tamu dari URL: index.html?to=Budi%20Santoso */
  function setGuest() {
    const to = (new URLSearchParams(location.search).get("to") || "").trim().slice(0, 60);
    if (!to) return;
    $("#guestName").textContent = to;
    $("#fName").value = to;
  }

  /* 3. Cover: buka undangan, buka kunci scroll */
  function setupCover() {
    const cover = $("#cover");
    $("#openBtn").addEventListener("click", () => {
      cover.classList.add("is-open");
      cover.inert = true;
      document.body.classList.remove("is-locked");
      window.scrollTo(0, 0);
      $("#dock").hidden = false;
      startMusic(); // klik tombol = interaksi pengguna, saat browser mengizinkan musik otomatis
    });
  }

  /* 4. Pilihan kehadiran dibuat dari CONFIG supaya selalu sinkron dengan Form */
  function fillAttendance() {
    const select = $("#fAttend");
    CONFIG.form.attendanceOptions.forEach((label) => {
      select.append(new Option(label, label));
    });
  }

  /* ===== Buku tamu ===== */
  const state = { items: [], page: 1 };
  const rtf = new Intl.RelativeTimeFormat("id", { numeric: "auto" });

  const initials = (name) => name.trim().split(/\s+/).slice(0, 3).map((w) => w[0]).join("").toUpperCase();

  function timeAgo(date) {
    if (!date) return "";
    const diff = (date - Date.now()) / 1000;
    const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
    for (const [unit, sec] of units) {
      if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit);
    }
    return "baru saja";
  }

  // Sheet mengirim tanggal sebagai teks "Date(2026,9,29,10,5,0)" (bulan mulai dari 0)
  function parseSheetDate(v) {
    const m = /Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/.exec(v || "");
    return m ? new Date(+m[1], +m[2], +m[3], +m[4] || 0, +m[5] || 0, +m[6] || 0) : null;
  }

  /* Diagnostik: kotak kecil di bawah daftar ucapan. Matikan dengan debug: false di config.js */
  function setDebug(msg, isError) {
    if (CONFIG.debug === false) return;
    let el = $("#debugBox");
    if (!el) {
      el = document.createElement("p");
      el.id = "debugBox";
      el.style.cssText = "margin-top:1rem;font:12px/1.4 monospace;word-break:break-word";
      $(".guestbook__card").append(el);
    }
    el.style.color = isError ? "#ff9d8a" : "#9fd8a0";
    el.textContent = "[debug] " + msg;
    console[isError ? "error" : "log"]("[undangan]", msg);
  }

  /* Baca semua baris Sheet: kolom A waktu, B nama, C ucapan, D kehadiran */
  async function fetchSheet() {
    const { id, gid } = CONFIG.sheet;
    if (!id) throw new Error("sheet.id belum diisi di config.js");
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&gid=${gid}`;
    const text = await (await fetch(url)).text();
    // Respons dibungkus fungsi JS; ambil hanya bagian JSON-nya
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return json.table.rows.map(({ c }) => ({
      time: parseSheetDate(c[0]?.v),
      name: c[1]?.v || "",
      text: c[2]?.v || "",
      attend: c[3]?.v || ""
    }));
  }

  async function loadWishes() {
    try {
      state.items = (await fetchSheet()).filter((i) => i.name && i.text).reverse(); // terbaru di atas
      setDebug(`Sheet terbaca: ${state.items.length} ucapan.`);
    } catch (err) {
      setDebug("Gagal membaca Sheet: " + err.message, true);
    }
    render();
  }

  /* Satu item ucapan; withBadge menambah label kehadiran (dipakai di panel informasi) */
  function wishNode(item, withBadge) {
    const li = document.createElement("li");
    li.className = "wish";
    const avatar = Object.assign(document.createElement("div"), { className: "avatar", textContent: initials(item.name) });
    const name = Object.assign(document.createElement("p"), { className: "wish__name", textContent: item.name });
    if (withBadge && item.attend) name.append(Object.assign(document.createElement("span"), { className: "badge", textContent: item.attend }));
    const body = document.createElement("div");
    body.append(
      name,
      Object.assign(document.createElement("p"), { className: "wish__text", textContent: item.text }),
      Object.assign(document.createElement("p"), { className: "wish__meta", textContent: timeAgo(item.time) })
    );
    li.append(avatar, body);
    return li;
  }

  function render() {
    const list = $("#wishList");
    const per = CONFIG.wishesPerPage;
    const pages = Math.max(1, Math.ceil(state.items.length / per));
    state.page = Math.min(state.page, pages);
    list.replaceChildren();

    if (!state.items.length) {
      const li = document.createElement("li");
      li.className = "wishes__empty";
      li.textContent = "Belum ada ucapan. Jadilah yang pertama.";
      list.append(li);
    }

    state.items.slice((state.page - 1) * per, state.page * per).forEach((item) => list.append(wishNode(item)));
    renderPager(pages);
  }

  function renderPager(pages) {
    const nav = $("#pager");
    nav.hidden = pages <= 1;
    nav.replaceChildren();
    const btn = (label, page, disabled, current) => {
      const b = Object.assign(document.createElement("button"), { type: "button", textContent: label, disabled });
      b.dataset.page = page;
      if (current) b.setAttribute("aria-current", "page");
      return b;
    };
    nav.append(btn("← Previous", state.page - 1, state.page === 1));
    for (let p = 1; p <= pages; p++) nav.append(btn(p, p, false, p === state.page));
    nav.append(btn("Next →", state.page + 1, state.page === pages));
  }

  function setupPager() {
    $("#pager").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-page]");
      if (!b || b.disabled) return;
      state.page = +b.dataset.page;
      render();
    });
  }

  /* 5. Kirim ucapan ke Google Form */
  function setStatus(msg, isError) {
    const el = $("#formStatus");
    el.textContent = msg;
    el.classList.toggle("is-error", !!isError);
  }
/* Kirim ke Google Form lewat POST ke iframe tersembunyi (tanpa CORS) */
  function postToGoogleForm(id, fields) {
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.name = "gformTarget";
      iframe.hidden = true;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `https://docs.google.com/forms/d/e/${id}/formResponse`;
      form.target = iframe.name;
      Object.entries(fields).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.append(input);
      });

      document.body.append(iframe, form);
      form.submit();

      // Jangan hapus iframe cepat-cepat: menghapusnya membatalkan pengiriman.
      setTimeout(resolve, 1500);
      setTimeout(() => { iframe.remove(); form.remove(); }, 15000);
    });
  }
  function setupForm() {
    $("#wishForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#fName").value.trim();
      const message = $("#fMessage").value.trim();
      const attendance = $("#fAttend").value;
      const { id, entries } = CONFIG.form;

      if (!name || !message || !attendance) return setStatus("Lengkapi nama, ucapan, dan konfirmasi kehadiran.", true);
      if (!entries.name || !entries.message || !entries.attendance) return setStatus("Formulir belum disambungkan ke Google Form (isi entries di config.js).", true);

      const fields = { [entries.name]: name, [entries.message]: message, [entries.attendance]: attendance };
      const btn = $("#sendBtn");
      btn.disabled = true;
      setStatus("Mengirim…");
      try {
        await postToGoogleForm(id, fields);
        state.items.unshift({ name, text: message, attend: attendance, time: new Date() }); // tampilkan langsung
        state.page = 1;
        render();
        e.target.reset();
        setStatus("Terima kasih, ucapan Anda sudah terkirim.");
      } catch (err) {
        setStatus("Ucapan belum terkirim. Periksa koneksi lalu coba lagi.", true);
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ===== Musik ===== */
  const audio = $("#bgm");
  function setupMusic() {
    audio.src = (CONFIG.music && CONFIG.music.src) || "assets/audio/song.mp3";
    audio.volume = CONFIG.music && CONFIG.music.volume != null ? CONFIG.music.volume : 0.7;
    const btn = $("#musicBtn");
    // Tampilan tombol mengikuti keadaan audio yang sebenarnya, bukan tebakan
    const sync = () => {
      btn.setAttribute("aria-pressed", String(!audio.paused));
      btn.setAttribute("aria-label", audio.paused ? "Putar musik" : "Jeda musik");
    };
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);
    btn.addEventListener("click", () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
  }
  function startMusic() {
    if (!CONFIG.music || CONFIG.music.autoplay !== false) audio.play().catch(() => {});
  }

  /* ===== Peta & informasi (dialog bawaan browser: Esc menutup, fokus terkunci otomatis) ===== */
  const DEFAULT_EMBED = "https://maps.google.com/maps?q=-3.6538418,128.1839639&z=17&output=embed";
  let infoTab = "Semua";

  function renderInfo() {
    const opts = CONFIG.form.attendanceOptions;
    const el = (tag, props) => Object.assign(document.createElement(tag), props);

    const stats = $("#stats");
    stats.style.gridTemplateColumns = `repeat(${opts.length}, 1fr)`;
    stats.replaceChildren(...opts.map((o) => {
      const box = el("div", { className: "stat" });
      box.append(el("b", { textContent: state.items.filter((i) => i.attend === o).length }), el("span", { textContent: o }));
      return box;
    }));

    $("#tabs").replaceChildren(...["Semua", ...opts].map((t) => {
      const b = el("button", { type: "button", textContent: t });
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(t === infoTab));
      b.addEventListener("click", () => { infoTab = t; renderInfo(); });
      return b;
    }));

    const list = $("#infoList");
    const rows = infoTab === "Semua" ? state.items : state.items.filter((i) => i.attend === infoTab);
    list.replaceChildren();
    if (!rows.length) list.append(el("li", { className: "wishes__empty", textContent: "Belum ada data." }));
    rows.forEach((i) => list.append(wishNode(i, true)));
  }

  async function openInfo() {
    $("#infoDialog").showModal();
    renderInfo();
    try { // ambil data terbaru setiap panel dibuka
      state.items = (await fetchSheet()).filter((i) => i.name && i.text).reverse();
      renderInfo();
      render();
    } catch (err) {
      setDebug("Gagal memperbarui informasi: " + err.message, true);
    }
  }

  function setupDialogs() {
    $("#mapBtn").addEventListener("click", () => {
      const frame = $("#mapFrame");
      if (!frame.getAttribute("src")) frame.src = CONFIG.mapsEmbedUrl || DEFAULT_EMBED; // dimuat saat pertama dibuka
      $("#mapDialog").showModal();
    });
    $("#infoBtn").addEventListener("click", openInfo);
    document.querySelectorAll("dialog").forEach((d) => {
      d.addEventListener("click", (e) => {
        const r = d.getBoundingClientRect();
        const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        if (outside || e.target.closest("[data-close]")) d.close();
      });
    });
  }

  function init() {
    bindText();
    setGuest();
    setupCover();
    fillAttendance();
    setupPager();
    setupForm();
    setupMusic();
    setupDialogs();
    loadWishes();
  }
  init();
})();
