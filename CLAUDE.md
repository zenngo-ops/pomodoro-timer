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

- **`index.html`** — 静的マークアップ。円形タイマーはSVG(`ring-bg` / `ring-progress` の2重円)で描画。
- **`style.css`** — CSSカスタムプロパティでテーマを管理。`prefers-color-scheme` でライト/ダーク自動切替。`--accent` はタイマーの現在モード(作業/短い休憩/長い休憩)に応じてJS側から動的に書き換えられる。
- **`script.js`**
  - **タイマー部分**: `MODES` オブジェクトが作業(25分)/短い休憩(5分)/長い休憩(15分)の長さと色を定義。`setInterval` で毎秒 `tick()` を実行し、`secondsLeft` を減算しつつSVGリングの `stroke-dashoffset` を更新。作業が完了するたびに `loadCycleCount()+1` 回目をカウントし、4回ごとに自動で長い休憩へ切り替え(`newCount % 4 === 0`)、それ以外は短い休憩へ。タイマー終了時は `alarmSound`(`<audio>` 要素)を再生するほか、`Notification` APIでポップアップ通知(「〇〇終了! 次は△△です」)を表示。通知許可は初回の開始ボタン押下時に `requestNotificationPermission()` でリクエストする。
  - **タスク管理部分**: `loadTasks` / `saveTasks` / `renderTasks` がタスクの追加・完了トグル・削除・完了済み一括消去を担当。
  - **永続化**: すべて `localStorage` に保存され、キーは `todayKey()`(`pomodoro-YYYY-MM-DD`)を接頭辞として日付単位で分離される(`-cycles` はその日の完了ポモドーロ数、`-tasks` はその日のタスク配列)。バックエンドはなく、日をまたぐ履歴集計機能もない。
