/**
 * common.js — 企業級デザイン対応（お気に入り・履歴機能付き）
 * テーマ・トースト通知・ナビゲーション・ユーティリティ
 */

// ========== サニタイズ ==========

function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function sanitizeURL(url) {
  if (typeof url !== 'string') return '#';
  if (/^[\w\-\.\/]+$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
  } catch (e) { /* invalid URL */ }
  return '#';
}

// ========== ストレージ管理 ==========

const STORAGE_PREFIX = 'pgp';

const APP_STORAGE_KEYS = [
  'theme',
  'favorites',
  'visitHistory',
  'profile',
  'stats',
  'gallery',
  'randomColorSettings',
  'emojiSettings',
  'appSettings',
  'paletteHistory',
  'workspaceProfiles',
  'activeWorkspaceProfile',
  'workspaceStates',
  'teamWorkspace',
  'brandGuidelines',
  'auditReports',
  'paletteCompareState',
  'pairedPaletteDraft',
  'appOfflineBackup'
];

function getScopedKey(key) {
  return `${STORAGE_PREFIX}.${key}`;
}

function migrateStorageKeys() {
  APP_STORAGE_KEYS.forEach((key) => {
    const scoped = getScopedKey(key);
    const scopedValue = localStorage.getItem(scoped);
    const legacyValue = localStorage.getItem(key);

    if (scopedValue === null && legacyValue !== null) {
      localStorage.setItem(scoped, legacyValue);
    }
  });
}

function getRawData(key, defaultValue = null) {
  const scoped = localStorage.getItem(getScopedKey(key));
  if (scoped !== null) return scoped;

  const legacy = localStorage.getItem(key);
  if (legacy !== null) {
    localStorage.setItem(getScopedKey(key), legacy);
    return legacy;
  }

  return defaultValue;
}

function setRawData(key, value) {
  localStorage.setItem(getScopedKey(key), value);
}

function removeRawData(key) {
  localStorage.removeItem(getScopedKey(key));
  localStorage.removeItem(key);
}

function normalizeThemeValue(theme) {
  return theme === 'dark' || theme === 'light' ? theme : null;
}

function getThemePreference() {
  return normalizeThemeValue(getRawData('theme')) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function setThemePreference(theme) {
  setRawData('theme', normalizeThemeValue(theme) || 'light');
}

// ========== テーマ管理 ==========

function applyTheme() {
  const saved = getThemePreference();
  document.documentElement.className = saved;
  updateThemeButton();
  return saved;
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const next = isDark ? "light" : "dark";
  document.documentElement.className = next;
  setThemePreference(next);
  updateThemeButton();
  
  document.documentElement.style.transition = "background 0.3s ease, color 0.3s ease";
  setTimeout(() => {
    document.documentElement.style.transition = "";
  }, 300);
  
  return next;
}

function updateThemeButton() {
  const btn = document.querySelector(".nav-theme-toggle");
  if (btn) {
    const isDark = document.documentElement.classList.contains("dark");
    btn.innerHTML = `<span class="nav-icon">${isDark ? '☀️' : '🌙'}</span>`;
  }
}

// ========== トースト通知 ==========

function showToast(msg, duration = 2500, type = "default") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.add("show");
  
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), duration);
}

// ========== お気に入り機能 ==========

function addToFavorites(itemId, itemName, itemEmoji = '⭐') {
  const favorites = getFavorites();
  
  // 重複チェック
  if (favorites.some(fav => fav.id === itemId)) {
    removeFavorite(itemId);
    showToast(`❌ ${itemName} をお気に入りから削除しました`, 2000, 'info');
    return false;
  }
  
  favorites.push({
    id: itemId,
    name: itemName,
    emoji: itemEmoji,
    addedAt: new Date().toISOString()
  });
  
  saveData('favorites', favorites);
  showToast(`❤️ ${itemName} をお気に入りに追加しました`, 2000, 'success');
  return true;
}

