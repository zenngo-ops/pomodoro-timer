# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

素のHTML / CSS / JavaScriptで実装されたポモドーロタイマー。フレームワーク・ビルドツール・パッケージマネージャーは一切使用していない(`package.json` なし)。

## 開発コマンド

- ローカルで開く: `index.html` をブラウザで直接開く(ファイルプロトコルで完結)
- ローカルサーバー経由で開く(Windows / PowerShell):
  ```powershell
  ./serve.ps1
  ```
  起動後 `http://localhost:8934/` でアクセス。`serve.ps1` は `System.Net.HttpListener` を使った依存ライブラリなしの簡易静的ファイルサーバーで、`.html` / `.css` / `.js` にのみ Content-Type を割り当てる。
- ビルド・lint・テストの仕組みは存在しない。

## アーキテクチャ

3ファイル構成で、`script.js` に2つの独立した機能がまとまっている。

- **`index.html`** — 静的マークアップ。円形タイマーはSVG(`ring-bg` / `ring-progress` の2重円)で描画。歯車アイコン(`settingsBtn`)で時間設定パネル(`settingsPanel`)の表示・非表示を切り替える。
- **`style.css`** — CSSカスタムプロパティでテーマを管理。`prefers-color-scheme` でライト/ダーク自動切替。`--accent` はタイマーの現在モード(作業/短い休憩/長い休憩)に応じてJS側から動的に書き換えられる。
- **`script.js`**
  - **タイマー部分**: `MODES` オブジェクトが作業/短い休憩/長い休憩の長さ(デフォルト25分/5分/15分)と色を定義。デフォルト値は `DEFAULT_SETTINGS`(`work: 25, short: 5, long: 15, cycle: 4`)にまとめられており、起動時に `loadSettings()` で保存済み設定(なければデフォルト)を読み込み、`applySettings()` で `MODES.*.duration` と `sessionsPerCycle`(長い休憩までの作業セット数)に反映する。`setInterval` で毎秒 `tick()` を実行し、`secondsLeft` を減算しつつSVGリングの `stroke-dashoffset` を更新。作業が完了するたびに `loadCycleCount()+1` 回目をカウントし、`sessionsPerCycle` 回ごとに自動で長い休憩へ切り替え(`newCount % sessionsPerCycle === 0`)、それ以外は短い休憩へ。タイマー終了時は `alarmSound`(`<audio>` 要素)を再生するほか、`Notification` APIでポップアップ通知(「〇〇終了! 次は△△です」)を表示。通知許可は初回の開始ボタン押下時に `requestNotificationPermission()` でリクエストする。
  - **設定パネル**: 歯車ボタンで `settingsPanel` の表示をトグルし、開いた時点の設定値を各 `<input>`(作業/短い休憩/長い休憩の分数、セット数)に反映する。「保存」ボタン押下時に全項目が1以上の数値かを検証し(不正なら `alert` でどの項目か知らせる)、問題なければ `localStorage` に保存して `applySettings()` を再適用し、現在のモードをリセットする。
  - **タスク管理部分**: `loadTasks` / `saveTasks` / `renderTasks` がタスクの追加・完了トグル・削除・完了済み一括消去を担当。
  - **永続化**: 時間・セット数の設定はキー `pomodoro-durations` で日付に関係なく1件のみ保存される。それ以外(完了ポモドーロ数・タスク)は `todayKey()`(`pomodoro-YYYY-MM-DD`)を接頭辞として日付単位で分離される(`-cycles` はその日の完了ポモドーロ数、`-tasks` はその日のタスク配列)。バックエンドはなく、日をまたぐ履歴集計機能もない。
