# RunLoad

初心者ランナーが、走行記録と身体の記録を振り返るためのWebアプリです。

## コード構成

- `app.js` — アプリ起動と画面遷移の入口
- `screens/` — ホーム、記録、結果、履歴、相談など各画面の組み立て
- `ui/` — 表示部品、入力操作、結果表示、相談表示など
- `core/runloadCore.js` + `core/part-*.js` — 計算、保存、履歴、相談、旧記録互換などの内部処理
- `styles/` — 共通・画面別スタイル
- `service-worker.js` — オフライン利用と更新
- `manifest.webmanifest` — PWA設定

`core/part-*.js` は、保存・計算・旧記録互換・相談などの役割ごとに内部処理を分けています。各ファイル内には元のモジュール境界を見出しとして残しています。
現在の12身体部位の結果生成は `createPrimaryRegionalV2ResultRecord`、保存から結果生成までの流れは `recordWorkflow` / `applicationServices` を起点に追えます。

身体部位名は、生体力学・解剖学上の表現との整合を保つため正式名称を使用しています。
表示される数値は、診断、けがの確率、安全・危険、走行可否を示すものではありません。