function removeFavorite(itemId) {
  const favorites = getFavorites();
  const filtered = favorites.filter(fav => fav.id !== itemId);
  saveData('favorites', filtered);
}

function isFavorite(itemId) {
  return getFavorites().some(fav => fav.id === itemId);
}

function getFavorites() {
  const favorites = loadData('favorites', []);
  return Array.isArray(favorites) ? favorites : [];
}

function toggleFavoriteButton(button, itemId, itemName, itemEmoji = '⭐') {
  const isFav = isFavorite(itemId);
  
  if (isFav) {
    removeFavorite(itemId);
    button.textContent = '☆';
    button.classList.remove('is-favorite');
    button.title = 'お気に入りに追加';
    button.setAttribute('aria-pressed', 'false');
  } else {
    addToFavorites(itemId, itemName, itemEmoji);
    button.textContent = '★';
    button.classList.add('is-favorite');
    button.title = 'お気に入りから削除';
    button.setAttribute('aria-pressed', 'true');
  }
}

// ========== 履歴機能 ==========

const HIDDEN_NAV_PAGES = new Set(['profile-enterprise.html', 'settings-enterprise.html']);

function getPageFileName(url) {
  if (typeof url !== 'string' || !url) return '';
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.pathname.split('/').pop() || '';
  } catch (e) {
    return url.split('#')[0].split('?')[0].split('/').pop() || '';
  }
}

function isHiddenPageUrl(url) {
  return HIDDEN_NAV_PAGES.has(getPageFileName(url));
}

function addToHistory(pageUrl, pageName, pageEmoji = '📄') {
  if (isHiddenPageUrl(pageUrl)) return;
  const history = getHistory();
  
  // 同じページを再度訪問した場合は古い履歴を削除
  const filtered = history.filter(item => item.url !== pageUrl);
  
  filtered.unshift({
    url: pageUrl,
    name: pageName,
    emoji: pageEmoji,
    visitedAt: new Date().toISOString()
  });
  
  // 最新50件のみ保存
  const limited = filtered.slice(0, 50);
  saveData('visitHistory', limited);
}

function getHistory() {
  const history = loadData('visitHistory', []);
  return Array.isArray(history) ? history : [];
}

function clearHistory() {
  if (confirmAction('訪問履歴をすべて削除しますか？')) {
    removeRawData('visitHistory');
    buildHistoryNav(window.location.pathname.split('/').pop());
    showToast('🗑️ 履歴を削除しました', 2000, 'info');
  }
}

function buildHistoryNav(currentPage) {
  const historyNav = document.getElementById('historyNav');
  if (!historyNav) return;
  
  const history = getHistory().filter(item => !isHiddenPageUrl(item.url));
  
  if (history.length === 0) {
    historyNav.style.display = 'none';
    return;
  }
  
  historyNav.style.display = 'block';
  const card = document.createElement('div');
  card.className = 'history-card';

  const header = document.createElement('div');
  header.className = 'history-header';

  const icon = document.createElement('span');
  icon.className = 'history-icon';
  icon.textContent = '📜';

  const title = document.createElement('span');
  title.className = 'history-title';
  title.textContent = '最近訪問したページ';

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'history-clear';
  clearButton.textContent = '履歴をクリア';
  clearButton.addEventListener('click', clearHistory);

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(clearButton);

  const grid = document.createElement('div');
  grid.className = 'history-grid';

  history.slice(0, 6).forEach((item) => {
    const link = document.createElement('a');
    link.className = 'history-link';
    link.href = sanitizeURL(item.url);
    link.setAttribute('aria-label', `${item.name} へ移動`);

    const emoji = document.createElement('span');
    emoji.className = 'history-link-emoji';
    emoji.textContent = String(item.emoji ?? '📄');

    const name = document.createElement('span');
    name.className = 'history-link-name';
    name.textContent = String(item.name ?? 'ページ');

    link.appendChild(emoji);
    link.appendChild(name);
    grid.appendChild(link);
  });

  card.appendChild(header);
  card.appendChild(grid);
  historyNav.replaceChildren(card);
}

