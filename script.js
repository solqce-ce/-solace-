// ===== ハンバーガーメニュー ===== 
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

const inferFunnelStage = (eventName, payload = {}) => {
    const linkTarget = String(payload.link_target || '').toLowerCase();
    const label = String(payload.event_label || '').toLowerCase();

    if (eventName === 'form_start') {
        return 'consideration';
    }

    if (eventName === 'form_submit' || eventName === 'form_submission' || eventName === 'form_complete') {
        return 'conversion';
    }

    if (eventName.startsWith('tools_')) {
        if (eventName.includes('save') || eventName.includes('import') || eventName.includes('edit_submit')) {
            return 'conversion';
        }
        return 'consideration';
    }

    if (eventName === 'ui_click') {
        if (
            linkTarget.includes('request') ||
            linkTarget.includes('#contact') ||
            linkTarget.includes('#target-selection') ||
            label.includes('依頼') ||
            label.includes('お問い合わせ')
        ) {
            return 'conversion';
        }

        if (
            linkTarget.includes('portfolio') ||
            linkTarget.includes('pricing') ||
            linkTarget.includes('tools') ||
            label.includes('作品') ||
            label.includes('料金') ||
            label.includes('ツール')
        ) {
            return 'consideration';
        }
    }

    return 'awareness';
};

const emitFunnelEvent = (eventName, payload = {}) => {
    const funnelPayload = {
        funnel_stage: inferFunnelStage(eventName, payload),
        funnel_action: eventName,
        funnel_label: String(payload.event_label || ''),
        page_path: payload.page_path || window.location.pathname
    };

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'funnel_event', funnelPayload);
    }

    if (!Array.isArray(window.__solaceAnalyticsLog)) {
        window.__solaceAnalyticsLog = [];
    }

    window.__solaceAnalyticsLog.push({
        eventName: 'funnel_event',
        payload: funnelPayload,
        timestamp: Date.now()
    });
};

const sendAnalyticsEvent = (eventName, payload = {}) => {
    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
    }

    if (!Array.isArray(window.__solaceAnalyticsLog)) {
        window.__solaceAnalyticsLog = [];
    }

    window.__solaceAnalyticsLog.push({
        eventName,
        payload,
        timestamp: Date.now()
    });

    emitFunnelEvent(eventName, payload);
};

const resolvePrimaryCtaHref = () => {
    const isTopPage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html');
    return isTopPage ? '#target-selection' : 'index.html#target-selection';
};

const ensureConsistentNavCta = () => {
    document.querySelectorAll('.navbar').forEach((navbar) => {
        if (navbar.querySelector('.nav-cta')) {
            return;
        }

        const ctaWrap = document.createElement('div');
        ctaWrap.className = 'nav-cta';

        const ctaLink = document.createElement('a');
        ctaLink.href = resolvePrimaryCtaHref();
        ctaLink.className = 'btn btn-nav-contact';
        ctaLink.textContent = '依頼する';
        ctaLink.setAttribute('data-track', 'nav_primary_cta');

        ctaWrap.appendChild(ctaLink);
        navbar.appendChild(ctaWrap);
    });
};

const setupGlobalAnalyticsTracking = () => {
    const startedForms = new WeakSet();
    const formStartTimeMap = new WeakMap();

    const getFormLabel = (form) => {
        return form.id || form.getAttribute('name') || form.getAttribute('action') || 'unknown_form';
    };

    const trackFormStart = (form, triggerType) => {
        if (startedForms.has(form)) {
            return;
        }

        startedForms.add(form);
        formStartTimeMap.set(form, Date.now());
        sendAnalyticsEvent('form_start', {
            event_category: 'engagement',
            event_label: getFormLabel(form),
            trigger_type: triggerType,
            page_path: window.location.pathname
        });
    };

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const clickable = target.closest('a, button, input[type="submit"]');
        if (!(clickable instanceof Element)) {
            return;
        }

        const explicitLabel = clickable.getAttribute('data-track') || '';
        const isTrackedElement =
            Boolean(explicitLabel) ||
            clickable.matches('.btn, .quick-access-item, .nav-link, .btn-nav-contact, .action-btn, .tools-filter-btn');

        if (!isTrackedElement) {
            return;
        }

        const textLabel = (clickable.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
        const label = explicitLabel || textLabel || clickable.getAttribute('aria-label') || 'unknown_click';
        const href = clickable instanceof HTMLAnchorElement ? (clickable.getAttribute('href') || '') : '';

        sendAnalyticsEvent('ui_click', {
            event_category: 'engagement',
            event_label: label,
            link_target: href,
            page_path: window.location.pathname
        });
    });

    document.addEventListener('submit', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLFormElement)) {
            return;
        }

        const formLabel = getFormLabel(target);
        const startedAt = formStartTimeMap.get(target);
        const elapsedSeconds = typeof startedAt === 'number'
            ? Math.max(0, Math.round((Date.now() - startedAt) / 1000))
            : null;

        sendAnalyticsEvent('form_submit', {
            event_category: 'engagement',
            event_label: formLabel,
            form_elapsed_seconds: elapsedSeconds,
            page_path: window.location.pathname
        });

        if (typeof elapsedSeconds === 'number') {
            sendAnalyticsEvent('form_complete', {
                event_category: 'engagement',
                event_label: formLabel,
                form_elapsed_seconds: elapsedSeconds,
                page_path: window.location.pathname
            });
        }
    }, true);

    document.addEventListener('focusin', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const form = target.closest('form');
        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        trackFormStart(form, 'focusin');
    });

    document.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const form = target.closest('form');
        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        trackFormStart(form, 'input');
    });
};

document.addEventListener('DOMContentLoaded', () => {
    ensureConsistentNavCta();
    setupGlobalAnalyticsTracking();
    syncMobileMenuA11yState();
});

const syncMobileMenuA11yState = () => {
    if (!hamburger || !navMenu) {
        return;
    }

    const expanded = navMenu.classList.contains('active');
    hamburger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
};

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
        syncMobileMenuA11yState();
    });
}

// ナビゲーションリンクをクリックしたときメニューを閉じる
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (!hamburger || !navMenu) {
            return;
        }

        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        syncMobileMenuA11yState();
    });
});

// 画面外をクリックしたときメニューを閉じる
document.addEventListener('click', (e) => {
    if (!hamburger || !navMenu) {
        return;
    }

    if (!e.target.closest('.navbar') && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        syncMobileMenuA11yState();
    }
});

document.addEventListener('keydown', (event) => {
    if (!hamburger || !navMenu) {
        return;
    }

    if (event.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        syncMobileMenuA11yState();
        hamburger.focus();
    }
});

// ===== ポートフォリオフィルター =====
const filterButtons = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // アクティブボタンの更新
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // フィルタリング
        const filterValue = button.getAttribute('data-filter');
        portfolioItems.forEach(item => {
            if (filterValue === 'all' || item.getAttribute('data-filter') === filterValue) {
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.opacity = '1';
                }, 10);
            } else {
                item.style.opacity = '0';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
    });
});

// ===== お問い合わせフォーム送信 =====
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // フォームデータを取得
        const formData = new FormData(contactForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            company: formData.get('company') || '記載なし',
            type: formData.get('type'),
            message: formData.get('message'),
            deadline: formData.get('deadline') || '未定',
            reference: formData.get('reference') || 'なし'
        };

        // FormspreeのフォームID（設定済み）
        const FORMSPREE_ID = 'mojnrdnd';

        try {
            const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // 送信成功 - フォーム位置に成功メッセージを表示
                document.getElementById('formSuccess').style.display = 'block';
                contactForm.style.display = 'none';
                
                // スクロールしない（上に戻らない）
                
                // Google Analytics イベント送信
                sendAnalyticsEvent('form_submission', {
                    event_category: 'engagement',
                    event_label: 'contact_form',
                    form_type: formData.get('type'),
                    page_path: window.location.pathname
                });
            } else {
                alert('❌ 送信に失敗しました。もう一度お試しください。');
            }
        } catch (error) {
            console.error('Form error:', error);
            alert('⚠️ 送信中にエラーが発生しました。\n\nお手数ですが、SNS DMまたはメールでお問い合わせください。');
        }
    });
}

// ===== スクロールアニメーション =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// アニメーション対象要素の初期化
document.querySelectorAll('.service-card, .stat-card, .skill-item, .portfolio-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ===== スムーズスクロール（古いブラウザ対応） =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// ===== ナビゲーションのアクティブ状態更新 =====
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').slice(1) === current) {
            item.classList.add('active');
        }
    });
});

// ===== ページ読み込み時のアニメーション =====
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// ===== Preload スプリッシュ =====
document.addEventListener('DOMContentLoaded', () => {
    // スムーズに表示
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// ===== 共通: 外部リンクは新しいタブで開く =====
document.addEventListener('DOMContentLoaded', () => {
    const anchors = document.querySelectorAll('a[href]');

    anchors.forEach((anchor) => {
        if (!(anchor instanceof HTMLAnchorElement)) {
            return;
        }

        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        let nextUrl;
        try {
            nextUrl = new URL(anchor.href, window.location.href);
        } catch (error) {
            return;
        }

        const isExternal = nextUrl.origin !== window.location.origin;
        if (!isExternal || anchor.hasAttribute('download')) {
            return;
        }

        if ((anchor.getAttribute('target') || '').toLowerCase() === '_self') {
            return;
        }

        if (!anchor.target) {
            anchor.target = '_blank';
        }

        const relValues = new Set((anchor.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
        relValues.add('noopener');
        relValues.add('noreferrer');
        anchor.setAttribute('rel', Array.from(relValues).join(' '));
    });
});

// ===== モーダルなど今後の拡張機能用 =====
// ポートフォリオ項目をクリックで大きく表示する機能など
document.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('click', function() {
        const img = this.querySelector('img');
        // 将来的にはライトボックス機能を追加
        console.log('Clicked on portfolio item:', img.alt);
    });
});

// ===== フォームバリデーション =====
function validateFormData(data) {
    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        alert('❌ 有効なメールアドレスを入力してください');
        return false;
    }
    
    // 必須フィールドチェック
    if (!data.message || data.message.trim().length < 10) {
        alert('❌ 詳細は10文字以上で入力してください');
        return false;
    }
    
    return true;
}
function showFormLoading(formId) {
    const submitBtn = document.querySelector(`#${formId} [type="submit"]`);
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中...';
        submitBtn.style.opacity = '0.6';
    }
}

