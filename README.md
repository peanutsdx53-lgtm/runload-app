# 走行記録アプリ

This browser-based application helps beginner runners review their own running records, body-region Reference-100 values, subjective fatigue (ROF-J), history, plans, courses, local GPX information, and smartphone running measurements.

## Current application structure

The repository contains both the deployable runtime and development/reference material.

- `core/`: deterministic domain logic and interpretation logic
- `screens/`: screen-level rendering and screen-specific composition
- `ui/`: shared presentation, navigation, interactions, and browser UI services
- `styles/`: theme tokens, shared layout/components, screen styles, responsive/mobile/desktop layers
- `assets/`, `icons/`: bundled runtime image assets
- `tests/`: executable regression, boundary, navigation, presentation, and integration tests
- `docs/`: architecture, source records, and implementation documentation

See `docs/CODEBASE_ARCHITECTURE.md` for ownership and maintenance rules.

## Scientific and interpretation boundaries

- Reference-100 supports within-region self-understanding; it is not a cross-region ranking.
- Distance is a separate running fact, not an automatic multiplier of the regional display.
- Missing or unsupported data is not converted to zero or fabricated as q=1.
- ROF-J records subjective fatigue at the time of answering; it is separate from Reference-100.
- ROF-J is not a readiness, recovery, safety, injury-risk, or run/no-run score.
- 主観的疲労はROF-Jとして独立して扱い、12部位の数値とは合成しません。
- The app does not diagnose, prescribe training, estimate injury risk, or make automatic safety decisions.
- Legacy records are not silently reinterpreted as current Reference-100 values.

## Runtime technology

Runtime implementation is vanilla JavaScript, CSS, and HTML. The Web Manifest and PNG files are deployment assets. No framework or build step is required.

Application data is stored locally in the browser. GPX analysis is local-only. Smartphone GPS measurement is processed in the browser; OpenStreetMap map images are the primary external network dependency during map display.

## ローカル起動（VS Code + Live Server）

1. このフォルダーをVS Codeで開きます。
2. VS CodeのLive Serverで `index.html` を開きます（HTML/CSS/JavaScriptのビルドやnpmのインストールは不要です）。
3. 初回表示後に走行記録・履歴を確認します。ブラウザのローカル保存を使用します。
4. `file://` から直接開くとES ModulesやService Workerが正常動作しないため、HTTP/HTTPS環境で利用してください。
5. オフライン対応はPWAの対応ブラウザ・初回キャッシュ登録に依存します。Live Serverのローカル起動だけで完全オフライン試験が完了するわけではありません。

## Distribution boundary

A runtime-only distribution can be produced without the development/reference material.

Keep these runtime items:

- `index.html`
- `manifest.webmanifest`
- `service-worker.js`
- `.nojekyll` when publishing through GitHub Pages
- `app.js`
- `core/`
- `screens/`
- `ui/`
- `styles/`
- `assets/`
- `icons/`

The following can be separated from the runtime distribution without changing application execution:

- `tests/`
- `docs/`
- this repository `README.md`

The application should be opened through an HTTP/HTTPS server rather than directly as a local `file:` URL. After the deployed PWA has completed an online cache installation, the precached runtime remains available offline except for functions that intentionally depend on external resources or browser/device services, such as live OpenStreetMap map images.

## Verification

Changes should keep JavaScript/MJS syntax checks, runtime reachability checks, PWA precache-path checks, and all maintained test suites passing. Real-device GPS, motion, sound, vibration, and permission behavior still require device testing because browser/platform support cannot be established by static code inspection alone.