// ========== ナビゲーション ==========

function buildNav(activePage = "") {
  const nav = document.getElementById("mainNav");
  if (!nav) {
    console.error("mainNav element not found!");
    return;
  }

  const links = [
    { href: "index-enterprise.html", icon: "🏠", label: "ホーム", key: "index", group: "スタート" },
    { href: "random-color.html", icon: "🎨", label: "カラー生成", key: "random", group: "配色" },
    { href: "harmony.html", icon: "🎯", label: "配色ハーモニー", key: "harmony", group: "配色" },
    { href: "gradient-generator.html", icon: "🌈", label: "グラデーション", key: "gradient", group: "配色" },
    { href: "contrast-checker.html", icon: "◐", label: "見やすさチェック", key: "contrast", group: "配色" },
    { href: "emoji-generator-enterprise.html", icon: "😊", label: "絵文字生成", key: "emoji", group: "生成" },
    { href: "pose-generator-enterprise.html", icon: "🧍", label: "ポーズ生成", key: "pose", group: "生成" },
    { href: "chara-generator-enterprise.html", icon: "👥", label: "キャラ生成", key: "chara", group: "生成" },
    { href: "gallery.html", icon: "🖼️", label: "作品ギャラリー", key: "gallery", group: "管理" }
  ];

  const sectionOrder = ["スタート", "配色", "生成", "管理"];
  const sectionMeta = {
    "スタート": { title: "スタート", icon: "🏠" },
    "配色": { title: "配色ツール", icon: "🎨" },
    "生成": { title: "生成ツール", icon: "✨" },
    "管理": { title: "管理", icon: "🗂️" }
  };
  const sectionHtml = sectionOrder.map((section) => {
    const sectionLinks = links.filter((link) => link.group === section);
    if (sectionLinks.length === 0) return '';
    const sectionInfo = sectionMeta[section] || { title: section, icon: '•' };

    return `
      <section class="nav-group-card" aria-label="${sectionInfo.title}">
        <p class="nav-group-title">
          <span class="nav-group-icon" aria-hidden="true">${sectionInfo.icon}</span>
          <span>${sectionInfo.title}</span>
        </p>
        <div class="nav-group-links">
          ${sectionLinks.map(l => {
            const isActive = l.key === activePage;
            return `
              <a href="${l.href}" class="nav-link nav-group-link${isActive ? ' active' : ''}" title="${l.label}">
                <span class="nav-link-icon">${l.icon}</span>
                <span class="nav-text">${l.label}</span>
                ${isActive ? '<span class="nav-indicator"></span>' : ''}
              </a>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }).join('');

  nav.innerHTML = `
    <button class="nav-toggle" id="navToggle" aria-label="メニューを開く">
      <span class="nav-toggle-icon">≡</span>
    </button>
    <div class="nav-menu" id="navMenu">
      <div class="nav-menu-header">
        <h3>ナビゲーション</h3>
        <button class="nav-close" id="navClose" aria-label="メニューを閉じる">✕</button>
      </div>
      <div class="nav-links">
        ${sectionHtml}
      </div>
      <div class="nav-footer">
        <a class="nav-creator-link" href="../index.html" title="製作者サイトへ" aria-label="製作者サイトへ移動" target="_blank" rel="noopener noreferrer">
          <span class="nav-icon">🌐</span>
          <span class="nav-text">製作者サイト</span>
        </a>
        <button class="nav-theme-toggle" id="navThemeToggle" title="テーマ切り替え" aria-label="テーマを切り替え">
          <span class="nav-icon">🌙</span>
        </button>
      </div>
      <div class="nav-legal-links" aria-label="法務リンク">
        <a href="../terms.html" target="_blank" rel="noopener noreferrer">利用規約</a>
        <span aria-hidden="true">・</span>
        <a href="../privacy-policy.html" target="_blank" rel="noopener noreferrer">プライバシー</a>
        <span aria-hidden="true">・</span>
        <a href="../tokutei-shotorihiki.html" target="_blank" rel="noopener noreferrer">特商法表記</a>
        <span aria-hidden="true">・</span>
        <a href="../cancellation-policy.html" target="_blank" rel="noopener noreferrer">返金・キャンセル</a>
      </div>
    </div>
  `;

  nav.querySelectorAll('.nav-link').forEach((link) => {
    if (isHiddenPageUrl(link.getAttribute('href') || '')) {
      link.remove();
    }
  });

  // イベントリスナー
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  const close = document.getElementById("navClose");
  const themeButton = document.getElementById("navThemeToggle");
  
  if (toggle) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("active");
    });
  }

  if (close) {
    close.addEventListener("click", closeMenu);
  }

  if (themeButton) {
    themeButton.addEventListener("click", toggleTheme);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("active")) {
      menu.classList.remove("active");
    }
  });

  // 外側クリックで閉じる
  document.addEventListener("click", (e) => {
    if (nav && !nav.contains(e.target) && menu.classList.contains("active")) {
      menu.classList.remove("active");
    }
  });

  // リンククリックで閉じる
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      menu.classList.remove("active");
    });
  });
}

