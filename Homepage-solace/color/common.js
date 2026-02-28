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

// ========== テーマ管理 ==========

function applyTheme() {
  const saved = localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.className = saved;
  updateThemeButton();
  return saved;
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const next = isDark ? "light" : "dark";
  document.documentElement.className = next;
  localStorage.setItem("theme", next);
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
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  
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
  
  localStorage.setItem('favorites', JSON.stringify(favorites));
  showToast(`❤️ ${itemName} をお気に入りに追加しました`, 2000, 'success');
  return true;
}

function removeFavorite(itemId) {
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  const filtered = favorites.filter(fav => fav.id !== itemId);
  localStorage.setItem('favorites', JSON.stringify(filtered));
}

function isFavorite(itemId) {
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  return favorites.some(fav => fav.id === itemId);
}

function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites')) || [];
}

function toggleFavoriteButton(button, itemId, itemName, itemEmoji = '⭐') {
  const isFav = isFavorite(itemId);
  
  if (isFav) {
    removeFavorite(itemId);
    button.textContent = '☆';
    button.style.color = 'inherit';
    button.title = 'お気に入りに追加';
  } else {
    addToFavorites(itemId, itemName, itemEmoji);
    button.textContent = '★';
    button.style.color = '#ffc107';
    button.title = 'お気に入りから削除';
  }
}

// ========== 履歴機能 ==========

function addToHistory(pageUrl, pageName, pageEmoji = '📄') {
  const history = JSON.parse(localStorage.getItem('visitHistory')) || [];
  
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
  localStorage.setItem('visitHistory', JSON.stringify(limited));
}

function getHistory() {
  return JSON.parse(localStorage.getItem('visitHistory')) || [];
}

function clearHistory() {
  if (confirm('訪問履歴をすべて削除しますか？')) {
    localStorage.removeItem('visitHistory');
    buildHistoryNav(window.location.pathname.split('/').pop());
    showToast('🗑️ 履歴を削除しました', 2000, 'info');
  }
}

