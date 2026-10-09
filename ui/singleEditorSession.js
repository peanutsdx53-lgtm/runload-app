// Only one active app document may initialize the editable app at a time.
// Web Locks is origin-scoped and exclusive; localStorage check/set is not atomic.
export const EDITOR_LOCK_NAME = "runload-active-editor-v1";

export async function acquireSingleEditorSession(lockManager = globalThis.navigator?.locks) {
  if (!lockManager || typeof lockManager.request !== "function") {
    return { ok: false, reason: "unsupported" };
  }

  let completeAcquisition;
  const acquired = new Promise((resolve) => { completeAcquisition = resolve; });
  let settled = false;
  const settle = (result) => {
    if (settled) return;
    settled = true;
    completeAcquisition(result);
  };

  try {
    // Do not await this promise: it remains pending for the whole editor session.
    const request = lockManager.request(EDITOR_LOCK_NAME, {
      mode: "exclusive",
      ifAvailable: true,
    }, (lock) => {
      if (!lock) {
        settle({ ok: false, reason: "in-use" });
        return;
      }
      return new Promise((releaseLock) => {
        let released = false;
        settle({
          ok: true,
          release() {
            if (released) return;
            released = true;
            releaseLock();
          },
        });
      });
    });
    Promise.resolve(request).catch(() => settle({ ok: false, reason: "unavailable" }));
  } catch {
    settle({ ok: false, reason: "unavailable" });
  }
  return acquired;
}

export function renderEditorSessionBlocked(result, root = document.getElementById("app")) {
  if (!root) return;
  const title = document.createElement("h1");
  title.textContent = result.reason === "in-use"
    ? "別のタブでアプリを使用中です"
    : "編集の安全確認ができません";
  const detail = document.createElement("p");
  detail.textContent = result.reason === "in-use"
    ? "記録の競合を防ぐため、このタブでは編集できません。先に開いているタブを閉じてから、再読み込みしてください。"
    : "この環境では同時編集を防止できません。対応ブラウザーでHTTPSまたはlocalhostから開いてください。記録データは変更していません。";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "再読み込み";
  retry.addEventListener("click", () => globalThis.location.reload());
  const section = document.createElement("section");
  section.className = "app-session-guard";
  section.setAttribute("role", "status");
  const inner = document.createElement("div");
  inner.className = "app-session-guard__inner";
  inner.append(title, detail, retry);
  section.append(inner);
  root.replaceChildren(section);
}