function closeMenu() {
  const menu = document.getElementById("navMenu");
  if (menu) menu.classList.remove("active");
}

// ========== 共通スタイル ==========

function injectCommonStyles() {
  if (document.getElementById("common-styles")) return;
  
  const style = document.createElement("style");
  style.id = "common-styles";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    /* ===== CSS変数 ===== */
    :root {
      --brand-primary: #334155;
      --brand-primary-dark: #1e293b;
      --brand-secondary: #f59e0b;
      --brand-success: #10b981;
      --brand-danger: #ef4444;
      --brand-warning: #f97316;
      --text-primary: #1a1a2e;
      --text-secondary: #6b7280;
      --bg-light: #f9fafb;
      --bg-card: rgba(255, 255, 255, 0.95);
      --border-light: rgba(0, 0, 0, 0.08);
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px rgba(51, 65, 85, 0.15);
      --shadow-xl: 0 20px 25px rgba(51, 65, 85, 0.2);
      --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    html.dark {
      --text-primary: #e2e8f0;
      --text-secondary: #d1d5db;
      --bg-light: #1e293b;
      --bg-card: rgba(51, 65, 85, 0.95);
      --border-light: rgba(255, 255, 255, 0.08);
    }

    /* ===== ナビゲーション ===== */
    #mainNav {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999;
    }

    .nav-toggle {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
      color: white;
      border: none;
      cursor: pointer;
      font-size: 24px;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 8px 24px rgba(51, 65, 85, 0.3);
      transition: var(--transition);
      font-weight: 700;
    }

    .nav-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(51, 65, 85, 0.4);
    }

    .nav-toggle-icon {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 24px;
    }

    .nav-menu {
      position: fixed;
      top: 0;
      right: -420px;
      width: 380px;
      height: 100vh;
      background: var(--bg-card);
      border-left: 1px solid var(--border-light);
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transition: right 0.3s ease;
      z-index: 998;
    }

    .nav-menu.active {
      right: 0 !important;
    }

    .nav-menu-header {
      padding: 24px;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .nav-menu-header h3 {
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }

    html.dark .nav-menu-header h3 {
      background: none;
      -webkit-text-fill-color: #f8fafc;
      color: #f8fafc;
    }

    .nav-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--text-primary);
      transition: var(--transition);
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-close:hover {
      transform: scale(1.1);
    }

    .nav-links {
      flex: 1;
      padding: 12px 16px 16px;
      overflow-y: auto;
    }

    .nav-group-card {
      padding: 12px;
      border: 1px solid var(--border-light);
      border-radius: 12px;
      background: var(--bg-light);
    }

    html.dark .nav-group-card {
      background: rgba(51, 65, 85, 0.82);
      border-color: rgba(226, 232, 240, 0.22);
    }

    .nav-group-card + .nav-group-card {
      margin-top: 10px;
    }

    .nav-group-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-secondary);
      letter-spacing: 0.03em;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    html.dark .nav-group-title {
      color: #cbd5e1;
    }

    .nav-group-icon {
      font-size: 14px;
      line-height: 1;
    }

    .nav-group-links {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-guide {
      margin: 12px 16px 8px;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid var(--border-light);
      background: rgba(51, 65, 85, 0.06);
      flex-shrink: 0;
    }

    .nav-guide-title {
      margin: 0 0 4px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .nav-guide-text {
      margin: 0;
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .nav-link {
      display: flex !important;
      align-items: center !important;
      gap: 10px;
      padding: 10px 12px;
      color: var(--text-primary);
      text-decoration: none;
      font-weight: 500;
      transition: var(--transition);
      border: 1px solid var(--border-light);
      border-radius: 10px;
      position: relative;
      background: var(--bg-card);
      min-height: 0;
    }

    html.dark .nav-link {
      background: rgba(30, 41, 59, 0.86);
      border-color: rgba(226, 232, 240, 0.22);
      color: #e2e8f0;
    }

    .nav-link:hover {
      background: rgba(51, 65, 85, 0.08);
      border-color: #334155;
      color: #334155;
    }

    html.dark .nav-link:hover {
      background: rgba(148, 163, 184, 0.18);
      color: #f8fafc;
    }

    .nav-link.active {
      background: rgba(51, 65, 85, 0.12);
      border-color: #334155;
      color: #334155;
      font-weight: 600;
    }

    html.dark .nav-link.active {
      background: rgba(148, 163, 184, 0.22);
      border-color: #e2e8f0;
      color: #f8fafc;
    }

    .nav-link-icon {
      font-size: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 20px;
    }

    .nav-text {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      flex: 1;
    }

    .nav-indicator {
      position: absolute;
      top: 50%;
      right: 10px;
      width: 6px;
      height: 6px;
      background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
      border-radius: 999px;
      transform: translateY(-50%);
    }

    .nav-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border-light);
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }

    .nav-legal-links {
      padding: 0 20px 16px;
      font-size: 12px;
      color: var(--text-secondary);
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-shrink: 0;
    }

    html.dark .nav-legal-links {
      color: #cbd5e1;
    }

    .nav-legal-links a {
      color: inherit;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: var(--transition);
    }

    .nav-legal-links a:hover {
      color: var(--text-primary);
      border-bottom-color: currentColor;
    }

    html.dark .nav-legal-links a:hover {
      color: #f8fafc;
    }

    .nav-theme-toggle {
      flex: 1;
      padding: 12px;
      border: 1px solid var(--border-light);
      border-radius: 10px;
      background: var(--bg-light);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 18px;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-creator-link {
      flex: 1;
      padding: 12px;
      border: 1px solid var(--border-light);
      border-radius: 10px;
      background: var(--bg-light);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
    }

    .nav-creator-link:hover {
      background: rgba(51, 65, 85, 0.1);
      border-color: #334155;
      color: #334155;
    }

    html.dark .nav-creator-link:hover {
      background: rgba(148, 163, 184, 0.18);
      border-color: #e2e8f0;
      color: #f8fafc;
    }

    .nav-theme-toggle:hover {
      background: rgba(51, 65, 85, 0.1);
      border-color: #334155;
    }

    html.dark .nav-theme-toggle:hover {
      background: rgba(148, 163, 184, 0.18);
      border-color: #e2e8f0;
    }

    /* ===== 履歴ナビ ===== */
    .history-card {
      margin-bottom: 24px;
      padding: 16px;
      background: rgba(51, 65, 85, 0.08);
      border: 1px solid rgba(51, 65, 85, 0.15);
      border-radius: 12px;
    }

    .history-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .history-icon {
      font-size: 18px;
    }

    .history-title {
      font-weight: 600;
    }

    .history-clear {
      margin-left: auto;
      padding: 4px 12px;
      font-size: 0.8rem;
      border: none;
      background: rgba(51, 65, 85, 0.15);
      border-radius: 6px;
      cursor: pointer;
      color: inherit;
      font-weight: 600;
    }

    .history-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
    }

    .history-link {
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(51, 65, 85, 0.2);
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      text-align: center;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      font-size: 0.95rem;
      font-weight: 500;
    }

    html.dark .history-link {
      background: rgba(71, 85, 105, 0.85);
      border-color: rgba(226, 232, 240, 0.35);
      color: #f8fafc;
    }

    .history-link:hover,
    .history-link:focus-visible {
      background: rgba(51, 65, 85, 0.1);
      transform: translateY(-2px);
      outline: none;
    }

    .history-link-emoji {
      font-size: 20px;
    }

    /* ===== トースト ===== */
    .toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(120px);
      padding: 14px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      opacity: 0;
      pointer-events: none;
      transition: var(--transition);
      z-index: 3000;
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      pointer-events: auto;
    }

    .toast.default {
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
    }

    .toast.success {
      background: rgba(16, 185, 129, 0.95);
      color: #fff;
    }

    .toast.error {
      background: rgba(239, 68, 68, 0.95);
      color: #fff;
    }

    .toast.info {
      background: rgba(102, 126, 234, 0.95);
      color: #fff;
    }

    .toast.warning {
      background: rgba(249, 115, 22, 0.95);
      color: #fff;
    }

    /* ===== ユーティリティクラス（既存ページ互換） ===== */
    .d-none { display: none !important; }
    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .pre-wrap { white-space: pre-wrap !important; }
    .opacity-08 { opacity: 0.8 !important; }
    .font-095em { font-size: 0.95em !important; }
    .label-bold { font-weight: 700 !important; }

    .mb-md { margin-bottom: 16px !important; }
    .mt-sm { margin-top: 8px !important; }
    .mt-lg { margin-top: 24px !important; }
    .mt-2xl { margin-top: 40px !important; }

    .flex-center {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .flex-gap-sm {
      display: flex !important;
      gap: 8px !important;
      align-items: center;
    }

    .flex-gap-md-wrap {
      display: flex !important;
      gap: 12px !important;
      align-items: center;
      flex-wrap: wrap;
    }

    .grid-auto-200 {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .grid-auto-350 {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 16px;
    }

    .btn-auto {
      width: auto !important;
      min-width: 120px;
    }

    .form-select {
      width: 100%;
      min-height: 44px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border-light);
      background: var(--bg-card);
      color: var(--text-primary);
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      font-size: 0.95rem;
    }

    .card-content-padding { padding: 16px !important; }
    .card-title {
      margin: 0 0 8px;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .card-text-sm {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .gradient-text-purple {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }

    /* ===== モバイルレスポンシブ ===== */
    @media (max-width: 768px) {
      #mainNav {
        top: auto;
        right: auto;
        bottom: 20px;
        left: 20px;
      }

      .nav-toggle {
        width: 48px;
        height: 48px;
        font-size: 20px;
      }

      .nav-menu {
        width: calc(100% - 40px);
        right: -100%;
        bottom: 70px;
        height: auto;
        max-height: 80vh;
        border-radius: 16px;
        border-left: none;
        border: 1px solid var(--border-light);
      }

      body {
        padding-bottom: 90px !important;
      }
    }

    @media (max-width: 480px) {
      .nav-menu {
        width: 100%;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        max-height: 85vh;
        border-radius: 20px 20px 0 0;
        border-left: none;
      }

      .nav-menu-header {
        padding: 16px 20px;
      }

      .nav-link {
        padding: 10px 12px;
        gap: 10px;
      }

      .nav-text {
        font-size: 13px;
      }
    }

    html.lightweight *,
    html.lightweight *::before,
    html.lightweight *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  `;
  
  document.head.appendChild(style);
}

function applyRuntimePreferences() {
  const defaults = {
    animation: true,
    lightweightMode: false,
    offlineBackup: true
  };
  const settings = { ...defaults, ...(loadData('appSettings', {}) || {}) };
  document.documentElement.classList.toggle('lightweight', Boolean(settings.lightweightMode));
  return settings;
}

function createOfflineBackupSnapshot() {
  try {
    const snapshot = {
      createdAt: new Date().toISOString(),
      data: {}
    };
    APP_STORAGE_KEYS.forEach((key) => {
      const value = getRawData(key);
      if (value !== null && value !== undefined) {
        snapshot.data[key] = value;
      }
    });
    setRawData('appOfflineBackup', JSON.stringify(snapshot));
  } catch (error) {
    console.warn('オフラインバックアップの作成に失敗しました', error);
  }
}

function setupOfflineBackup(settings) {
  if (!settings.offlineBackup) return;
  const saveBackup = () => createOfflineBackupSnapshot();
  window.addEventListener('beforeunload', saveBackup);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveBackup();
  });
}

// ========== ユーティリティ ==========

function saveData(key, value) {
  try {
    setRawData(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn("ローカルストレージへの保存に失敗しました:", e);
    return false;
  }
}

function loadData(key, defaultValue = null) {
  try {
    const item = getRawData(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn("ローカルストレージからの読み込みに失敗しました:", e);
    return defaultValue;
  }
}

function downloadJSON(filename, data) {
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2)));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function confirmAction(message) {
  return confirm(message);
}

function copyTextToClipboard(text, options = {}) {
  const {
    successMessage = '📋 コピーしました',
    emptyMessage = '⚠️ コピー対象がありません',
    fallbackMessage = 'ℹ️ コピー不可の環境です。手動でコピーしてください',
    errorMessage = '⚠️ コピーに失敗しました。手動でコピーしてください',
    toastDuration = 2000
  } = options;

  const normalized = String(text ?? '').trim();
  if (!normalized) {
    showToast(emptyMessage, 2200, 'warning');
    return Promise.resolve(false);
  }

  function fallbackCopy() {
    try {
      const ta = document.createElement('textarea');
      ta.value = normalized;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        showToast(successMessage, toastDuration, 'success');
        return true;
      }
    } catch (e) {}
    // Last resort: show prompt for manual copy
    try {
      window.prompt('コピーするには Ctrl+C / ⌘+C を押してください:', normalized);
      showToast(successMessage, toastDuration, 'success');
      return true;
    } catch (e) {}
    showToast(errorMessage, 2800, 'warning');
    return false;
  }

  if (!navigator.clipboard || !window.isSecureContext) {
    return Promise.resolve(fallbackCopy());
  }

  return navigator.clipboard.writeText(normalized)
    .then(() => {
      showToast(successMessage, toastDuration, 'success');
      return true;
    })
    .catch(() => {
      return fallbackCopy();
    });
}

function registerGlobalShortcuts() {
  const isEditableTarget = (target) => {
    const tag = String(target?.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || target?.isContentEditable;
  };

  const clickFirstAvailable = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el || el.disabled) continue;
      el.click();
      return true;
    }
    return false;
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;

    const key = String(event.key || '').toLowerCase();
    if (!['r', 'c', 's'].includes(key)) return;

    if (key === 'r') {
      const fired = clickFirstAvailable([
        '#genBtn',
        '#generateEmojisBtn',
        '#generatePoseBtn',
        '#generateBtn',
        '#addSampleBtn'
      ]);
      if (fired) event.preventDefault();
      return;
    }

    if (key === 'c') {
      const fired = clickFirstAvailable([
        '#copyBtn',
        '#copyAllBtn',
        '#copyCssBtn',
        '#copyVarsBtn'
      ]);
      if (fired) event.preventDefault();
      return;
    }

    if (key === 's') {
      const fired = clickFirstAvailable([
        '#histSaveBtn',
        '#savePoseBtn',
        '#saveCompositionBtn',
        '#saveProfileBtn',
        '#workspaceSaveBtn'
      ]);
      if (fired) event.preventDefault();
    }
  });
}

// ========== ワークスペース保存 ==========

function getWorkspaceProfiles() {
  const profiles = loadData('workspaceProfiles', []);
  if (!Array.isArray(profiles) || profiles.length === 0) {
    const initial = [{ id: 'default', name: 'Default', createdAt: new Date().toISOString() }];
    saveData('workspaceProfiles', initial);
    if (!getRawData('activeWorkspaceProfile')) {
      setRawData('activeWorkspaceProfile', 'default');
    }
    return initial;
  }
  return profiles;
}

function getActiveWorkspaceProfile() {
  const active = getRawData('activeWorkspaceProfile');
  const profiles = getWorkspaceProfiles();
  if (active && profiles.some((profile) => profile.id === active)) {
    return active;
  }
  const fallback = profiles[0]?.id || 'default';
  setRawData('activeWorkspaceProfile', fallback);
  return fallback;
}

function setActiveWorkspaceProfile(profileId) {
  const profiles = getWorkspaceProfiles();
  if (!profiles.some((profile) => profile.id === profileId)) return false;
  setRawData('activeWorkspaceProfile', profileId);
  return true;
}

function createWorkspaceProfile(name) {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) return null;

  const profiles = getWorkspaceProfiles();
  const existed = profiles.find((profile) => profile.name.toLowerCase() === normalizedName.toLowerCase());
  if (existed) return existed.id;

  const id = `ws_${Date.now().toString(36)}`;
  const next = [...profiles, { id, name: normalizedName, createdAt: new Date().toISOString() }];
  saveData('workspaceProfiles', next);
  return id;
}

function saveWorkspaceState(pageKey, state, profileId = null) {
  const targetId = profileId || getActiveWorkspaceProfile();
  const allStates = loadData('workspaceStates', {});
  if (!allStates[targetId]) allStates[targetId] = {};
  allStates[targetId][pageKey] = {
    state,
    savedAt: new Date().toISOString()
  };
  saveData('workspaceStates', allStates);
  return true;
}

function loadWorkspaceState(pageKey, profileId = null) {
  const targetId = profileId || getActiveWorkspaceProfile();
  const allStates = loadData('workspaceStates', {});
  return allStates?.[targetId]?.[pageKey]?.state || null;
}

// ========== 初期化 ==========

document.addEventListener("DOMContentLoaded", () => {
  migrateStorageKeys();
  applyTheme();
  injectCommonStyles();
  registerGlobalShortcuts();
  const runtimeSettings = applyRuntimePreferences();
  setupOfflineBackup(runtimeSettings);
  
  // 現在のページを履歴に追加
  const pageName = document.title.split(' - ')[0] || 'ページ';
  const currentFile = window.location.pathname.split('/').pop() || 'index-enterprise.html';
  const pageMap = {
    'index-enterprise.html': '🏠',
    'random-color.html': '🎨',
    'harmony.html': '🎯',
    'gradient-generator.html': '🌈',
    'contrast-checker.html': '◐',
    'emoji-generator-enterprise.html': '😊',
    'pose-generator-enterprise.html': '🧍',
    'chara-generator-enterprise.html': '👥',
    'gallery.html': '🖼️',
    'profile-enterprise.html': '👤',
    'settings-enterprise.html': '⚙️'
  };
  const pageEmoji = pageMap[currentFile] || '📄';
  if (!isHiddenPageUrl(currentFile)) {
    addToHistory(currentFile, pageName, pageEmoji);
  }
});
