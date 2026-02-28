// ===== ハンバーガーメニュー ===== 
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
    const isExpanded = hamburger.classList.contains('active');
    hamburger.setAttribute('aria-expanded', isExpanded);
    hamburger.setAttribute('aria-label', isExpanded ? 'メニューを閉じる' : 'メニューを開く');
});

// ナビゲーションリンクをクリックしたときメニューを閉じる
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'メニューを開く');
    });
});

// 画面外をクリックしたときメニューを閉じる
document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar') && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'メニューを開く');
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
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'form_submission', {
                        'event_category': 'engagement',
                        'event_label': 'contact_form',
                        'form_type': formData.get('type')
                    });
                }
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
