# ❤️ お気に入り機能 & 📜 履歴機能 実装ガイド

## 🎯 追加された機能

### 1️⃣ **お気に入り機能** ❤️

#### 使用方法
```javascript
// お気に入りに追加
addToFavorites(itemId, itemName, itemEmoji)

// お気に入りから削除
removeFavorite(itemId)

// お気に入りか確認
isFavorite(itemId)

// すべてのお気に入りを取得
getFavorites()

// ボタンの切り替え
toggleFavoriteButton(button, itemId, itemName, itemEmoji)
```

#### ギャラリーでの使用例
```html
<!-- ☆ボタンをクリックで★に変わってお気に入り登録 -->
<button class="favorite-btn" 
        onclick="toggleFavoriteButton(this, 1, '笑顔のポートレート', '😊')">
  ☆
</button>
```

#### トースト通知
```
❤️ [作品名] をお気に入りに追加しました
❌ [作品名] をお気に入りから削除しました
```

#### ローカルストレージ
```javascript
{
  "id": 1,
  "name": "笑顔のポートレート",
  "emoji": "😊",
  "addedAt": "2024-02-27T10:30:00.000Z"
}
```

---

### 2️⃣ **履歴機能** 📜

#### 使用方法
```javascript
// 履歴に追加（自動）
addToHistory(pageUrl, pageName, pageEmoji)

// 履歴を取得
getHistory()

// 履歴をクリア
clearHistory()

// 履歴ナビゲーションを構築
buildHistoryNav(currentPage)
```

#### 履歴ナビゲーション表示
```
最近訪問したページ: [最新6件をカード表示]
```

#### 自動記録
- ページ読み込み時に自動で履歴に記録
- 最新50件のみ保存
- 同じページを再訪問した場合は最新に更新

#### ローカルストレージ
```javascript
{
  "url": "gallery.html",
  "name": "ギャラリー",
  "emoji": "📄",
  "visitedAt": "2024-02-27T10:30:00.000Z"
}
```

---

## 📦 ファイル構成

### **common.js**（更新版）
- ✅ `addToFavorites()` 関数
- ✅ `removeFavorite()` 関数
- ✅ `isFavorite()` 関数
- ✅ `getFavorites()` 関数
- ✅ `toggleFavoriteButton()` 関数
- ✅ `addToHistory()` 関数
- ✅ `getHistory()` 関数
- ✅ `clearHistory()` 関数
- ✅ `buildHistoryNav()` 関数

### **gallery.html**（更新版）
- ✅ お気に入りボタン（☆/★）
- ✅ フィルタータブ（すべて / お気に入り）
- ✅ 履歴ナビゲーション表示
- ✅ 検索機能との統合

---

## 🎨 UI/UX の改善

### **ギャラリー画面**

#### フィルタータブ
```
[すべて] [❤️ お気に入り] [➕ サンプル追加]
```

#### お気に入りボタン
```
☆ → マウスホバーで拡大
★ → ゴールドカラー（お気に入り済み）
```

#### 履歴ナビゲーション
```
📜 最近訪問したページ [履歴をクリア]
[🏠 ホーム] [😊 絵文字] [🧍 ポーズ] ...
```

---

## 💾 ローカルストレージの構造

### **名前空間プレフィックス**

すべての保存キーは `pgp.` プレフィックス付きで保存されます。

例:
- `pgp.favorites`
- `pgp.visitHistory`
- `pgp.profile`
- `pgp.stats`
- `pgp.gallery`
- `pgp.randomColorSettings`
- `pgp.emojiSettings`
- `pgp.appSettings`

既存の旧キー（`favorites` など）は初回読み込み時に自動移行されます。

### **キー: `pgp.favorites`**
```json
[
  {
    "id": 1,
    "name": "笑顔のポートレート",
    "emoji": "😊",
    "addedAt": "2024-02-27T10:30:00.000Z"
  }
]
```

### **キー: `pgp.visitHistory`**
```json
[
  {
    "url": "gallery.html",
    "name": "ギャラリー",
    "emoji": "📄",
    "visitedAt": "2024-02-27T10:30:00.000Z"
  }
]
```

---

## 🚀  実装のポイント

### **1. 自動初期化**
```javascript
// DOMContentLoaded時に自動実行
document.addEventListener("DOMContentLoaded", () => {
  buildNav('gallery');
  buildHistoryNav('gallery.html');  // ← 履歴ナビを構築
  renderGallery();
});
```

