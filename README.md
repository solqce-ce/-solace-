# -solace-
solace　ホームページ、ジェネレーター、ブログ（予定）

## 入口

- ホームページ: [index.html](index.html)
- ジェネレーター: [color/index-enterprise.html](color/index-enterprise.html)
- ブログ（予定）: [blog.html](blog.html)
- 計測レポートガイド: [ANALYTICS_REPORT_GUIDE.md](ANALYTICS_REPORT_GUIDE.md)

## SNSカード確認手順

公開後にOGPが反映されない場合は、以下の順で確認します。

1. 対象ページを本番URLで開き、ページソース内の以下を確認
	- `og:title`
	- `og:description`
	- `og:image`
	- `twitter:card`
	- `twitter:image`
2. X Card Validator でURLを検証
	- https://cards-dev.twitter.com/validator
3. Facebook Sharing Debugger でURLを検証
	- https://developers.facebook.com/tools/debug/
4. 反映が古い場合は再スクレイプを実行
	- Facebook: 「Scrape Again」
	- X: 再度Validatorで読み込み
5. 画像サイズ確認
	- 推奨: 1200 x 630
	- 本リポジトリ既定画像: [images/og-default.png](images/og-default.png)

## 備考

- サイトマップ: [sitemap.xml](sitemap.xml)
- robots設定: [robots.txt](robots.txt)