function hideFormLoading(formId) {
    const submitBtn = document.querySelector(`#${formId} [type="submit"]`);
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '送信する';
        submitBtn.style.opacity = '1';
    }
}

// ===== ツールページ: 保存・検索・比較・エクスポート =====
document.addEventListener('DOMContentLoaded', () => {
    // ツールガイドの折りたたみ機能
    const guideToggle = document.getElementById('guideToggle');
    const guideSteps = document.getElementById('guideSteps');
    
    if (guideToggle && guideSteps) {
        guideToggle.addEventListener('click', () => {
            const isOpen = guideSteps.style.display !== 'none';
            guideSteps.style.display = isOpen ? 'none' : 'block';
            guideToggle.classList.toggle('active');
        });
    }

    const resultForm = document.getElementById('resultForm');
    const resultsList = document.getElementById('resultsList');
    const favoritesList = document.getElementById('favoritesList');
    const compareGrid = document.getElementById('compareGrid');
    const clearCompareBtn = document.getElementById('clearCompare');
    const resultSortSelect = document.getElementById('resultSort');
    const exportBackupButton = document.getElementById('exportBackup');
    const importBackupButton = document.getElementById('importBackupButton');
    const importBackupFileInput = document.getElementById('importBackupFile');
    const importModeSelect = document.getElementById('importMode');
    const resetToolStateButton = document.getElementById('resetToolState');
    const editResultModal = document.getElementById('editResultModal');
    const editResultForm = document.getElementById('editResultForm');
    const closeEditModalButton = document.getElementById('closeEditModal');
    const cancelEditModalButton = document.getElementById('cancelEditModal');
    const editResultIdInput = document.getElementById('editResultId');
    const editResultTitleInput = document.getElementById('editResultTitleInput');
    const editResultCategoryInput = document.getElementById('editResultCategory');
    const editBeforeImageInput = document.getElementById('editBeforeImage');
    const editAfterImageInput = document.getElementById('editAfterImage');
    const editShareTextInput = document.getElementById('editShareText');
    const toolSearch = document.getElementById('toolSearch');
    const filterButtons = document.querySelectorAll('.tools-filter-btn');
    const toolCards = document.querySelectorAll('[data-tool-card]');
    const toolsEmptyState = document.getElementById('toolsEmptyState');

    if (!resultForm || !resultsList || !favoritesList || !compareGrid) {
        return;
    }

    const STORAGE_KEY = 'solaceToolsResults';
    const COMPARE_KEY = 'solaceToolsCompare';
    const SORT_MODE_KEY = 'solaceToolsSortMode';
    const TOOL_FILTER_KEY = 'solaceToolsFilter';
    const TOOL_SEARCH_KEY = 'solaceToolsSearch';
    const BACKUP_VERSION = 1;
    let activeFilter = 'all';
    let sortMode = 'newest';
    let editInitialState = null;
    let suppressBeforeUnloadOnce = false;

    const escapeHtml = (value) => {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const loadResults = () => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to parse tools results:', error);
            return [];
        }
    };

    const saveResults = (results) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    };

    const loadCompareIds = () => {
        const raw = localStorage.getItem(COMPARE_KEY);
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.slice(0, 2) : [];
        } catch (error) {
            console.error('Failed to parse compare list:', error);
            return [];
        }
    };

    const saveCompareIds = (ids) => {
        localStorage.setItem(COMPARE_KEY, JSON.stringify(ids.slice(0, 2)));
    };

    const loadSortMode = () => {
        const stored = localStorage.getItem(SORT_MODE_KEY);
        return stored === 'favorite' ? 'favorite' : 'newest';
    };

    const saveSortMode = (mode) => {
        localStorage.setItem(SORT_MODE_KEY, mode === 'favorite' ? 'favorite' : 'newest');
    };

    const loadToolFilter = () => {
        const stored = localStorage.getItem(TOOL_FILTER_KEY);
        if (stored === 'color' || stored === 'main' || stored === 'all') {
            return stored;
        }
        return 'all';
    };

    const saveToolFilter = (filterValue) => {
        const normalized = filterValue === 'color' || filterValue === 'main' ? filterValue : 'all';
        localStorage.setItem(TOOL_FILTER_KEY, normalized);
    };

    const loadToolSearch = () => {
        return localStorage.getItem(TOOL_SEARCH_KEY) || '';
    };

    const saveToolSearch = (keyword) => {
        localStorage.setItem(TOOL_SEARCH_KEY, keyword);
    };

    const openEditModal = (result) => {
        if (!editResultModal || !editResultForm) {
            return;
        }

        editResultIdInput.value = result.id;
        editResultTitleInput.value = result.title || '';
        editResultCategoryInput.value = result.category === 'main' ? 'main' : 'color';
        editBeforeImageInput.value = result.beforeImage || '';
        editAfterImageInput.value = result.afterImage || '';
        editShareTextInput.value = result.shareText || '';

        editInitialState = {
            title: editResultTitleInput.value,
            category: editResultCategoryInput.value,
            beforeImage: editBeforeImageInput.value,
            afterImage: editAfterImageInput.value,
            shareText: editShareTextInput.value
        };

        editResultModal.hidden = false;
        editResultModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            editResultTitleInput.focus();
        }, 0);
    };

    const closeEditModal = () => {
        if (!editResultModal || !editResultForm) {
            return;
        }

        editResultModal.hidden = true;
        editResultModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        editResultForm.reset();
        editResultIdInput.value = '';
        editInitialState = null;
    };

    const hasEditChanges = () => {
        if (!editResultModal || editResultModal.hidden || !editInitialState) {
            return false;
        }

        return (
            editResultTitleInput.value !== editInitialState.title ||
            editResultCategoryInput.value !== editInitialState.category ||
            editBeforeImageInput.value !== editInitialState.beforeImage ||
            editAfterImageInput.value !== editInitialState.afterImage ||
            editShareTextInput.value !== editInitialState.shareText
        );
    };

    const requestCloseEditModal = () => {
        if (!hasEditChanges()) {
            closeEditModal();
            return;
        }

        const shouldDiscard = window.confirm('未保存の変更があります。破棄して閉じますか？');
        if (shouldDiscard) {
            closeEditModal();
        }
    };

    const getSortedResults = (results) => {
        if (sortMode === 'favorite') {
            return [...results].sort((a, b) => {
                const favoriteGap = Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite));
                if (favoriteGap !== 0) {
                    return favoriteGap;
                }
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
        }

        return [...results].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    };

    const createResultCard = (result, { compact = false } = {}) => {
        const card = document.createElement('article');
        card.className = `saved-card${compact ? ' compact' : ''}`;

        const beforeImage = result.beforeImage
            ? `<img src="${escapeHtml(result.beforeImage)}" alt="${escapeHtml(result.title)} Before">`
            : '<div class="image-placeholder-sm">Beforeなし</div>';
        const afterImage = result.afterImage
            ? `<img src="${escapeHtml(result.afterImage)}" alt="${escapeHtml(result.title)} After">`
            : '<div class="image-placeholder-sm">Afterなし</div>';

        card.innerHTML = `
            <div class="saved-card-header">
                <h6>${escapeHtml(result.title)}</h6>
                <span class="saved-category">${result.category === 'color' ? 'カラー系' : 'メイン導線'}</span>
            </div>
            <div class="saved-images">
                <div class="saved-image-box">${beforeImage}</div>
                <div class="saved-image-box">${afterImage}</div>
            </div>
            <p class="saved-text">${escapeHtml(result.shareText)}</p>
            <div class="saved-actions">
                <button type="button" class="btn btn-secondary action-btn" data-action="edit" data-id="${result.id}">編集</button>
                <button type="button" class="btn btn-secondary action-btn" data-action="favorite" data-id="${result.id}">${result.isFavorite ? '★ お気に入り中' : '☆ お気に入り'}</button>
                <button type="button" class="btn btn-secondary action-btn" data-action="compare" data-id="${result.id}">比較に追加</button>
                <button type="button" class="btn btn-secondary action-btn" data-action="export" data-id="${result.id}">画像保存</button>
                <button type="button" class="btn btn-secondary action-btn" data-action="copy" data-id="${result.id}">テキストコピー</button>
                <button type="button" class="btn btn-secondary action-btn" data-action="delete" data-id="${result.id}">削除</button>
            </div>
        `;

        return card;
    };

    const renderCompare = () => {
        const results = loadResults();
        const compareIds = loadCompareIds();
        const compareTargets = compareIds
            .map((id) => results.find((item) => item.id === id))
            .filter(Boolean);

        compareGrid.innerHTML = '';

        if (compareTargets.length === 0) {
            compareGrid.innerHTML = '<p class="saved-empty">比較対象がありません。カードの「比較に追加」を押してください。</p>';
            return;
        }

        compareTargets.forEach((result) => {
            const card = document.createElement('article');
            card.className = 'compare-card';
            card.innerHTML = `
                <h6>${escapeHtml(result.title)}</h6>
                <div class="saved-images">
                    <div class="saved-image-box">
                        ${result.beforeImage ? `<img src="${escapeHtml(result.beforeImage)}" alt="${escapeHtml(result.title)} Before">` : '<div class="image-placeholder-sm">Beforeなし</div>'}
                    </div>
                    <div class="saved-image-box">
                        ${result.afterImage ? `<img src="${escapeHtml(result.afterImage)}" alt="${escapeHtml(result.title)} After">` : '<div class="image-placeholder-sm">Afterなし</div>'}
                    </div>
                </div>
                <p class="saved-text">${escapeHtml(result.shareText)}</p>
            `;
            compareGrid.appendChild(card);
        });
    };

    const renderResults = () => {
        const allResults = loadResults();
        const results = getSortedResults(allResults);
        const favorites = [...allResults]
            .filter((item) => item.isFavorite)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        resultsList.innerHTML = '';
        favoritesList.innerHTML = '';

        if (results.length === 0) {
            resultsList.innerHTML = '<p class="saved-empty">まだ保存された結果がありません。</p>';
        } else {
            results.forEach((result) => {
                resultsList.appendChild(createResultCard(result));
            });
        }

        if (favorites.length === 0) {
            favoritesList.innerHTML = '<p class="saved-empty">お気に入りはまだありません。</p>';
        } else {
            favorites.forEach((result) => {
                favoritesList.appendChild(createResultCard(result, { compact: true }));
            });
        }

        renderCompare();
    };

    const filterTools = () => {
        const keyword = (toolSearch?.value || '').trim().toLowerCase();
        let visibleCount = 0;

        toolCards.forEach((card) => {
            const category = card.dataset.category || '';
            const title = card.querySelector('h4')?.textContent.toLowerCase() || '';
            const description = card.querySelector('p')?.textContent.toLowerCase() || '';
            const keywords = (card.dataset.keywords || '').toLowerCase();
            const categoryMatch = activeFilter === 'all' || category === activeFilter;
            const keywordMatch = !keyword || title.includes(keyword) || description.includes(keyword) || keywords.includes(keyword);
            const isVisible = categoryMatch && keywordMatch;
            card.style.display = isVisible ? 'block' : 'none';
            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (toolsEmptyState) {
            toolsEmptyState.hidden = visibleCount > 0;
        }
    };

    const downloadImage = async (url, filename) => {
        if (!url) {
            alert('保存できる画像URLがありません。');
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch image');
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = objectUrl;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error('Image export failed:', error);
            window.open(url, '_blank', 'noopener');
        }
    };

    const backupResults = () => {
        const payload = {
            version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            results: loadResults(),
            compareIds: loadCompareIds()
        };

        sendAnalyticsEvent('tools_backup_export', {
            event_category: 'tools',
            result_count: payload.results.length,
            page_path: window.location.pathname
        });

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const objectUrl = URL.createObjectURL(blob);
        const dateLabel = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `solace-tools-backup-${dateLabel}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
    };

    const normalizeImportedResults = (items) => {
        if (!Array.isArray(items)) {
            return [];
        }

        return items
            .map((item) => ({
                id: typeof item?.id === 'string' && item.id ? item.id : crypto.randomUUID(),
                title: typeof item?.title === 'string' ? item.title.trim() : '',
                category: item?.category === 'main' ? 'main' : 'color',
                beforeImage: typeof item?.beforeImage === 'string' ? item.beforeImage.trim() : '',
                afterImage: typeof item?.afterImage === 'string' ? item.afterImage.trim() : '',
                shareText: typeof item?.shareText === 'string' ? item.shareText.trim() : '',
                isFavorite: Boolean(item?.isFavorite),
                createdAt: Number.isFinite(Number(item?.createdAt)) ? Number(item.createdAt) : Date.now()
            }))
            .filter((item) => item.title && item.shareText);
    };

    const makeUniqueId = (baseId, existingIdSet) => {
        if (baseId && !existingIdSet.has(baseId)) {
            return baseId;
        }

        let nextId = crypto.randomUUID();
        while (existingIdSet.has(nextId)) {
            nextId = crypto.randomUUID();
        }
        return nextId;
    };

    const restoreResultsFromFile = async (file, mode = 'append') => {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const normalizedResults = normalizeImportedResults(parsed?.results);

        if (normalizedResults.length === 0 && Array.isArray(parsed?.results) && parsed.results.length > 0) {
            throw new Error('有効な結果データがありません。');
        }

        const importedCompare = Array.isArray(parsed?.compareIds) ? parsed.compareIds : [];
        const isReplace = mode === 'replace';

        if (isReplace) {
            saveResults(normalizedResults);

            const validIds = new Set(normalizedResults.map((item) => item.id));
            const sanitizedCompare = importedCompare
                .filter((id) => typeof id === 'string' && validIds.has(id))
                .slice(0, 2);
            saveCompareIds(sanitizedCompare);
        } else {
            const existingResults = loadResults();
            const idSet = new Set(existingResults.map((item) => item.id));
            const idMap = new Map();
            const adjustedImportedResults = normalizedResults.map((item) => {
                const nextId = makeUniqueId(item.id, idSet);
                idSet.add(nextId);
                idMap.set(item.id, nextId);
                return {
                    ...item,
                    id: nextId
                };
            });

            const mergedResults = [...existingResults, ...adjustedImportedResults];
            saveResults(mergedResults);

            const mergedCompareIds = [...loadCompareIds()];
            const importedMappedCompareIds = importedCompare
                .filter((id) => typeof id === 'string')
                .map((id) => idMap.get(id) || null)
                .filter(Boolean);

            importedMappedCompareIds.forEach((id) => {
                if (!mergedCompareIds.includes(id)) {
                    mergedCompareIds.push(id);
                }
            });

            saveCompareIds(mergedCompareIds.slice(-2));
        }

        renderResults();
        sendAnalyticsEvent('tools_backup_import', {
            event_category: 'tools',
            event_label: isReplace ? 'replace' : 'append',
            imported_count: normalizedResults.length,
            page_path: window.location.pathname
        });
        alert(`JSON復元が完了しました（${normalizedResults.length}件 / ${isReplace ? '上書き' : '追記'}）。`);
    };

    resultForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(resultForm);
        const title = String(formData.get('title') || '').trim();
        const category = String(formData.get('category') || 'color');
        const beforeImage = String(formData.get('beforeImage') || '').trim();
        const afterImage = String(formData.get('afterImage') || '').trim();
        const shareText = String(formData.get('shareText') || '').trim();

        if (!title || !shareText) {
            alert('タイトルとコピー用テキストは必須です。');
            return;
        }

        const results = loadResults();
        results.push({
            id: crypto.randomUUID(),
            title,
            category,
            beforeImage,
            afterImage,
            shareText,
            isFavorite: false,
            createdAt: Date.now()
        });

        saveResults(results);
        resultForm.reset();
        renderResults();
        sendAnalyticsEvent('tools_result_save', {
            event_category: 'tools',
            event_label: category,
            page_path: window.location.pathname
        });
    });

    document.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const actionButton = target.closest('[data-action]');
        if (!(actionButton instanceof HTMLElement)) return;

        const action = actionButton.dataset.action;
        const resultId = actionButton.dataset.id;
        if (!action || !resultId) return;

        const results = loadResults();
        const targetResult = results.find((item) => item.id === resultId);
        if (!targetResult) return;

        if (action === 'edit') {
            openEditModal(targetResult);
            sendAnalyticsEvent('tools_result_edit_open', {
                event_category: 'tools',
                event_label: targetResult.category,
                page_path: window.location.pathname
            });
            return;
        }

        if (action === 'favorite') {
            targetResult.isFavorite = !targetResult.isFavorite;
            saveResults(results);
            renderResults();
            sendAnalyticsEvent('tools_result_favorite_toggle', {
                event_category: 'tools',
                event_label: targetResult.isFavorite ? 'on' : 'off',
                page_path: window.location.pathname
            });
            return;
        }

        if (action === 'compare') {
            const compareIds = loadCompareIds();
            if (compareIds.includes(resultId)) {
                saveCompareIds(compareIds.filter((id) => id !== resultId));
            } else {
                const next = [...compareIds, resultId];
                saveCompareIds(next.slice(-2));
            }
            renderCompare();
            sendAnalyticsEvent('tools_result_compare_toggle', {
                event_category: 'tools',
                event_label: targetResult.category,
                page_path: window.location.pathname
            });
            return;
        }

        if (action === 'export') {
            const exportUrl = targetResult.afterImage || targetResult.beforeImage;
            await downloadImage(exportUrl, `${targetResult.title.replace(/\s+/g, '-')}.png`);
            sendAnalyticsEvent('tools_result_export_image', {
                event_category: 'tools',
                event_label: targetResult.category,
                page_path: window.location.pathname
            });
            return;
        }

        if (action === 'copy') {
            try {
                await navigator.clipboard.writeText(targetResult.shareText);
                alert('コピーしました。');
            } catch (error) {
                console.error('Copy failed:', error);
                alert('コピーに失敗しました。');
            }
            sendAnalyticsEvent('tools_result_copy_text', {
                event_category: 'tools',
                event_label: targetResult.category,
                page_path: window.location.pathname
            });
            return;
        }

        if (action === 'delete') {
            const nextResults = results.filter((item) => item.id !== resultId);
            saveResults(nextResults);
            const compareIds = loadCompareIds().filter((id) => id !== resultId);
            saveCompareIds(compareIds);
            renderResults();
            sendAnalyticsEvent('tools_result_delete', {
                event_category: 'tools',
                event_label: targetResult.category,
                page_path: window.location.pathname
            });
        }
    });

    if (clearCompareBtn) {
        clearCompareBtn.addEventListener('click', () => {
            saveCompareIds([]);
            renderCompare();
        });
    }

    if (toolSearch) {
        toolSearch.value = loadToolSearch();

        toolSearch.addEventListener('input', () => {
            saveToolSearch(toolSearch.value);
            filterTools();
            sendAnalyticsEvent('tools_search_input', {
                event_category: 'tools',
                query_length: toolSearch.value.trim().length,
                page_path: window.location.pathname
            });
        });
    }

    if (resultSortSelect) {
        sortMode = loadSortMode();
        resultSortSelect.value = sortMode;

        resultSortSelect.addEventListener('change', () => {
            sortMode = resultSortSelect.value === 'favorite' ? 'favorite' : 'newest';
            saveSortMode(sortMode);
            renderResults();
            sendAnalyticsEvent('tools_sort_change', {
                event_category: 'tools',
                event_label: sortMode,
                page_path: window.location.pathname
            });
        });
    }

    if (exportBackupButton) {
        exportBackupButton.addEventListener('click', backupResults);
    }

    if (importBackupButton && importBackupFileInput) {
        importBackupButton.addEventListener('click', () => {
            importBackupFileInput.click();
        });

        importBackupFileInput.addEventListener('change', async () => {
            const [file] = importBackupFileInput.files || [];
            if (!file) return;

            const mode = importModeSelect?.value === 'replace' ? 'replace' : 'append';

            if (mode === 'replace') {
                const shouldReplace = window.confirm('上書き復元を実行します。現在の保存結果と比較状態は置き換えられます。よろしいですか？');
                if (!shouldReplace) {
                    importBackupFileInput.value = '';
                    return;
                }
            }

            try {
                await restoreResultsFromFile(file, mode);
            } catch (error) {
                console.error('Backup restore failed:', error);
                alert('JSON復元に失敗しました。形式を確認してください。');
            } finally {
                importBackupFileInput.value = '';
            }
        });
    }

    if (resetToolStateButton) {
        resetToolStateButton.addEventListener('click', () => {
            const confirmed = window.confirm('表示条件（検索・絞り込み・並び替え）と比較状態をリセットします。保存結果・お気に入りは削除されません。よろしいですか？');
            if (!confirmed) {
                return;
            }

            sortMode = 'newest';
            activeFilter = 'all';

            localStorage.removeItem(SORT_MODE_KEY);
            localStorage.removeItem(TOOL_FILTER_KEY);
            localStorage.removeItem(TOOL_SEARCH_KEY);
            localStorage.removeItem(COMPARE_KEY);

            if (resultSortSelect) {
                resultSortSelect.value = 'newest';
            }

            if (toolSearch) {
                toolSearch.value = '';
            }

            const allFilterButton = Array.from(filterButtons).find((button) => {
                return (button.dataset.filter || 'all') === 'all';
            });

            filterButtons.forEach((btn) => btn.classList.remove('active'));
            if (allFilterButton) {
                allFilterButton.classList.add('active');
            }

            renderResults();
            filterTools();
            sendAnalyticsEvent('tools_state_reset', {
                event_category: 'tools',
                event_label: 'view_and_compare',
                page_path: window.location.pathname
            });
        });
    }

    if (editResultForm) {
        editResultForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const resultId = editResultIdInput.value;
            if (!resultId) {
                closeEditModal();
                return;
            }

            const updatedTitle = editResultTitleInput.value.trim();
            const updatedCategory = editResultCategoryInput.value === 'main' ? 'main' : 'color';
            const updatedBeforeImage = editBeforeImageInput.value.trim();
            const updatedAfterImage = editAfterImageInput.value.trim();
            const updatedShareText = editShareTextInput.value.trim();

            if (!updatedTitle || !updatedShareText) {
                alert('タイトルとコピー用テキストは必須です。');
                return;
            }

            const results = loadResults();
            const targetResult = results.find((item) => item.id === resultId);
            if (!targetResult) {
                closeEditModal();
                return;
            }

            targetResult.title = updatedTitle;
            targetResult.category = updatedCategory;
            targetResult.beforeImage = updatedBeforeImage;
            targetResult.afterImage = updatedAfterImage;
            targetResult.shareText = updatedShareText;

            saveResults(results);
            closeEditModal();
            renderResults();
            sendAnalyticsEvent('tools_result_edit_submit', {
                event_category: 'tools',
                event_label: updatedCategory,
                page_path: window.location.pathname
            });
        });
    }

    if (closeEditModalButton) {
        closeEditModalButton.addEventListener('click', requestCloseEditModal);
    }

    if (cancelEditModalButton) {
        cancelEditModalButton.addEventListener('click', requestCloseEditModal);
    }

    if (editResultModal) {
        editResultModal.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            if (target.hasAttribute('data-close-edit-modal')) {
                requestCloseEditModal();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && editResultModal && !editResultModal.hidden) {
            requestCloseEditModal();
        }
    });

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        if (event instanceof MouseEvent && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
            return;
        }

        const anchor = target.closest('a[href]');
        if (!(anchor instanceof HTMLAnchorElement)) {
            return;
        }

        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        const nextUrl = new URL(anchor.href, window.location.href);
        const isSameDocument =
            nextUrl.origin === window.location.origin &&
            nextUrl.pathname === window.location.pathname &&
            nextUrl.search === window.location.search;
        const isHashNavigation = isSameDocument && nextUrl.hash;

        if (isHashNavigation) {
            suppressBeforeUnloadOnce = true;
        }
    });

    window.addEventListener('beforeunload', (event) => {
        if (suppressBeforeUnloadOnce) {
            suppressBeforeUnloadOnce = false;
            return;
        }

        if (!hasEditChanges()) {
            return;
        }

        event.preventDefault();
        event.returnValue = '';
    });

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            filterButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.dataset.filter || 'all';
            saveToolFilter(activeFilter);
            filterTools();
            sendAnalyticsEvent('tools_filter_change', {
                event_category: 'tools',
                event_label: activeFilter,
                page_path: window.location.pathname
            });
        });
    });

    activeFilter = loadToolFilter();
    const activeFilterButton = Array.from(filterButtons).find((button) => {
        return (button.dataset.filter || 'all') === activeFilter;
    });

    if (activeFilterButton) {
        filterButtons.forEach((btn) => btn.classList.remove('active'));
        activeFilterButton.classList.add('active');
    }

    renderResults();
    filterTools();
});

// ===== AIチャットボット機能 =====
class FAQChatbot {
    constructor() {
        this.faqDatabase = [
            {
                keywords: ['納期', 'いつ', 'どのくらい'],
                answer: '通常、シンプルなイラストは2～3週間、複雑なキャラクターデザインは3～4週間です。急な依頼の場合はご相談ください。追加料金で対応できる場合があります。'
            },
            {
                keywords: ['修正', 'リテイク', '何回'],
                answer: 'プランによって異なります。基本的には1～3回の修正が含まれています。大幅な変更については追加料金がかかる場合があります。'
            },
            {
                keywords: ['商用', '利用', '著作権'],
                answer: 'はい、ゲーム、本、グッズなど、幅広い商用利用に対応しています。ご用途に応じて契約内容をご相談させていただきます。'
            },
            {
                keywords: ['流れ', 'プロセス', '過程'],
                answer: '1) ご依頼内容のヒアリング、2) ラフスケッチの制作・確認、3) 線画・色塗りの進行、4) 最終調整・納品、という流れで進めます。各段階でご確認いただけます。'
            },
            {
                keywords: ['返金', 'キャンセル'],
                answer: '納品物に対する満足が得られない場合、契約内容に応じて対応いたします。詳細はご依頼時にご相談ください。'
            },
            {
                keywords: ['価格', '料金', '費用'],
                answer: '料金は作品の複雑さや納期によって異なります。キャラクターデザインは30,000円～、ゲームセットは80,000円～です。詳細なお見積もりはお問い合わせください。'
            },
            {
                keywords: ['どんな', 'できる', 'サービス'],
                answer: 'キャラクターデザイン、ゲームイラスト、SDキャラ、コンセプトアート、イラストレーション、修正・加筆に対応しています。詳しくは「サービス」ページをご覧ください。'
            },
            {
                keywords: ['企業', '法人', 'ビジネス'],
                answer: '企業向けの大規模案件にも対応しております。企業向けポートフォリオページをご覧いただくか、お気軽にお問い合わせください。'
            },
            {
                keywords: ['個人', '小規模', '同人'],
                answer: '個人ゲーム開発や同人活動もお気軽にご相談ください。固定料金プランで気軽にご依頼いただけます。個人向けポートフォリオページもご参考ください。'
            },
            {
                keywords: ['相談方法', '連絡方法', '問い合わせ方法', 'どう連絡'],
                answer: 'SNS DMやメール、お問い合わせフォームからご相談いただけます。個別相談は <a href="mailto:solqc_e@outlook.com">solqc_e@outlook.com</a> でも受け付けています。'
            },
            {
                keywords: ['メール', 'mail', '連絡先', '問い合わせ先'],
                answer: 'メールでのご相談は、<a href="mailto:solqc_e@outlook.com">solqc_e@outlook.com</a> までご連絡ください。用途・希望納期・ご予算の目安があるとご案内がスムーズです。'
            },
            {
                keywords: ['見積もりって何', '見積って何', '見積もりとは'],
                answer: '見積もりは、ご依頼内容に対して「制作範囲・納期・費用・条件」を事前に明確化するための案内です。内容確定前でも、概算見積もりからご案内できます。'
            },
            {
                keywords: ['見積もりに必要なもの', '見積もりに必要', '見積に必要なもの', '見積に必要'],
                answer: '見積もりには「用途・希望サイズ・点数・希望納期・ご予算目安」があるとスムーズです。参考資料（イメージ画像・トンマナ）もあると精度が上がります。'
            },
            {
                keywords: ['概算見積', 'ざっくり見積', 'ラフ見積'],
                answer: '要件が未確定でも概算見積もりは可能です。要件が固まり次第、正式見積もりへ更新します。'
            },
            {
                keywords: ['正式見積', '確定見積', '本見積'],
                answer: '正式見積もりは、仕様確定後に費用・納期・修正条件を明記した形でご案内します。'
            },
            {
                keywords: ['見積の有効期限', '見積有効期限', '見積期限'],
                answer: '見積もりには有効期限を設定する場合があります。期限を過ぎた場合は、スケジュールや単価を再確認のうえ更新見積をご案内します。'
            },
            {
                keywords: ['相見積もり', '他社比較', '比較検討'],
                answer: '相見積もりでの比較検討も問題ありません。判断しやすいよう、前提条件を揃えた比較をおすすめします。'
            },
            {
                keywords: ['見積後キャンセル', '見積だけでキャンセル', '見積キャンセル'],
                answer: '見積もり段階でのキャンセルは問題ありません。ご相談のみでもお気軽にご連絡ください。'
            },
            {
                keywords: ['税込', '税抜', '消費税'],
                answer: '見積金額の税込・税抜表記はご希望に合わせて提示可能です。必要な表記形式があればお知らせください。'
            },
            {
                keywords: ['追加費用', '追加料金', '追加請求'],
                answer: '仕様追加や大幅変更がある場合は、影響範囲を確認したうえで追加費用をご案内します。事前合意なしで進めることはありません。'
            },
            {
                keywords: ['再見積', '見積更新', '見積やり直し'],
                answer: '要件変更や納期変更があれば再見積もり可能です。最新版の条件で更新してご案内します。'
            },
            {
                keywords: ['見積内訳', '内訳', '見積の中身'],
                answer: '見積内訳は、作業範囲・点数・難易度・修正回数・納期条件などを基準に構成します。必要に応じて説明も可能です。'
            },
            {
                keywords: ['最低料金', 'ミニマム予算', '予算下限'],
                answer: '最低料金は内容によって変動します。ご予算に合わせて仕様調整の提案も可能なので、まずは希望条件をご共有ください。'
            },
            {
                keywords: ['見積もり', '見積', '無料'],
                answer: 'はい、見積もり相談は無料です。ご予算・用途・希望納期をお知らせいただければ、内容に応じたプランと概算をご案内します。'
            },
            {
                keywords: ['支払い', '支払', '請求書', '入金'],
                answer: '個人依頼は着手前のお支払い、企業案件は契約条件に応じた分割・請求書対応が可能です。詳細はお見積もり時にご案内します。'
            },
            {
                keywords: ['納品', '形式', 'png', 'jpg', 'psd'],
                answer: '用途に合わせてPNG/JPG/PSDなどに対応します。印刷向けの解像度やサイズ指定がある場合は、事前にお知らせください。'
            },
            {
                keywords: ['実績', '公開', '非公開', 'クレジット'],
                answer: '公開可否は事前に確認し、非公開案件にも対応しています。公開タイミングの指定やクレジット表記ルールがある場合もご相談ください。'
            },
            {
                keywords: ['ai', 'AI', '学習', '機械学習'],
                answer: '納品物のAI学習用途での利用は原則お受けしていません。利用範囲については契約時に明確化しますので、事前に用途をご共有ください。'
            },
            {
                keywords: ['背景', '1枚絵', 'キービジュアル'],
                answer: 'はい、可能です。キャラクター単体だけでなく、背景込みのキービジュアルや告知用イラストにも対応しています。用途に合わせて構図からご提案します。'
            },
            {
                keywords: ['参考資料', '資料がない', 'イメージが固まらない'],
                answer: '問題ありません。方向性が固まっていない段階でも、ヒアリングを通じて要件整理から対応できます。参考画像が1～2点でも進行可能です。'
            },
            {
                keywords: ['進捗', '途中確認', '確認タイミング'],
                answer: 'はい、ラフ・線画・着彩などの節目で確認いただけます。確認タイミングは案件規模に応じて事前にすり合わせます。'
            },
            {
                keywords: ['nda', 'NDA', '秘密保持', '非公開案件'],
                answer: '企業案件を中心にNDA対応が可能です。事前に契約条件を確認し、公開範囲や実績掲載可否を含めて調整します。'
            },
            {
                keywords: ['クレジット', '表記', 'credit'],
                answer: '基本はクレジット表記をお願いしていますが、媒体や運用方針に応じて柔軟に調整可能です。記載形式は納品時にご案内します。'
            },
            {
                keywords: ['最短', '着手', 'いつから'],
                answer: 'スケジュール状況により異なりますが、最短で数日以内に着手可能な場合があります。お急ぎ案件は希望納期を添えてご相談ください。'
            },
            {
                keywords: ['特急', '急ぎ', '短納期'],
                answer: '内容と時期により対応可能です。通常より短い納期をご希望の場合は、特急料金を含めて可否をご案内します。'
            },
            {
                keywords: ['差分', '表情差分', 'ポーズ差分', '衣装差分'],
                answer: 'はい、可能です。基本イラストに加えて表情差分・ポーズ差分・衣装差分など、運用に合わせたセット提案ができます。'
            },
            {
                keywords: ['live2d', 'Live2D', 'パーツ分け', 'vtuber'],
                answer: '対応可能です。可動域や用途に合わせたパーツ分けを前提に制作します。必要な仕様（サイズ・命名ルール等）があれば共有ください。'
            },
            {
                keywords: ['印刷', 'cmyk', 'CMYK', '入稿'],
                answer: 'はい、印刷用途にも対応します。印刷所の入稿仕様がある場合は、テンプレートやプロファイル情報を事前にお知らせください。'
            },
            {
                keywords: ['二次利用', '媒体追加', 'ライセンス'],
                answer: '契約時に定めた利用範囲内でご利用いただけます。媒体追加や期間延長が必要な場合は、事前相談のうえ追加ライセンスで対応します。'
            },
            {
                keywords: ['キャンセル', '解約', '中止'],
                answer: '進行段階に応じて対応可能です。すでに着手済みの工程分については実費・工数分のご負担をお願いする場合があります。'
            },
            {
                keywords: ['継続', '定期', '月次', '長期'],
                answer: 'はい、継続案件にも対応しています。月次本数や運用体制に応じて、優先スロットや進行フローを含む形でご提案します。'
            },
            {
                keywords: ['打ち合わせ', 'mtg', 'meeting', 'オンライン'],
                answer: '可能です。テキストベースに加えて、必要に応じてオンラインミーティングで要件整理を行います。'
            },
            {
                keywords: ['sns', 'アイコン', 'ヘッダー', 'サムネ'],
                answer: 'はい、SNS用のアイコン、ヘッダー、告知画像など小規模制作にも対応しています。サイズ指定があれば合わせて制作します。'
            },
            {
                keywords: ['複数案', '案出し', 'ラフ複数'],
                answer: 'ご要望に応じて、初期ラフを複数案でご提案することが可能です。案数に応じて費用とスケジュールをお見積もりします。'
            },
            {
                keywords: ['納品後', '軽微修正', '微修正'],
                answer: '納品直後の軽微な修正は内容に応じて対応可能です。大幅な方向変更は追加対応となる場合があります。'
            },
            {
                keywords: ['著作権譲渡', '譲渡費用'],
                answer: '著作権譲渡は通常利用とは別条件でのお見積もりになります。利用範囲と期間を確認したうえでご案内します。'
            },
            {
                keywords: ['公開前', '最終チェック', '確認時間'],
                answer: '公開日から逆算して確認日を設定し、最終調整のバッファを確保した進行をご提案します。'
            },
            {
                keywords: ['モノクロ', 'グレースケール'],
                answer: 'モノクロ制作にも対応しています。印刷用途や演出意図に合わせて線画中心・グレースケール表現が可能です。'
            },
            {
                keywords: ['解像度', 'サイズ指定', 'ピクセル'],
                answer: '解像度や比率の細かな指定にも対応可能です。用途に必要な仕様をご共有いただければ、指定に合わせて制作します。'
            },
            {
                keywords: ['psd', 'レイヤー整理', 'レイヤー'],
                answer: 'PSD納品時は、編集しやすい構成を意識してパーツ別・用途別にレイヤー整理した状態で納品できます。'
            },
            {
                keywords: ['保管', '再納品', 'バックアップ'],
                answer: '納品データは一定期間保管しています。保管データがある場合は再納品にも対応可能です。'
            },
            {
                keywords: ['機密資料', '秘密資料'],
                answer: '機密情報を含む資料でも、NDAや取り扱いルールに沿って対応可能です。共有方法と閲覧範囲を事前に取り決めて進行します。'
            },
            {
                keywords: ['リデザイン', '既存キャラ'],
                answer: '既存キャラクターのリデザインにも対応しています。現在の魅力を残しつつ、用途やターゲットに合わせて最適化します。'
            },
            {
                keywords: ['年齢層', 'テイスト調整', '子ども向け'],
                answer: 'ターゲット年齢層に合わせたテイスト調整が可能です。色使いや表現を目的に合わせて設計します。'
            },
            {
                keywords: ['r15', '年齢制限', 'センシティブ'],
                answer: '媒体規約と利用方針の範囲内で対応可否を判断します。公開先のガイドラインを事前にご共有ください。'
            },
            {
                keywords: ['背景資料', '写真資料', '参考写真'],
                answer: '背景資料や写真があると方向性共有がスムーズです。なくても制作可能ですが、参考があるほど精度が上がります。'
            },
            {
                keywords: ['小物', '武器', '装備'],
                answer: '小物や武器のデザインにも対応しています。キャラクター設定に合わせてデザイン案をご提案します。'
            },
            {
                keywords: ['ロゴ', '同時依頼'],
                answer: 'ロゴ制作とイラストの同時依頼も内容に応じて対応可能です。制作範囲を分けて整合性ある進行をご提案します。'
            },
            {
                keywords: ['アニメ塗り', '厚塗り', '塗りテイスト'],
                answer: '塗りテイストの指定は可能です。参考作品や希望イメージを共有いただければ、近い方向性で仕上げます。'
            },
            {
                keywords: ['二次創作', 'fanart'],
                answer: '二次創作案件は、権利元ガイドラインと利用範囲を確認のうえ対応可否を判断します。'
            },
            {
                keywords: ['サイズ展開', 'サムネイル', '複数サイズ'],
                answer: '媒体別のサイズ展開に対応可能です。必要サイズを一覧で共有いただけるとスムーズです。'
            },
            {
                keywords: ['スタンプ', '絵文字', '何点'],
                answer: 'スタンプ制作は少数点から対応可能です。使用先仕様に合わせて点数・比率・余白を調整します。'
            },
            {
                keywords: ['色覚', 'コントラスト', '視認性'],
                answer: '色覚多様性に配慮した配色相談に対応しています。視認性を意識した設計をご提案します。'
            },
            {
                keywords: ['文字入れ', 'タイトル挿入', 'テキスト'],
                answer: '画像内の文字挿入にも対応可能です。可読性とデザインを両立した形で納品できます。'
            },
            {
                keywords: ['要件変更', '仕様変更'],
                answer: '要件変更時は、スケジュールと費用への影響を明確化したうえで進行可否をご案内します。'
            },
            {
                keywords: ['返信目安', '返信', '連絡速度'],
                answer: '通常は翌営業日以内を目安に返信しています。繁忙時は少しお時間をいただく場合があります。'
            },
            {
                keywords: ['土日', '祝日', '休日対応'],
                answer: '基本は平日対応ですが、納期条件によっては調整可能です。事前にご相談ください。'
            },
            {
                keywords: ['notion', 'backlog', '進行管理ツール'],
                answer: '進行管理ツールに合わせた運用も可能な範囲で対応します。運用ルールを共有いただけるとスムーズです。'
            },
            {
                keywords: ['領収書', '請求書', '書類発行'],
                answer: '請求書・領収書の発行に対応可能です。宛名や但し書きの指定があれば事前にお知らせください。'
            },
            {
                keywords: ['海外支払い', '決済', 'payment'],
                answer: '海外クライアント向け支払いは、決済手段や手数料条件を確認したうえで対応可否をご案内します。'
            },
            {
                keywords: ['複数担当', 'チーム進行', '窓口'],
                answer: '複数担当者のプロジェクトにも対応可能です。窓口担当者を決めると進行が安定します。'
            },
            {
                keywords: ['ガイドライン', 'ブランドガイド', 'トンマナ'],
                answer: 'デザインガイドラインに沿った制作が可能です。ブランド資料を事前共有いただければ精度が上がります。'
            },
            {
                keywords: ['ng', 'NG事項', '避けたい表現'],
                answer: 'NG事項の指定は可能です。先に共有いただくことでリテイクを抑えて進行できます。'
            },
            {
                keywords: ['不採用ラフ', 'ラフ案の扱い'],
                answer: '不採用ラフは契約条件に従って管理します。公開可否や再利用可否は事前の取り決めを優先します。'
            },
            {
                keywords: ['競合', '排他', '他社案件'],
                answer: '競合案件は契約条件を確認し、必要に応じて配慮します。排他条件がある場合は先にご相談ください。'
            },
            {
                keywords: ['命名ルール', 'ファイル名'],
                answer: '納品ファイルの命名ルール指定に対応可能です。運用しやすい形式で納品します。'
            },
            {
                keywords: ['バージョン管理', '改訂版'],
                answer: '改訂版のバージョン管理にも対応可能です。必要な管理形式があればご指定ください。'
            },
            {
                keywords: ['保守', '長期運用', '更新対応'],
                answer: '長期運用の保守対応は継続案件としてご相談可能です。更新頻度に応じたプランをご提案します。'
            },
            {
                keywords: ['リサイズ', 'トリミング', '媒体向け'],
                answer: '1つのイラストを複数媒体向けにリサイズ可能です。媒体仕様に応じて見え方を最適化します。'
            },
            {
                keywords: ['透過背景', '背景透過', 'png透過'],
                answer: '透過背景PNGでの納品に対応しています。背景あり版と透過版の同時納品も可能です。'
            },
            {
                keywords: ['塗り足し', '安全領域', '入稿データ'],
                answer: '印刷入稿向けに塗り足し・安全領域を考慮したデータ作成が可能です。'
            },
            {
                keywords: ['商標', '商標登録'],
                answer: '商標登録を想定した制作相談は可能です。法的判断が必要な部分は専門家確認を前提にご検討ください。'
            },
            {
                keywords: ['公序良俗', '禁止内容', '違法'],
                answer: '公序良俗に反する内容はお受けできない場合があります。公開先規約や社会的配慮に基づき判断します。'
            },
            {
                keywords: ['未成年', '保護者同意'],
                answer: '未成年の方は保護者同意確認が必要な場合があります。事前にご相談ください。'
            },
            {
                keywords: ['代理依頼', 'マネージャー', '代理'],
                answer: '代理でのご依頼にも対応可能です。権限のある窓口と連絡体制を確認したうえで進行します。'
            },
            {
                keywords: ['遅延', '納期遅れ'],
                answer: '遅延が見込まれる場合は、判明時点で状況と代替スケジュールを共有し調整します。'
            },
            {
                keywords: ['連絡がない', '途絶', '返信なし'],
                answer: '一定期間ご返信がない場合は、契約条件に基づいて進行停止またはクローズ判断となる場合があります。'
            },
            {
                keywords: ['検収', '受け入れ期間'],
                answer: '検収期間は案件ごとに取り決めます。公開日がある場合は逆算して確保する運用を推奨します。'
            },
            {
                keywords: ['再委託', '外部クリエイター'],
                answer: '必要時は事前共有のうえ進行し、秘密保持と品質管理の条件を満たす体制で対応します。'
            },
            {
                keywords: ['初回割引', '特典'],
                answer: '初回依頼向けの割引や特典は時期や案件内容に応じてご案内できる場合があります。'
            },
            {
                keywords: ['ボリュームディスカウント', '長期契約割引'],
                answer: '長期契約のディスカウントは継続本数や運用条件に応じてご相談可能です。'
            },
            {
                keywords: ['契約書', '発注書'],
                answer: '契約書の締結は可能です。企業案件では契約書・発注書・NDAなど必要書類に対応できます。'
            },
            {
                keywords: ['要件整理', '相談したい', 'FAQ外'],
                answer: 'FAQ外の個別要件もヒアリング段階で整理可能です。曖昧な状態でもお気軽にご相談ください。'
            },
            {
                keywords: ['こんにちは', 'はじめまして', 'こんばんは'],
                answer: 'こんにちは！ご相談ありがとうございます。気になることをそのまま入力してください。必要に応じてメール相談（solqc_e@outlook.com）にもご案内できます。'
            },
            {
                keywords: ['ありがとう', '助かった', '助かりました'],
                answer: 'ありがとうございます！ほかにも気になる点があれば続けてご質問ください。個別相談は solqc_e@outlook.com でも対応しています。'
            },
            {
                keywords: ['見積に必要', '何を送れば', '見積情報'],
                answer: '見積もり時は「用途・希望サイズ・点数・希望納期・ご予算目安」があるとスムーズです。参考資料があればあわせてご共有ください。'
            },
            {
                keywords: ['予算が少ない', '低予算', '予算相談'],
                answer: 'ご予算に合わせて仕様調整のご提案が可能です。優先度（クオリティ/納期/点数）を共有いただければ現実的なプランをご案内します。'
            },
            {
                keywords: ['納品形式おすすめ', 'どの形式', '最適な形式'],
                answer: 'Web用途はPNG/JPG、編集前提はPSD、印刷は入稿仕様に合わせた形式がおすすめです。用途を教えていただければ最適形式をご提案します。'
            },
            {
                keywords: ['解像度おすすめ', 'dpi', '何dpi'],
                answer: 'Web用途は72〜144dpi、印刷用途は300dpiが一般的です。最終用途に合わせて最適な解像度で制作します。'
            },
            {
                keywords: ['ラフ提出', 'ラフ確認', '初稿'],
                answer: '通常はラフ提出→確認→清書の流れです。方向性確認後に本制作へ進むため、初期段階で認識を揃えやすくなります。'
            },
            {
                keywords: ['修正費用', '追加修正', '修正料金'],
                answer: '規定回数内の修正はプランに含まれます。大幅変更や回数超過は追加費用となる場合があるため、事前にご案内します。'
            },
            {
                keywords: ['途中共有', 'WIP', '進捗共有'],
                answer: '進捗共有は節目ごとに対応可能です。頻度が必要な案件は、週次などの定期報告運用にも合わせられます。'
            },
            {
                keywords: ['優先対応', '優先枠', '優先スロット'],
                answer: '継続案件や納期条件に応じて優先枠を調整できる場合があります。時期によって変動するため、まずはご相談ください。'
            },
            {
                keywords: ['配信', 'vtuber', '配信用素材'],
                answer: '配信用素材（サムネ・立ち絵・差分など）にも対応しています。利用プラットフォームや必要サイズをご共有ください。'
            },
            {
                keywords: ['ゲーム用', '立ち絵', 'スチル'],
                answer: 'ゲーム向けの立ち絵・スチル・差分制作に対応可能です。実装仕様（サイズ・命名・レイヤー）に合わせて納品できます。'
            },
            {
                keywords: ['実装サポート', '組み込み', '導入'],
                answer: '実装そのものは範囲外の場合がありますが、導入しやすい形でのデータ整理や命名ルール対応は可能です。'
            },
            {
                keywords: ['再発注', '追加発注', '続き'],
                answer: '再発注・追加発注も歓迎です。前回データやルールを踏まえて、最短で進められるよう調整します。'
            },
            {
                keywords: ['急ぎ相談', '今すぐ相談', '至急'],
                answer: '至急案件は希望納期を明記のうえご相談ください。対応可否を優先確認してご連絡します。メールは solqc_e@outlook.com です。'
            },
            {
                keywords: ['イラスト依頼', '依頼したい', '発注したい'],
                answer: 'ありがとうございます。まずは用途・納期・ご予算の目安をお知らせください。内容に合わせて最適な進め方をご案内します。'
            },
            {
                keywords: ['相場', '費用感', 'だいたい料金'],
                answer: '費用感は点数・作業範囲・納期で変わります。ざっくりの要件でも概算提示できますので、お気軽にご相談ください。'
            },
            {
                keywords: ['打ち合わせ方法', 'zoom', 'meet'],
                answer: 'オンライン打ち合わせに対応可能です。必要であれば日程候補を複数いただけると調整がスムーズです。'
            },
            {
                keywords: ['納期延長', '延長', 'スケジュール変更'],
                answer: '進行中の納期変更は可能な範囲で調整できます。影響範囲を確認して、更新スケジュールをご案内します。'
            },
            {
                keywords: ['途中キャンセル', '進行中キャンセル'],
                answer: '進行中キャンセルは工程に応じて対応可能です。着手済み分の費用については契約条件に沿ってご案内します。'
            },
            {
                keywords: ['再編集', '後から修正', '納品後修正'],
                answer: '納品後の修正も内容に応じて対応可能です。用途変更や追加要望がある場合は詳細を共有ください。'
            },
            {
                keywords: ['ファイル共有', '受け渡し', '納品方法'],
                answer: '納品は用途に合わせた方法で対応します。希望があれば事前に共有ルールを合わせて進行できます。'
            },
            {
                keywords: ['素材化', 'パーツ化', '分割納品'],
                answer: '素材化を想定したパーツ分割納品に対応可能です。実装や運用に必要な単位をご指定ください。'
            },
            {
                keywords: ['背景なし', 'キャラのみ', '透過キャラ'],
                answer: '背景なしのキャラクター単体納品にも対応しています。透過PNGでの納品も可能です。'
            },
            {
                keywords: ['背景あり', '背景付き', '情景イラスト'],
                answer: '背景付きイラストにも対応可能です。世界観や時間帯などの演出要素も含めて提案できます。'
            },
            {
                keywords: ['テイスト寄せ', '作風寄せ', '雰囲気合わせ'],
                answer: '既存ブランドや企画の雰囲気に合わせたテイスト調整が可能です。参考資料の共有をお願いします。'
            },
            {
                keywords: ['ラフ何案', '案数', '初期提案数'],
                answer: 'ラフ案数は要件に応じて調整できます。複数案比較をご希望の場合はその前提でお見積もりします。'
            },
            {
                keywords: ['工数', '作業量', '見積根拠'],
                answer: '見積は工数・仕様・確認回数を基準に算出します。必要であれば内訳イメージもご説明します。'
            },
            {
                keywords: ['背景差分', '昼夜差分', '色差分'],
                answer: '背景差分・時間帯差分・色差分にも対応できます。運用シーンに合わせて設計可能です。'
            },
            {
                keywords: ['表情パック', '差分セット', '感情差分'],
                answer: '表情差分セットの制作に対応しています。使用頻度の高い感情から優先して設計できます。'
            },
            {
                keywords: ['権利表記', 'クレジット名', '表記名'],
                answer: 'クレジット表記名の指定は可能です。媒体ごとに推奨表記を合わせてご案内します。'
            },
            {
                keywords: ['利用期限', '使用期限', '掲載期間'],
                answer: '利用期限のある契約にも対応できます。期間・媒体・地域などの条件を整理して設定します。'
            },
            {
                keywords: ['独占', '専属', '排他的利用'],
                answer: '独占・排他的利用のご相談も可能です。条件に応じて契約内容と費用をご案内します。'
            },
            {
                keywords: ['社内確認', '承認フロー', 'レビュー'],
                answer: '社内承認フローに合わせた進行が可能です。確認ポイントを事前定義するとスムーズです。'
            },
            {
                keywords: ['修正回数', '何回修正', 'リテイク回数'],
                answer: '修正回数はプランごとに設定しています。要件に応じて回数増加のプラン調整も可能です。'
            },
            {
                keywords: ['二次配布', '再配布', '再販売'],
                answer: '二次配布や再販売は契約条件によって扱いが変わります。事前相談のうえ利用範囲を明確化します。'
            },
            {
                keywords: ['グッズ', '物販', '印刷物'],
                answer: 'グッズ・物販向け制作にも対応しています。サイズや印刷方式を共有いただければ最適化可能です。'
            },
            {
                keywords: ['配布素材', 'フリー素材', '素材提供'],
                answer: '素材配布用途は利用条件の設計が重要です。配布範囲や禁止事項を含めてご相談ください。'
            },
            {
                keywords: ['サンプル', '参考実績', '事例'],
                answer: '実績はポートフォリオページで確認できます。用途に近い事例が必要な場合は個別にご案内します。'
            },
            {
                keywords: ['運用提案', '制作フロー提案', '体制相談'],
                answer: '制作フローや運用体制の提案も可能です。継続案件向けに無理のない進め方をご提案します。'
            },
            {
                keywords: ['連絡手段', 'チャットツール', 'slack'],
                answer: '連絡手段は案件に合わせて調整可能です。主要窓口を一本化すると認識齟齬を防げます。'
            },
            {
                keywords: ['秘密情報', '情報管理', 'セキュリティ'],
                answer: '情報管理は契約と運用ルールに沿って対応します。必要な管理要件があれば事前に共有ください。'
            },
            {
                keywords: ['対応地域', '国内外', '海外案件'],
                answer: '国内外の案件に対応可能です。時差や連絡時間帯の条件は事前に調整して進行します。'
            },
            {
                keywords: ['公開不可', '非公開実績', '守秘'],
                answer: '非公開案件に対応可能です。実績掲載の可否は契約時に明確化して進行します。'
            },
            {
                keywords: ['相談だけ', '見積だけ', '検討中'],
                answer: '相談・見積もりのみでも問題ありません。比較検討段階でもお気軽にお問い合わせください。'
            },
            {
                keywords: ['連絡先教えて', 'メール教えて', 'メールアドレス'],
                answer: 'お問い合わせ先は <a href="mailto:solqc_e@outlook.com">solqc_e@outlook.com</a> です。ご相談内容を添えてご連絡ください。'
            },
            {
                keywords: ['x', 'X', 'twitter', 'ツイッター', 'xアカウント'],
                answer: 'solaceのXアカウントはこちらです：<a href="https://x.com/solqc_e" target="_blank" rel="noopener noreferrer">https://x.com/solqc_e</a>'
            },
            {
                keywords: ['instagram', 'インスタ', 'インスタグラム', 'insta'],
                answer: 'solaceのInstagramアカウントはこちらです：<a href="https://www.instagram.com/solqc_e/" target="_blank" rel="noopener noreferrer">https://www.instagram.com/solqc_e/</a>'
            },
            {
                keywords: ['私のアカウント', '自分のアカウント', 'あなたのアカウント', 'snsアカウント'],
                answer: 'solaceのアカウントはこちらです。X：<a href="https://x.com/solqc_e" target="_blank" rel="noopener noreferrer">https://x.com/solqc_e</a> / Instagram：<a href="https://www.instagram.com/solqc_e/" target="_blank" rel="noopener noreferrer">https://www.instagram.com/solqc_e/</a> / TikTok：<a href="https://www.tiktok.com/@solqc_e" target="_blank" rel="noopener noreferrer">https://www.tiktok.com/@solqc_e</a>'
            },
            {
                keywords: ['sns', 'ソーシャル', 'アカウント', 'リンクまとめ'],
                answer: 'solaceのSNSはこちらです。X：<a href="https://x.com/solqc_e" target="_blank" rel="noopener noreferrer">x.com/solqc_e</a> / Instagram：<a href="https://www.instagram.com/solqc_e/" target="_blank" rel="noopener noreferrer">instagram.com/solqc_e</a> / TikTok：<a href="https://www.tiktok.com/@solqc_e" target="_blank" rel="noopener noreferrer">tiktok.com/@solqc_e</a> / FANBOX：<a href="https://solqce.fanbox.cc/" target="_blank" rel="noopener noreferrer">solqce.fanbox.cc</a> / pixiv：<a href="https://www.pixiv.net/users/87167514" target="_blank" rel="noopener noreferrer">pixiv.net/users/87167514</a> / wick：<a href="https://wick-sns.com/sns/profile/93824b1d-2a33-4be9-9485-5bd35734bb7e" target="_blank" rel="noopener noreferrer">wick-sns.com profile</a> / YouTube：<a href="https://www.youtube.com/@solqc_e" target="_blank" rel="noopener noreferrer">youtube.com/@solqc_e</a>'
            },
            {
                keywords: ['fanbox', 'FANBOX', 'ファンボックス'],
                answer: 'solaceのFANBOXはこちらです：<a href="https://solqce.fanbox.cc/" target="_blank" rel="noopener noreferrer">https://solqce.fanbox.cc/</a>'
            },
            {
                keywords: ['pixiv', 'ピクシブ'],
                answer: 'pixivはこちらです：<a href="https://www.pixiv.net/users/87167514" target="_blank" rel="noopener noreferrer">https://www.pixiv.net/users/87167514</a>'
            },
            {
                keywords: ['wick', 'WICK', 'wick sns'],
                answer: 'solaceのwickプロフィールはこちらです：<a href="https://wick-sns.com/sns/profile/93824b1d-2a33-4be9-9485-5bd35734bb7e" target="_blank" rel="noopener noreferrer">https://wick-sns.com/sns/profile/93824b1d-2a33-4be9-9485-5bd35734bb7e</a>'
            },
            {
                keywords: ['tiktok', 'TikTok', 'ティックトック'],
                answer: 'solaceのTikTokはこちらです：<a href="https://www.tiktok.com/@solqc_e" target="_blank" rel="noopener noreferrer">https://www.tiktok.com/@solqc_e</a>'
            },
            {
                keywords: ['youtube', 'ユーチューブ', '動画'],
                answer: 'YouTubeはこちらです：<a href="https://www.youtube.com/@solqc_e" target="_blank" rel="noopener noreferrer">https://www.youtube.com/@solqc_e</a>'
            },
            {
                keywords: ['インボイス', '適格請求書', 'インボイス登録'],
                answer: '現時点で solace は適格請求書発行事業者（インボイス制度）に登録していません。必要書類や取引条件の調整については事前にご相談ください。'
            },
            {
                keywords: ['インボイス番号', '登録番号', 't番号'],
                answer: 'solace はインボイス登録をしていないため、適格請求書の登録番号はありません。取引条件が必要な場合は別途ご相談ください。'
            },
            {
                keywords: ['どんなイラスト', '何が描ける', '描けるもの'],
                answer: 'キャラクターデザイン、立ち絵、SDキャラ、1枚絵、背景付きビジュアル、配信用素材、グッズ向けイラストなど幅広く対応しています。'
            },
            {
                keywords: ['どんな依頼', '依頼できる内容', '頼めること'],
                answer: '新規制作、差分追加、既存絵のブラッシュアップ、継続案件、商用案件、個人制作まで対応可能です。まずは用途を教えてください。'
            },
            {
                keywords: ['sdキャラ', 'デフォルメ', 'ちびキャラ'],
                answer: 'SDキャラ（デフォルメ）制作に対応しています。表情差分・ポーズ差分・スタンプ展開までご相談可能です。'
            },
            {
                keywords: ['立ち絵', '全身イラスト', 'キャラ立ち絵'],
                answer: '立ち絵制作に対応可能です。用途（配信・ゲーム・資料）に合わせてサイズや差分構成を設計します。'
            },
            {
                keywords: ['一枚絵', '1枚絵', 'キービジュアル制作'],
                answer: '背景込みの1枚絵・キービジュアル制作に対応しています。告知・サイト・配信サムネなど用途別に最適化できます。'
            },
            {
                keywords: ['コンセプトアート', '世界観イラスト', '設定画'],
                answer: 'コンセプトアートや設定画の制作に対応しています。世界観資料や方向性があると精度高く進められます。'
            },
            {
                keywords: ['グッズ', 'アクキー', '缶バッジ'],
                answer: 'グッズ向けイラストに対応可能です。印刷方式や実寸サイズに合わせたデータ設計も可能です。'
            },
            {
                keywords: ['配信スタンプ', 'スタンプ', '絵文字'],
                answer: '配信用スタンプ・絵文字制作に対応しています。使用プラットフォームの仕様に合わせて納品します。'
            },
            {
                keywords: ['サムネイル', '告知画像', 'sns投稿画像'],
                answer: 'サムネイル・告知画像にも対応可能です。媒体サイズに合わせた複数展開もご相談ください。'
            },
            {
                keywords: ['男性キャラ', '女性キャラ', '人外キャラ'],
                answer: '男性・女性・人外キャラクターまで対応可能です。年齢層や世界観に合わせてデザインします。'
            },
            {
                keywords: ['動物', 'マスコット', 'クリーチャー'],
                answer: '動物・マスコット・クリーチャー系のデザインにも対応しています。用途に応じて可愛さ/迫力を調整できます。'
            },
            {
                keywords: ['ポートフォリオ見たい', '作品見たい', '実績見たい'],
                answer: 'ポートフォリオページで制作実績をご覧いただけます。用途に近い事例が必要な場合は個別にご案内します。'
            },
            {
                keywords: ['企業依頼', '法人依頼', '会社依頼'],
                answer: '企業・法人向け案件に対応しています。契約書・NDA・請求書運用を含めて進行可能です。'
            },
            {
                keywords: ['個人依頼', '同人依頼', '個人案件'],
                answer: '個人依頼・同人案件にも対応可能です。ご予算や目的に合わせた進め方をご提案します。'
            },
            {
                keywords: ['vtuber立ち絵', '配信立ち絵', 'live2d立ち絵'],
                answer: 'Vtuber向け立ち絵・Live2D前提の制作に対応しています。可動域や仕様に沿ったパーツ分けも可能です。'
            },
            {
                keywords: ['背景制作', '背景だけ', '風景イラスト'],
                answer: '背景制作のみのご相談にも対応可能です。世界観資料やカメラアングル要望を共有ください。'
            },
            {
                keywords: ['表紙', '書籍表紙', '同人誌表紙'],
                answer: '書籍・同人誌の表紙制作にも対応可能です。塗り足しや文字配置を考慮したデータで納品できます。'
            },
            {
                keywords: ['ゲーム素材', 'ゲーム用イラスト', 'スプライト'],
                answer: 'ゲーム向け素材制作に対応しています。実装仕様に合わせたサイズ・差分・命名ルールで納品可能です。'
            },
            {
                keywords: ['修正依頼だけ', '既存絵修正', 'ブラッシュアップ'],
                answer: '既存イラストの修正・ブラッシュアップのみのご依頼も対応可能です。元データの有無をご共有ください。'
            },
            {
                keywords: ['継続発注', '定期発注', '月次依頼'],
                answer: '継続発注にも対応しています。点数・頻度・体制に応じて運用しやすい進行をご提案します。'
            },
            {
                keywords: ['短納期対応', '急ぎ対応', '特急依頼'],
                answer: '短納期・特急対応は時期と内容により可能です。希望納期を明記してご相談ください。'
            },
            {
                keywords: ['納品までの流れ', '制作フロー', '進め方'],
                answer: 'ヒアリング→ラフ→確認→清書→最終調整→納品の流れです。節目ごとに確認しながら進めます。'
            },
            {
                keywords: ['何を準備', '依頼前に準備', '事前準備'],
                answer: '用途、希望イメージ、サイズ、納期、ご予算目安があるとスムーズです。参考画像があると精度が上がります。'
            },
            {
                keywords: ['苦手ジャンル', '対応不可', 'できないこと'],
                answer: '内容によってはお受けできない場合があります。まずは詳細をご共有いただければ対応可否を明確にご案内します。'
            },
            {
                keywords: ['相談窓口', '問い合わせ窓口', '連絡先どこ'],
                answer: 'ご相談はフォームまたは <a href="mailto:solqc_e@outlook.com">solqc_e@outlook.com</a> で受け付けています。'
            },
            {
                keywords: ['発注手順', '依頼手順', 'どう頼む'],
                answer: 'まず用途と希望内容を共有いただき、見積もり確認後に制作開始となります。チャットかメールで最初の相談が可能です。'
            },
            {
                keywords: ['ラフ提出回数', 'ラフ修正', '初稿修正'],
                answer: 'ラフ段階で方向性を合わせるための確認・修正に対応しています。回数や範囲はプランごとにご案内します。'
            },
            {
                keywords: ['商用案件', '商用プロジェクト', '法人利用'],
                answer: '商用案件に対応可能です。利用範囲や権利条件を整理したうえで契約・制作を進行します。'
            },
            {
                keywords: ['趣味依頼', '個人利用', '非商用依頼'],
                answer: '非商用・趣味用途のご依頼にも対応しています。目的に合わせて過不足のない仕様をご提案します。'
            },
            {
                keywords: ['メールで見積', 'メール見積依頼', '見積メール'],
                answer: 'メール見積もりは <a href="mailto:solqc_e@outlook.com">solqc_e@outlook.com</a> 宛に、用途・納期・ご予算・参考資料をお送りください。'
            },
            {
                keywords: ['海外', '英語', 'international'],
                answer: '簡単な英語でのやり取りを含めて対応可能です。時差や納期条件がある場合は、事前に運用ルールを決めて進行します。'
            }
        ];
        this.isOpen = false;
        this.init();
    }

    init() {
        // チャットボットHTMLを挿入
        this.createChatWidget();
        this.attachEventListeners();
    }

    createChatWidget() {
        const chatHTML = `
            <div id="chatbot-widget" class="chatbot-widget">
                <div class="chatbot-header">
                    <h4>よくある質問</h4>
                    <a href="mailto:solqc_e@outlook.com" class="chatbot-mail-link" title="メールで相談">メール</a>
                    <button id="chatbot-close" class="chatbot-close" aria-label="チャットを閉じる">×</button>
                </div>
                <div id="chatbot-messages" class="chatbot-messages">
                    <div class="chatbot-message bot">
                        <p>こんにちは！ご質問やお困りのことはありませんか？<br>「納期」「修正」「料金」など、キーワードで検索できます！<br><br>個別相談は <a href="mailto:solqc_e@outlook.com">solqc_e@outlook.com</a> でも受け付けています。</p>
                    </div>
                </div>
                <div class="chatbot-input-area">
                    <input type="text" id="chatbot-input" placeholder="質問を入力..." autocomplete="off">
                    <button id="chatbot-send" class="chatbot-send-btn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="chatbot-contact-row">
                    <span>メール相談:</span>
                    <a href="mailto:solqc_e@outlook.com">solqc_e@outlook.com</a>
                </div>
            </div>
            <button id="chatbot-toggle" class="chatbot-toggle-btn" title="質問を開く" aria-label="質問チャットを開く">
                <i class="fas fa-comments"></i>
            </button>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('chatbot-toggle');
        const closeBtn = document.getElementById('chatbot-close');
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');

        toggleBtn.addEventListener('click', () => this.toggleChat());
        closeBtn.addEventListener('click', () => this.toggleChat());
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    toggleChat() {
        const widget = document.getElementById('chatbot-widget');
        this.isOpen = !this.isOpen;
        widget.style.display = this.isOpen ? 'flex' : 'none';
        if (this.isOpen) {
            document.getElementById('chatbot-input').focus();
        }
    }

    sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message) return;

        // ユーザーメッセージを表示
        this.displayMessage(message, 'user');
        input.value = '';

        // AIレスポンスを生成
        setTimeout(() => {
            const response = this.generateResponse(message);
            this.displayMessage(response, 'bot');
        }, 500);
    }

    displayMessage(text, sender) {
        const messagesDiv = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${sender}`;
        messageDiv.innerHTML = `<p>${text}</p>`;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    generateResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // キーワードマッチング
        for (let faq of this.faqDatabase) {
            for (let keyword of faq.keywords) {
                if (lowerMessage.includes(keyword)) {
                    return faq.answer;
                }
            }
        }

        // マッチしない場合のデフォルト応答
        return `申し訳ありません。ご質問がよく理解できませんでした。<br><br>「納期」「修正」「料金」「サービス」「企業」「個人」などのキーワードで検索してみてください。<br><br>それでもご不明な点があれば、お問い合わせフォームをご利用いただくか、<a href="mailto:solqc_e@outlook.com">solqc_e@outlook.com</a> までご連絡ください。`;
    }
}

// チャットボットを初期化
document.addEventListener('DOMContentLoaded', () => {
    new FAQChatbot();
});
