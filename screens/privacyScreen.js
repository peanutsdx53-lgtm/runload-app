function icon(type) {
  const svgs = {
    local: '<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2.5"></rect><path d="M9 17.5h6"></path><circle cx="12" cy="7" r=".8" fill="currentColor" stroke="none"></circle></svg>',
    temporary: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5v5l3.4 2"></path><path d="M6.2 4.8 4.4 6.6"></path></svg>',
    external: '<svg viewBox="0 0 24 24"><path d="M5 7.5h8.5a4.5 4.5 0 0 1 0 9H9"></path><path d="m7.5 13-3 3.5 3 3.5"></path><path d="M4 4 20 20"></path></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M13 5h6v6"></path><path d="M11 13 19 5"></path><path d="M17 13v5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18V8A1.5 1.5 0 0 1 5.5 6.5h5"></path></svg>',
    backup: '<svg viewBox="0 0 24 24"><path d="M5 4.5h11l3 3v12H5z"></path><path d="M8 4.5v5h7v-5"></path><rect x="8" y="13" width="8" height="6.5" rx="1"></rect><path d="M12 11v-3"></path><path d="m9.7 9.8 2.3-2.3 2.3 2.3"></path></svg>',
    delete: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15"></path><path d="M9 7V4.5h6V7"></path><path d="m7 7 .8 12h8.4L17 7"></path><path d="M10 10.5v5.5M14 10.5v5.5"></path></svg>',
  };
  return svgs[type] || svgs.local;
}

function item({ type, eyebrow, title, description, body, open = false }) {
  return `<details class="item"${open ? " open" : ""}><summary><span class="icon" aria-hidden="true">${icon(type)}</span><span class="copy"><small>${eyebrow}</small><strong>${title}</strong><span>${description}</span></span><i class="arrow">⌄</i></summary><div class="body">${body}</div></details>`;
}

export function renderPrivacyScreen({ context } = {}) {
  const fromSettings = String(context?.parameters?.get?.("returnTo") || "").startsWith("#/settings");
  return `<div class="screen screen--privacy screen-layout screen-layout--privacy secondary-derived-screen">
    <header class="secondary-derived-head"><a class="secondary-derived-back" href="${fromSettings ? "#/settings?section=data" : "#/more"}">← ${fromSettings ? "設定へ戻る" : "その他へ戻る"}</a><strong>データの扱い</strong><span aria-hidden="true"></span></header>
    <div class="secondary-derived-body">
    <section class="head"><p class="eyebrow">PRIVACY</p><h1>データの扱い</h1><p>何を端末に保存し、いつ外部機能を開くかを確認します。</p></section><p class="visually-hidden">旧版の端末内データは自動移行・自動削除せず、このアプリからは読み込みません。バックアップファイルは、このアプリによるパスワード保護や暗号化を行いません。</p>
    <section class="lead"><strong>記録と保存したGPS走行軌跡は、この端末のブラウザー内で扱う設計です。</strong> GPS測定を開始した場合だけ端末の位置情報を取得します。地図表示ではOpenStreetMapの地図画像を取得しますが、保存したアプリ内の記録を外部解析サービスへ自動送信しません。</section>
    <div class="list">
      ${item({ type: "local", eyebrow: "LOCAL", title: "端末内に保存する", description: "記録・結果・予定・設定・保存コース・GPS走行軌跡", open: true, body: '<p>走行・休養記録、保存済み結果、身体の記録、予定、プロフィール、設定、保存コースに加え、GPS測定で保存を選んだ走行軌跡を同じ端末・同じブラウザーで扱います。</p><p>新アプリでは、公開後に作成した記録だけを扱います。旧アプリ記録の移行・互換表示は行いません。</p>' })}
      ${item({ type: "temporary", eyebrow: "TEMPORARY", title: "入力途中だけ一時保持する", description: "補助画面から戻るための内容", body: '<p>コース、身体記録、シューズなどの補助画面を往復する間だけ、入力途中の内容を一時的に保持します。</p><p>保存完了、入力フロー終了、端末内データ削除などで消去する設計です。</p>' })}
      ${item({ type: "external", eyebrow: "EXTERNAL", title: "GPSと外部通信", description: "GPSは測定時だけ取得・地図画像はOpenStreetMapから取得", body: '<ul><li>GPS測定を開始した場合だけ、ブラウザーの許可を得て端末の位置情報を取得します。</li><li>保存を選んだGPS走行軌跡は端末内へ保存し、このアプリのバックアップ対象に含めます。</li><li>地図表示ではOpenStreetMapの地図タイルを取得するため外部通信が発生します。表示地域に対応する地図画像の要求はOpenStreetMap側へ送られます。</li><li>相談文、保存記録、GPS走行軌跡を外部解析サービスへ自動アップロードしません。</li><li>ルートファイル（GPX）は端末内で読み取ります。</li></ul>' })}
      ${item({ type: "link", eyebrow: "LINK", title: "外部サイト・電話を開くとき", description: "本人が選んだときだけ別機能へ移動", body: '<p>公的案内、参考資料、電話リンクなどを選ぶとこのアプリとは別の機能を開きます。このアプリの端末内記録をリンク先へ自動で付け加えません。</p><p>外部サイトでは、そのサイト側の通信やデータ保存、プライバシー方針が適用されます。</p>' })}
      ${item({ type: "backup", eyebrow: "BACKUP", title: "バックアップは自分で保存する", description: "設定から書き出し・復元を行う", body: '<p>バックアップ操作を選んだ場合だけ、保存データを書き出します。保存済みのGPS走行軌跡もバックアップに含みます。自動で外部サービスへ送信しません。</p><p>バックアップファイルの内容・復元範囲を設定画面で確認してから実行できます。</p>' })}
      ${item({ type: "delete", eyebrow: "DELETE", title: "端末内データを削除する", description: "アプリ内保存データをまとめて消去", body: '<p>アプリ内の削除操作では、このアプリがこのブラウザーに保存した記録・結果・予定・プロフィール・設定・保存コース・GPS走行軌跡などを削除します。</p><p>すでに端末へ書き出したバックアップファイルは、このアプリ側の削除では消えません。</p>' })}
    </div>
    <p class="warning">この画面は現在のアプリ設計上の保存・通信境界を説明するものです。医療情報管理制度への適合や法的評価を示すものではありません。</p>
    ${fromSettings ? "" : '<div class="actions"><a href="#/settings?section=data"><span>バックアップ・削除の設定へ</span><span>›</span></a></div>'}
    </div>
  </div>`;
}
