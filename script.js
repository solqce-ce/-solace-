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
});

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// ナビゲーションリンクをクリックしたときメニューを閉じる
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// 画面外をクリックしたときメニューを閉じる
document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar') && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
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
                keywords: ['相談', '質問', 'どうやって'],
                answer: 'SNS DMやメール、お問い合わせフォームからご相談いただけます。24時間受け付けており、返信は翌営業日となります。'
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
                    <button id="chatbot-close" class="chatbot-close">×</button>
                </div>
                <div id="chatbot-messages" class="chatbot-messages">
                    <div class="chatbot-message bot">
                        <p>こんにちは！ご質問やお困りのことはありませんか？<br>「納期」「修正」「料金」など、キーワードで検索できます！</p>
                    </div>
                </div>
                <div class="chatbot-input-area">
                    <input type="text" id="chatbot-input" placeholder="質問を入力..." autocomplete="off">
                    <button id="chatbot-send" class="chatbot-send-btn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
            <button id="chatbot-toggle" class="chatbot-toggle-btn" title="質問を開く">
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
        return `申し訳ありません。ご質問がよく理解できませんでした。\n\n「納期」「修正」「料金」「サービス」「企業」「個人」などのキーワードで検索してみてください。\n\nそれでもご不明な点があれば、お問い合わせフォームからお気軽にお尋ねください！`;
    }
}

// チャットボットを初期化
document.addEventListener('DOMContentLoaded', () => {
    new FAQChatbot();
});
