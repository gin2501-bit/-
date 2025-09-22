# Rhythm Flow

Vite + React + TypeScriptで構築した4レーンの簡易リズムゲームです。Web Audio APIを利用したメトロノームトラック、BPMと小節数からの譜面自動生成、判定システムやオフセット・スクロール速度調整などを実装しています。

## 主な機能

- D/F/J/Kキーでプレイする4レーンのノーツレーン
- BPM・小節数・拍子・分解能・乱数シードからの譜面自動生成
- PERFECT / GREAT / GOOD / MISS の判定とコンボ・精度計算
- オーディオオフセットとスクロール速度のリアルタイム調整
- Tailwind CSSによるスタイリング
- Vitest + Testing Libraryによる簡易ユニットテスト

## スクリプト

```bash
npm install
npm run dev
npm run build
npm run test
npm run lint
```

## 開発メモ

- Web Audio APIはユーザー操作後に有効化されるため、`スタート`ボタンを押してプレイを開始してください。
- 判定ウィンドウやスコア係数は `src/lib/judgement.ts` で定義しています。
