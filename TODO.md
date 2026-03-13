# Security Enhancement Plan for color folder

## Tasks
- [x] 1. Add sanitization function to common.js
- [x] 2. Fix XSS in gallery-enterprise.html
- [x] 3. Fix XSS in emoji-generator-enterprise.html
- [x] 4. Fix XSS in pose-generator-enterprise.html
- [x] 5. Fix XSS in chara-generator-enterprise.html
- [x] 6. Add localStorage error handling in common.js

## 公開前チェック（Web運用）

### SEO / 構造
- [ ] 本番ドメインで `canonical` が正しいURLを指している
- [ ] `sitemap.xml` が最新ページ構成と一致している
- [ ] `robots.txt` に `Sitemap` 記載がある

### OGP / SNS
- [ ] 主要ページに `og:title` / `og:description` / `og:image` がある
- [ ] `twitter:card` / `twitter:image` がある
- [ ] OGP画像が `1200x630`（[images/og-default.png](images/og-default.png)）
- [ ] X Card Validator で表示確認
- [ ] Facebook Sharing Debugger で表示確認（必要時 Scrape Again）

### 法務導線
- [ ] フッターから法務4ページへ到達できる
	- [ ] [privacy-policy.html](privacy-policy.html)
	- [ ] [terms.html](terms.html)
	- [ ] [tokutei-shotorihiki.html](tokutei-shotorihiki.html)
	- [ ] [cancellation-policy.html](cancellation-policy.html)
- [ ] 依頼フォーム同意文に法務リンクがある

### 表示 / 動作
- [ ] モバイル表示（幅 375px 目安）でレイアウト崩れがない
- [ ] ハンバーガーメニューが開閉でき、`Esc` で閉じられる
- [ ] 外部リンクは新しいタブで開く
- [ ] 主要導線（ホーム→依頼→送信）を手動確認
