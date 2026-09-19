(async () => {
  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const fetchJson = async (path, fallback) => {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.warn(`TANNETVISION: 无法读取 ${path}`, error);
      return fallback;
    }
  };

  const [site, projectsRaw, experiencesRaw, videosRaw, photosRaw, lutsRaw, contact] = await Promise.all([
    fetchJson("data/site.json", {}),
    fetchJson("data/projects.json", []),
    fetchJson("data/experiences.json", []),
    fetchJson("data/videos.json", []),
    fetchJson("data/photos.json", []),
    fetchJson("data/luts.json", []),
    fetchJson("data/contact.json", [])
  ]);

  const sortByOrder = (items) => [...items].sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));
  const projects = sortByOrder(projectsRaw);
  const experiences = sortByOrder(experiencesRaw);
  const assets = sortByOrder([
    ...videosRaw.map(item => ({ ...item, type: "video" })),
    ...photosRaw.map(item => ({ ...item, type: "photo" })),
    ...lutsRaw.map(item => ({ ...item, type: "lut" }))
  ]);
  const DATA = { site, projects, experiences, assets, contact };

  const mediaLayer = ({ src, alt, theme, className = "" }) => {
    const safeTheme = theme || "linear-gradient(135deg,#15262c,#1b1d20 55%,#40566d)";
    const image = src
      ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.style.display='none'">`
      : "";
    return `<div class="generated-media ${className}" style="--media-theme:${safeTheme}">${image}</div>`;
  };

  const directVideoUrl = (url = "") => /\.(mp4|webm|ogg)(\?|#|$)/i.test(url) || url.startsWith("/media/") || url.startsWith("media/");

  const youtubeId = (url = "") => {
    try {
      const u = new URL(url, window.location.href);
      if (u.hostname.includes("youtu.be")) return u.pathname.split("/").filter(Boolean)[0] || "";
      if (u.hostname.includes("youtube.com")) {
        if (u.pathname.startsWith("/watch")) return u.searchParams.get("v") || "";
        const parts = u.pathname.split("/").filter(Boolean);
        if (["shorts", "embed"].includes(parts[0])) return parts[1] || "";
      }
    } catch (_) {}
    return "";
  };

  const bilibiliId = (url = "") => (String(url).match(/BV[0-9A-Za-z]+/) || [""])[0];

  const renderVideoPlayer = (url = "", title = "视频") => {
    if (!url) return "";
    const yt = youtubeId(url);
    if (yt) {
      return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${escapeHtml(yt)}?rel=0" title="${escapeHtml(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    }
    const bv = bilibiliId(url);
    if (bv) {
      return `<div class="video-embed"><iframe src="https://player.bilibili.com/player.html?bvid=${escapeHtml(bv)}&page=1&high_quality=1&danmaku=0" title="${escapeHtml(title)}" loading="lazy" allowfullscreen></iframe></div>`;
    }
    if (directVideoUrl(url)) {
      return `<video class="project-player" controls playsinline preload="metadata" src="${escapeHtml(url)}"></video>`;
    }
    return `<div class="empty-media-note">已填写视频地址。<a href="${escapeHtml(url)}" target="_blank" rel="noopener">打开视频 →</a></div>`;
  };

  function renderHome() {
    const heroVideo = document.querySelector("#heroVideo");
    const fallback = document.querySelector(".hero-fallback");
    if (fallback && DATA.site.heroPoster) {
      fallback.style.backgroundImage = `url("${String(DATA.site.heroPoster).replaceAll('"', '%22')}")`;
      fallback.style.backgroundSize = "cover";
      fallback.style.backgroundPosition = "center";
    }
    if (heroVideo && DATA.site.heroVideo && directVideoUrl(DATA.site.heroVideo)) {
      heroVideo.src = DATA.site.heroVideo;
      heroVideo.addEventListener("error", () => heroVideo.style.display = "none");
    } else if (heroVideo) {
      heroVideo.style.display = "none";
    }
    const motto = document.querySelector("#heroMotto");
    const name = document.querySelector("#heroName");
    if (motto) motto.textContent = DATA.site.motto || "永不止步";
    if (name) name.textContent = DATA.site.name || "TANNETVISION";

    const container = document.querySelector("#featuredProjects");
    if (!container) return;
    const featured = DATA.projects.filter(item => item.featured).slice(0, 3);
    container.innerHTML = featured.map((project, index) => `
      <article class="film-card">
        <a class="film-thumb-link" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="查看 ${escapeHtml(project.title)}">
          ${mediaLayer({ src: project.cover, alt: project.title, theme: project.theme, className: "film-thumb" })}
          ${project.previewUrl && directVideoUrl(project.previewUrl) ? `<video class="card-preview" muted loop playsinline preload="metadata" src="${escapeHtml(project.previewUrl)}"></video>` : ""}
        </a>
        <div class="film-info">
          <span class="num">${String(index + 1).padStart(2, "0")} / ${escapeHtml(project.year)}</span>
          <h3>${escapeHtml(project.englishTitle || project.title)}</h3>
          <div class="meta">${escapeHtml(project.categoryEn || project.category)} · ${escapeHtml((project.roles || []).join(" & "))}</div>
          <p class="desc">${escapeHtml(project.description || "")}</p>
          <a class="link" href="project.html?id=${encodeURIComponent(project.id)}">VIEW FILM →</a>
        </div>
      </article>
    `).join("");
    enablePreviewHover(container);
  }

  function renderProjects() {
    const grid = document.querySelector("#projectsGrid");
    const filters = document.querySelector("#projectFilters");
    if (!grid) return;

    let active = "全部";
    const render = () => {
      const filtered = active === "全部" ? DATA.projects : DATA.projects.filter(item => item.category === active);
      grid.innerHTML = filtered.map(project => `
        <a class="project-tile" href="project.html?id=${encodeURIComponent(project.id)}">
          <div class="project-image-wrap">
            ${mediaLayer({ src: project.cover, alt: project.title, theme: project.theme, className: "project-image" })}
            ${project.previewUrl && directVideoUrl(project.previewUrl) ? `<video class="card-preview" muted loop playsinline preload="metadata" src="${escapeHtml(project.previewUrl)}"></video>` : ""}
            <span class="project-view">VIEW PROJECT</span>
          </div>
          <div class="project-body">
            <div><h3>${escapeHtml(project.englishTitle || project.title)}</h3><p class="project-cn-title">${escapeHtml(project.title)}</p></div>
            <div class="meta">${escapeHtml(project.categoryEn || project.category)} · ${escapeHtml(project.year)}</div>
          </div>
        </a>
      `).join("");
      enablePreviewHover(grid);
    };

    const categories = ["全部", ...new Set(DATA.projects.map(item => item.category).filter(Boolean))];
    if (filters) {
      filters.innerHTML = categories.map((category, index) => `<button class="${index === 0 ? "active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("");
      filters.addEventListener("click", event => {
        const button = event.target.closest("button[data-category]");
        if (!button) return;
        active = button.dataset.category;
        filters.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
        render();
      });
    }
    render();
  }

  function renderExperience() {
    const container = document.querySelector("#experienceList");
    if (!container) return;
    container.innerHTML = DATA.experiences.map(item => `
      <article class="timeline-item">
        <div class="timeline-year">${escapeHtml(item.year)}</div>
        <div class="timeline-content"><h3>${escapeHtml(item.title)}</h3><div class="experience-role">${escapeHtml(item.role)}</div><p>${escapeHtml(item.description || "")}</p></div>
      </article>
    `).join("");
  }

  function assetCover(item) {
    const src = item.cover || item.image || item.after || item.before || "";
    const image = src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.style.display='none'">` : "";
    const label = item.type === "video" ? "VIDEO" : item.type === "photo" ? "PHOTO" : "LUT";
    const source = item.websiteVideoUrl || item.sourceUrl || "";
    return `<div class="asset-cover generated-media" style="--media-theme:${item.theme || "#ddd"}">${image}<span class="asset-kind">${label}</span>${item.type === "video" && source && directVideoUrl(source) ? `<video class="asset-preview" muted loop playsinline preload="metadata" src="${escapeHtml(source)}"></video>` : ""}</div>`;
  }

  function assetAction(item) {
    const href = item.downloadUrl || item.source || item.websiteVideoUrl || item.sourceUrl || item.wechatVideoUrl || item.image || "";
    if (!href) return "";
    const isWechatOnlyVideo = item.type === "video" && !item.websiteVideoUrl && !item.sourceUrl && !!item.wechatVideoUrl;
    const label = item.type === "lut" ? "DOWNLOAD LUT →" : item.type === "video" ? (isWechatOnlyVideo ? "视频号观看 ↗" : "VIEW VIDEO →") : "VIEW PHOTO →";
    return `<a class="asset-action" href="${escapeHtml(href)}" ${/^https?:/i.test(href) ? 'target="_blank" rel="noopener"' : ""}>${label}</a>`;
  }

  function renderAssets() {
    const grid = document.querySelector("#assetsGrid");
    const tabs = document.querySelector("#assetTabs");
    const search = document.querySelector("#assetSearch");
    const resultCount = document.querySelector("#assetResultCount");
    if (!grid) return;

    let activeFilter = "all";
    const render = () => {
      const q = (search?.value || "").trim().toLowerCase();
      const items = DATA.assets.filter(item => {
        const typeOk = activeFilter === "all" || item.type === activeFilter;
        const haystack = [item.title, item.info, ...(item.tags || [])].join(" ").toLowerCase();
        return typeOk && (!q || haystack.includes(q));
      });
      grid.innerHTML = items.map(item => `
        <article class="asset-card" data-type="${escapeHtml(item.type)}">
          ${assetCover(item)}
          <div class="asset-title"><span>${escapeHtml(item.title)}</span><span class="badge">${escapeHtml(item.badge || "")}</span></div>
          <div class="asset-meta">${escapeHtml(item.info || "")}</div>
          ${assetAction(item)}
        </article>
      `).join("");
      if (resultCount) resultCount.textContent = `${items.length} ITEMS`;
      enableAssetHover(grid);
    };

    tabs?.addEventListener("click", event => {
      const button = event.target.closest("button[data-filter]");
      if (!button) return;
      tabs.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
      activeFilter = button.dataset.filter || "all";
      render();
    });
    search?.addEventListener("input", render);
    render();
  }

  function renderProjectDetail() {
    const root = document.querySelector("#projectDetail");
    if (!root) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const project = DATA.projects.find(item => item.id === id) || DATA.projects[0];
    if (!project) {
      root.innerHTML = `<section class="section"><div class="container"><div class="empty-media-note">暂时还没有项目。</div></div></section>`;
      return;
    }

    document.title = `${project.title} — ${DATA.site.name || "TANNETVISION"}`;
    const websiteVideoUrl = project.websiteVideoUrl || project.videoUrl || project.film || "";
    const wechatVideoUrl = project.wechatVideoUrl || "";
    const player = renderVideoPlayer(websiteVideoUrl, project.title);
    const projectActions = `
      <div class="project-actions">
        ${websiteVideoUrl ? `<a class="project-action primary" href="#film-player">PLAY FILM <span>↘</span></a>` : ""}
        ${wechatVideoUrl ? `<a class="project-action" href="${escapeHtml(wechatVideoUrl)}" target="_blank" rel="noopener">视频号观看 <span>↗</span></a>` : ""}
      </div>`;
    root.innerHTML = `
      <section class="project-detail-hero">
        <div class="project-detail-media">${mediaLayer({ src: project.cover, alt: project.title, theme: project.theme, className: "detail-cover" })}<div class="project-detail-overlay"></div></div>
        <div class="container project-detail-title"><div class="eyebrow">${escapeHtml(project.categoryEn || project.category)} · ${escapeHtml(project.year)}</div><h1>${escapeHtml(project.englishTitle || project.title)}</h1><p class="project-detail-cn">${escapeHtml(project.title)}</p></div>
      </section>
      <section class="section project-overview"><div class="container project-overview-grid"><div><div class="eyebrow">Project Overview</div><h2>${escapeHtml(project.description || "")}</h2>${projectActions}</div><div class="project-facts"><div><span>YEAR</span><strong>${escapeHtml(project.year)}</strong></div><div><span>TYPE</span><strong>${escapeHtml(project.category)}</strong></div><div><span>ROLE</span><strong>${escapeHtml((project.roles || []).join(" / "))}</strong></div></div></div></section>
      <section class="section project-story"><div class="container project-story-grid"><div class="eyebrow">Story / Concept</div><p>${escapeHtml(project.story || project.description || "")}</p></div></section>
      <section class="section project-player-section" id="film-player"><div class="container">${player || `<div class="empty-media-note">在 Pages CMS 的“项目管理”中填写“网站视频链接”，这里就会自动出现播放器。只有视频号链接时，可使用上方“视频号观看”按钮。</div>`}</div></section>
      ${Array.isArray(project.gallery) && project.gallery.length ? `<section class="section"><div class="container project-gallery">${project.gallery.map(src => `<img src="${escapeHtml(src)}" alt="${escapeHtml(project.title)} 项目图片" loading="lazy">`).join("")}</div></section>` : ""}
      <section class="section next-project-section"><div class="container">${nextProjectLink(project)}</div></section>`;
  }

  function nextProjectLink(project) {
    if (!DATA.projects.length) return "";
    const index = DATA.projects.findIndex(item => item.id === project.id);
    const next = DATA.projects[(Math.max(index, 0) + 1) % DATA.projects.length];
    return `<a class="next-project" href="project.html?id=${encodeURIComponent(next.id)}"><span>NEXT PROJECT</span><strong>${escapeHtml(next.englishTitle || next.title)} →</strong></a>`;
  }

  function renderContact() {
    const container = document.querySelector("#contactList");
    if (!container) return;
    container.innerHTML = DATA.contact.map(item => `<div class="contact-row"><span>${escapeHtml(item.label)}</span><span>${escapeHtml(item.value)}</span></div>`).join("");
  }

  function enablePreviewHover(scope) {
    scope.querySelectorAll(".card-preview").forEach(video => {
      const host = video.closest("a") || video.parentElement;
      host?.addEventListener("mouseenter", () => video.play().catch(() => {}));
      host?.addEventListener("mouseleave", () => { video.pause(); try { video.currentTime = 0; } catch (_) {} });
    });
  }

  function enableAssetHover(scope) {
    scope.querySelectorAll(".asset-preview").forEach(video => {
      const host = video.closest(".asset-card");
      host?.addEventListener("mouseenter", () => video.play().catch(() => {}));
      host?.addEventListener("mouseleave", () => { video.pause(); try { video.currentTime = 0; } catch (_) {} });
    });
  }

  function renderCopyright() {
    document.querySelectorAll("[data-copyright]").forEach(node => node.textContent = DATA.site.copyright || `© ${new Date().getFullYear()} TANNETVISION`);
  }

  renderHome();
  renderProjects();
  renderExperience();
  renderAssets();
  renderProjectDetail();
  renderContact();
  renderCopyright();
})();