### **2. 履歴の自動記録**
```javascript
// common.js の初期化処理で自動実行
const pageName = document.title.split(' - ')[0];
addToHistory(window.location.pathname, pageName);
```

### **3. トースト通知**
```javascript
showToast('❤️ 作品をお気に入りに追加しました', 2000, 'success');
```

### **4. バックアップ対象**

設定画面のエクスポート/インポートでは次のデータを対象にします。

- `profile`
- `stats`
- `gallery`
- `theme`
- `favorites`
- `visitHistory`
- `randomColorSettings`
- `emojiSettings`
- `appSettings`

---

## ✅ 実装チェックリスト

### **セットアップ**
- [ ] `common.js` を最新版に更新
- [ ] `gallery.html` を最新版に更新
- [ ] ブラウザキャッシュをクリア
- [ ] ページをリロード

### **お気に入り機能の確認**
- [ ] ギャラリーで☆ボタンが表示される
- [ ] クリックで★に変わる
- [ ] トースト通知が表示される
- [ ] ★をクリックで☆に戻る
- [ ] お気に入りフィルタータブで★のみ表示される
- [ ] ページリロード後も★が保持される

### **履歴機能の確認**
- [ ] ページ読み込み時に履歴ナビが表示される
- [ ] 複数のページを訪問すると最新6件が表示される
- [ ] 「履歴をクリア」でリセットされる
- [ ] ホバーで背景色が変わる
- [ ] クリックで該当ページに移動する

### **統合テスト**
- [ ] 検索とお気に入りフィルタが同時に動作
- [ ] モバイル表示で見やすい
- [ ] ダークモードで見やすい
- [ ] コンソールにエラーなし

---

## 🎯 使用シーン

### **ユーザー**
1. ギャラリーを訪問
2. サンプル作品を追加
3. 気に入った作品の☆をクリック
4. 「❤️ お気に入り」タブで確認
5. 後で「📜 最近訪問したページ」から戻って来られる

### **クリエイター**
1. 複数ページを行き来して作品作成
2. 履歴で前のページに素早く戻る
3. 最高作品を☆でマーク
4. ポートフォリオのように活用

---

## 🔧 カスタマイズ例

### **他のページに也お気に入りボタンを追加**
```html
<button onclick="toggleFavoriteButton(this, 1, '絵文字パック1', '😊')">
  ☆ お気に入り
</button>
```

### **お気に入り数を表示**
```javascript
function getFavoritesCount() {
  return getFavorites().length;
}

// 使用例
const count = getFavoritesCount();
console.log(`お気に入り: ${count}個`);
```

### **履歴から特定ページを除外**
```javascript
// settings-enterprise.html など特定ページで
document.addEventListener("DOMContentLoaded", () => {
  // 履歴記録をスキップ
  buildNav('settings');
  buildHistoryNav('settings.html');
});
```

---

## 📱 レスポンシブ対応

### **Desktop (1200px+)**
- ☆ボタンが右上に固定表示
- 履歴ナビが6列グリッド
- フィルタータブが横並び

### **Tablet (768px)**
- ☆ボタンが記事内に統合
- 履歴ナビが3列グリッド
- フィルタータブが横並び

### **Mobile (480px以下)**
- ☆ボタンが右上に固定表示
- 履歴ナビが1列表示（スクロール可）
- フィルタータブが縦スタック

---

## 🚨 トラブルシューティング

### **Q: お気に入りボタンが表示されない**
A: 以下を確認してください：
1. `common.js` が最新版か確認
2. `gallery.html` が最新版か確認
3. ブラウザキャッシュをクリア
4. コンソール (F12) でエラー確認

### **Q: 履歴が表示されない**
A: 以下を確認してください：
1. `<div class="history-nav" id="historyNav"></div>` が HTML に含まれているか
2. `buildHistoryNav()` が DOMContentLoaded で呼ばれているか
3. 複数ページを訪問したか

### **Q: お気に入りが保存されない**
A: 以下を確認してください：
1. プライベートウィンドウで開いていないか
2. ブラウザの localStorage が有効か
3. ローカルストレージ容量が満杯でないか

---

## 📊 データ統計

### **ローカルストレージの使用量**
- お気に入り：1件あたり約100bytes
- 履歴：1件あたり約80bytes
- 合計：最大で約6KB（推奨値以下）

---

## 🎉 完成！

✅ **お気に入り機能**で大切な作品をマーク
✅ **履歴機能**で前のページにワンクリックで戻る

これでユーザーのUXが大幅に向上しました！

---

最新の `common.js` と `gallery.html` を使用してください。
