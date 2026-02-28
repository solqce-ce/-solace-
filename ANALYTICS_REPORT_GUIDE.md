# GA4 レポート運用ガイド（solace）

このガイドは、`script.js` で送信しているイベントを GA4 の「探索」で即利用するためのテンプレートです。

## 1) 主要イベント

- `funnel_event`（推奨の主レポート用）
- `ui_click`
- `form_submit`
- `form_submission`
- `form_start`
- `tools_*` 系（保存・比較・編集・復元など）

`funnel_event` の主なパラメータ:

- `funnel_stage`（`awareness` / `consideration` / `conversion`）
- `funnel_action`（元イベント名）
- `funnel_label`（クリック文言など）
- `page_path`

## 2) GA4 側で先に登録するカスタム定義

### イベントスコープのカスタムディメンション

1. `funnel_stage`
2. `funnel_action`
3. `funnel_label`
4. `page_path`
5. `event_label`（既存イベント互換で見る場合）

### 必要なら追加

- `link_target`
- `form_type`
- `result_count`
- `imported_count`
- `query_length`
- `form_elapsed_seconds`

## 3) 探索テンプレート（そのまま作成可能）

### A. ファネル概況（最優先）

- 探索タイプ: 自由形式
- 行: `funnel_stage`
- 列: `page_path`
- 値: `イベント数`（イベント名は `funnel_event` にフィルタ）
- フィルタ: `eventName = funnel_event`

見るポイント:

- `awareness -> consideration -> conversion` の落ち方
- `page_path` 別の `conversion` 比率

### B. コンバージョン行動ランキング

- 探索タイプ: 自由形式
- 行: `funnel_action`
- 追加行: `funnel_label`
- 値: `イベント数`
- フィルタ: `eventName = funnel_event` AND `funnel_stage = conversion`

見るポイント:

- どの導線（依頼/お問い合わせ/保存）が成果に効いているか

### C. ツール利用分析

- 探索タイプ: 自由形式
- 行: `eventName`
- 追加行: `event_label`
- 値: `イベント数`
- フィルタ: `eventName` が `tools_` で始まる

推奨確認順:

1. `tools_result_save`
2. `tools_result_favorite_toggle`
3. `tools_result_compare_toggle`
4. `tools_backup_import`
5. `tools_state_reset`

### D. 検索/絞り込みの利用状況

- 探索タイプ: 自由形式
- 行: `eventName`
- 追加行: `event_label`
- 値: `イベント数`
- フィルタ: `eventName IN (tools_search_input, tools_filter_change, tools_sort_change)`

補足:

- `tools_search_input` は入力ごとに発火するため、必要なら後でデバウンスを検討

### E. フォーム開始→送信率

- 探索タイプ: 自由形式
- 行: `eventName`
- 追加行: `event_label`
- 値: `イベント数`
- フィルタ: `eventName IN (form_start, form_submit, form_submission)`

見るポイント:

- `form_start` は多いのに `form_submit` が少ないフォームの特定
- `request-*` ページごとの離脱改善優先順位づけ
- `form_elapsed_seconds` の中央値が長いフォームは入力負荷が高い可能性

### F. `form_elapsed_seconds` の p50 / p75 を見る手順

GA4 のUI仕様は更新されることがあるため、以下は「探索での実務向け手順」です。

#### パターン1: GA4探索で直接パーセンタイルが使える場合

- 探索タイプ: 自由形式
- 行: `event_label`（フォーム名）
- フィルタ: `eventName = form_complete`
- 値: `form_elapsed_seconds` の `中央値`（p50）
- 可能なら追加値: `75パーセンタイル`（p75）

確認ポイント:

- p50 が長いフォーム = 基本入力負荷が高い
- p75 だけ極端に長いフォーム = 一部ユーザーで詰まりが発生

#### パターン2: パーセンタイル指標が使えない場合（近似）

1. `form_complete` を `form_elapsed_seconds` で昇順表示
2. フォームごとにイベント件数 `N` を確認
3. `N × 0.50` 付近の秒数を p50、`N × 0.75` 付近を p75 として読む

実務メモ:

- 週次で同じ手順を維持すれば、改善前後の比較には十分有効
- まずは `request-corporate` / `request-personal` を優先監視

#### 目安（暫定）

- p50 が 90秒超: フォーム説明や入力補助の見直し候補
- p75 が 180秒超: 項目数・入力順・必須条件の見直し候補

## 4) 週次レビューの最小運用

- 週1回、以下を固定で確認
  1. `funnel_event` の `conversion` 総数
  2. `conversion` の上位 `funnel_action`
  3. `tools_result_save` の推移
  4. `page_path` 別の `conversion` 変化

## 5) アラート目安（簡易）

- `conversion` が前週比 `-30%` 以上
- `tools_backup_import` が急増（誤操作導線の可能性）
- `tools_state_reset` が急増（UIが分かりにくい可能性）

## 6) 追加改善の優先順

1. `tools_search_input` のデバウンス（ノイズ削減）
2. 依頼導線リンクに `data-track` 明示ラベルを追加
3. `request-*` ページでフォーム開始イベント（`funnel_action = form_start`）を追加