function buildHistoryNav(currentPage) {
  const historyNav = document.getElementById('historyNav');
  if (!historyNav) return;
  
  const history = getHistory();
  
  if (history.length === 0) {
    historyNav.style.display = 'none';
    return;
  }
  
  historyNav.style.display = 'block';
  historyNav.innerHTML = `
    <div style="margin-bottom: 24px; padding: 16px; background: rgba(102, 126, 234, 0.08); border: 1px solid rgba(102, 126, 234, 0.15); border-radius: 12px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 18px;">📜</span>
        <span style="font-weight: 600;">最近訪問したページ</span>
        <button onclick="clearHistory()" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem; border: none; background: rgba(102, 126, 234, 0.15); border-radius: 6px; cursor: pointer; color: inherit; font-weight: 600;">履歴をクリア</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
        ${history.slice(0, 6).map((item, idx) => `
          <a href="${sanitizeURL(item.url)}" style="padding: 10px 12px; background: rgba(255, 255, 255, 0.8); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 8px; text-decoration: none; color: inherit; text-align: center; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 500;"
             onmouseover="this.style.background='rgba(102, 126, 234, 0.1)'; this.style.transform='translateY(-2px)';"
             onmouseout="this.style.background='rgba(255, 255, 255, 0.8)'; this.style.transform='translateY(0)';">
            <span style="font-size: 20px;">${sanitizeHTML(item.emoji)}</span>
            <span>${sanitizeHTML(item.name)}</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

// ========== ナビゲーション ==========

function buildNav(activePage = "") {
  const nav = document.getElementById("mainNav");
  if (!nav) {
    console.error("mainNav element not found!");
    return;
  }

  const links = [
    { href: "index-enterprise.html", icon: "🏠", label: "ホーム", key: "index" },
    { href: "emoji-generator-enterprise.html", icon: "😊", label: "絵文字", key: "emoji" },
    { href: "pose-generator-enterprise.html", icon: "🧍", label: "ポーズ", key: "pose" },
    { href: "chara-generator-enterprise.html", icon: "👥", label: "キャラ", key: "chara" },
    { href: "random-color.html", icon: "🌈", label: "カラー", key: "random" },
    { href: "gallery.html", icon: "🎨", label: "ギャラリー", key: "gallery" },
    { href: "profile-enterprise.html", icon: "👤", label: "プロフ", key: "profile" },
    { href: "settings-enterprise.html", icon: "⚙️", label: "設定", key: "settings" }
  ];

  nav.innerHTML = `
    <button class="nav-toggle" id="navToggle" aria-label="メニューを開く">
      <span class="nav-toggle-icon">≡</span>
    </button>
    <div class="nav-menu" id="navMenu">
      <div class="nav-menu-header">
        <h3>ナビゲーション</h3>
        <button class="nav-close" onclick="closeMenu()" aria-label="メニューを閉じる">✕</button>
      </div>
      <div class="nav-links">
        ${links.map(l => {
          const isActive = l.key === activePage;
          return `
            <a href="${l.href}" class="nav-link${isActive ? ' active' : ''}" title="${l.label}">
              <span class="nav-icon">${l.icon}</span>
              <span class="nav-text">${l.label}</span>
              ${isActive ? '<span class="nav-indicator"></span>' : ''}
            </a>
          `;
        }).join('')}
      </div>
      <div class="nav-footer">
        <button class="nav-theme-toggle" onclick="toggleTheme()" title="テーマ切り替え" aria-label="テーマを切り替え">
          <span class="nav-icon">🌙</span>
        </button>
      </div>
    </div>
  `;

  // イベントリスナー
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  
  if (toggle) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("active");
    });
  }

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
      --brand-primary: #667eea;
      --brand-primary-dark: #764ba2;
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
      --shadow-lg: 0 10px 15px rgba(102, 126, 234, 0.15);
      --shadow-xl: 0 20px 25px rgba(102, 126, 234, 0.2);
      --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    html.dark {
      --text-primary: #f3f4f6;
      --text-secondary: #d1d5db;
      --bg-light: #0f172a;
      --bg-card: rgba(15, 15, 25, 0.95);
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      cursor: pointer;
      font-size: 24px;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
      transition: var(--transition);
      font-weight: 700;
    }

    .nav-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4);
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
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
      padding: 16px 0;
      overflow-y: auto;
    }

    .nav-link {
      display: flex !important;
      align-items: center !important;
      gap: 12px;
      padding: 14px 20px;
      color: var(--text-primary);
      text-decoration: none;
      font-weight: 500;
      transition: var(--transition);
      border-left: 3px solid transparent;
      position: relative;
    }

    .nav-link:hover {
      background: rgba(102, 126, 234, 0.08);
      color: #667eea;
    }

    .nav-link.active {
      background: rgba(102, 126, 234, 0.12);
      border-left-color: #667eea;
      color: #667eea;
      font-weight: 600;
    }

    .nav-icon {
      font-size: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-text {
      font-size: 14px;
      flex: 1;
    }

    .nav-indicator {
      position: absolute;
      right: 0;
      width: 3px;
      height: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 2px;
    }

    .nav-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border-light);
      display: flex;
      gap: 10px;
      flex-shrink: 0;
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

    .nav-theme-toggle:hover {
      background: rgba(102, 126, 234, 0.1);
      border-color: #667eea;
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
        padding: 12px 16px;
        gap: 10px;
      }

      .nav-text {
        font-size: 13px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// ========== ユーティリティ ==========

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn("ローカルストレージへの保存に失敗しました:", e);
    return false;
  }
}

function loadData(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
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

// ========== 初期化 ==========

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  injectCommonStyles();
  
  // 現在のページを履歴に追加
  const pageName = document.title.split(' - ')[0] || 'ページ';
  const pageEmoji = '📄';
  addToHistory(window.location.pathname.split('/').pop() || 'index.html', pageName, pageEmoji);
});
