import { escapeHtml } from "../commonComponents.js";
import {
  PHOTO_MEMO_MAX_BYTES,
  PHOTO_MEMO_MAX_COUNT,
  PHOTO_MEMO_MAX_DIMENSION,
  deletePhotoMemo,
  listPhotoMemos,
  savePhotoMemo,
} from "../mobilePhotoMemoStore.js";

const MAX_SOURCE_BYTES = 25_000_000;
const JPEG_QUALITIES = Object.freeze([0.82, 0.72, 0.62, 0.52, 0.44]);

function formatTimestamp(value = "") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1_000_000) return `${Math.max(1, Math.round(value / 1000))}KB`;
  return `${Math.round((value / 1_000_000) * 10) / 10}MB`;
}

function setStatus(root, message = "", state = "") {
  const status = root.querySelector("[data-mobile-photo-memo-status]");
  if (!status) return;
  status.textContent = message;
  if (state) status.dataset.state = state;
  else delete status.dataset.state;
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("IMAGE_ENCODE_FAILED"));
    }, "image/jpeg", quality);
  });
}

async function loadImageSource(file) {
  if (typeof globalThis.createImageBitmap === "function") {
    try {
      const bitmap = await globalThis.createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close?.() };
    } catch {
      try {
        const bitmap = await globalThis.createImageBitmap(file);
        return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close?.() };
      } catch {
        // Fall through to HTMLImageElement for browsers with partial createImageBitmap support.
      }
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("IMAGE_DECODE_FAILED"));
    };
    image.src = url;
  });
}

async function preparePhoto(file) {
  if (!(file instanceof Blob) || !String(file.type || "").startsWith("image/")) throw new Error("IMAGE_REQUIRED");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("SOURCE_TOO_LARGE");

  const decoded = await loadImageSource(file);
  try {
    const width = Number(decoded.width) || 0;
    const height = Number(decoded.height) || 0;
    if (!(width > 0) || !(height > 0)) throw new Error("IMAGE_DECODE_FAILED");

    const scale = Math.min(1, PHOTO_MEMO_MAX_DIMENSION / Math.max(width, height));
    const outputWidth = Math.max(1, Math.round(width * scale));
    const outputHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("IMAGE_ENCODE_FAILED");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, outputWidth, outputHeight);
    context.drawImage(decoded.source, 0, 0, outputWidth, outputHeight);

    let blob = null;
    for (const quality of JPEG_QUALITIES) {
      const candidate = await canvasBlob(canvas, quality);
      blob = candidate;
      if (candidate.size <= PHOTO_MEMO_MAX_BYTES) break;
    }
    canvas.width = 0;
    canvas.height = 0;
    if (!blob || blob.size > PHOTO_MEMO_MAX_BYTES) throw new Error("COMPRESSED_TOO_LARGE");
    return { blob, width: outputWidth, height: outputHeight };
  } finally {
    decoded.cleanup?.();
  }
}

async function displayBlobForEntry(entry) {
  const blob = entry?.blob;
  if (!(blob instanceof Blob) || !blob.size) return null;
  const mimeType = String(blob.type || entry?.mimeType || "").toLowerCase();
  if (["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return blob;
  try {
    return (await preparePhoto(blob)).blob;
  } catch {
    return blob;
  }
}

function ensureViewer(root) {
  let viewer = root.querySelector("[data-mobile-photo-memo-viewer]");
  if (viewer) return viewer;
  viewer = document.createElement("div");
  viewer.className = "mobile-photo-memo-viewer";
  viewer.dataset.mobilePhotoMemoViewer = "";
  viewer.hidden = true;
  viewer.innerHTML = `
    <button type="button" class="mobile-photo-memo-viewer__backdrop" data-mobile-photo-memo-viewer-close aria-label="写真メモを閉じる"></button>
    <section class="mobile-photo-memo-viewer__panel" role="dialog" aria-modal="true" aria-label="写真メモ">
      <header><strong>写真メモ</strong><button type="button" data-mobile-photo-memo-viewer-close>閉じる</button></header>
      <div class="mobile-photo-memo-viewer__media" data-mobile-photo-memo-viewer-media>
        <img alt="保存した写真" data-mobile-photo-memo-viewer-image>
        <span>画像を表示できません</span>
      </div>
      <div class="mobile-photo-memo-viewer__meta">
        <small data-mobile-photo-memo-viewer-date></small>
        <p data-mobile-photo-memo-viewer-note hidden></p>
        <span data-mobile-photo-memo-viewer-size></span>
      </div>
    </section>`;
  root.append(viewer);
  return viewer;
}

function saveFailureMessage(reason) {
  if (reason === "limit") return `写真メモは最大${PHOTO_MEMO_MAX_COUNT}件です。不要な写真を削除してから保存してください。`;
  if (reason === "quota") return "端末の保存領域が不足しているため保存できませんでした。";
  if (reason === "size") return "写真を保存サイズまで小さくできませんでした。別の写真を選んでください。";
  return "この端末では写真を保存できませんでした。";
}

function prepareFailureMessage(error) {
  if (error?.message === "SOURCE_TOO_LARGE") return "元の写真が大きすぎます。25MB以下の写真を選んでください。";
  if (error?.message === "IMAGE_REQUIRED") return "画像ファイルを選んでください。";
  if (error?.message === "COMPRESSED_TOO_LARGE") return "写真を保存サイズまで小さくできませんでした。別の写真を選んでください。";
  return "写真を読み込めませんでした。別の写真を選んでください。";
}

export function bindMobilePhotoMemo(context = {}) {
  const root = document.querySelector("[data-mobile-photo-memo]");
  if (!root) return null;
  const form = root.querySelector("[data-mobile-photo-memo-form]");
  const fileInput = root.querySelector("[data-mobile-photo-memo-file]");
  const saveButton = root.querySelector("[data-mobile-photo-memo-save]");
  const preview = root.querySelector("[data-mobile-photo-memo-preview]");
  const previewImage = root.querySelector("[data-mobile-photo-memo-preview-image]");
  const previewName = root.querySelector("[data-mobile-photo-memo-preview-name]");
  const previewSize = root.querySelector("[data-mobile-photo-memo-preview-size]");
  const history = root.querySelector("[data-mobile-photo-memo-history]");
  if (!form || !fileInput || !saveButton || !preview || !previewImage || !history) return null;

  let prepared = null;
  let previewUrl = "";
  let historyUrls = [];
  let viewerUrl = "";
  let currentEntries = [];
  let preparing = false;
  const viewer = ensureViewer(root);

  const revokePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  };

  const revokeHistoryUrls = () => {
    historyUrls.forEach((url) => URL.revokeObjectURL(url));
    historyUrls = [];
  };

  const revokeViewerUrl = () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    viewerUrl = "";
  };

  const closeViewer = () => {
    viewer.hidden = true;
    viewer.querySelector("[data-mobile-photo-memo-viewer-image]")?.removeAttribute("src");
    revokeViewerUrl();
    document.body.classList.remove("mobile-photo-memo-viewer-open");
  };

  const renderHistory = async () => {
    revokeHistoryUrls();
    try {
      const entries = await listPhotoMemos();
      currentEntries = entries;
      if (!entries.length) {
        history.innerHTML = '<p class="mobile-tool-history__empty">保存した写真メモはまだありません。</p>';
        return;
      }
      const displayEntries = await Promise.all(entries.map(async (entry) => {
        const blob = await displayBlobForEntry(entry);
        const url = blob ? URL.createObjectURL(blob) : "";
        if (url) historyUrls.push(url);
        return { entry, url };
      }));
      history.innerHTML = displayEntries.map(({ entry, url }) => {
        const noteMarkup = entry.note ? `<strong>${escapeHtml(entry.note)}</strong>` : "";
        const imageMarkup = url ? `<img src="${url}" alt="" data-mobile-photo-memo-thumb>` : "";
        return `<article class="mobile-photo-memo-history__item"><button type="button" class="mobile-photo-memo-history__open" data-mobile-photo-memo-open="${escapeHtml(entry.id)}" aria-label="写真メモを表示"><span class="mobile-photo-memo-history__image"><span>画像</span>${imageMarkup}</span><span class="mobile-photo-memo-history__copy"><small>${escapeHtml(formatTimestamp(entry.createdAt))}</small>${noteMarkup}<span>${escapeHtml(formatBytes(entry.byteSize))}</span></span><span class="mobile-photo-memo-history__chevron" aria-hidden="true">›</span></button><button type="button" class="mobile-tool-history__delete" data-mobile-photo-memo-delete="${escapeHtml(entry.id)}">削除</button></article>`;
      }).join("");
      history.querySelectorAll("[data-mobile-photo-memo-thumb]").forEach((image) => {
        image.addEventListener("error", () => image.closest(".mobile-photo-memo-history__image")?.classList.add("is-image-error"), { once: true });
      });
    } catch {
      currentEntries = [];
      history.innerHTML = '<p class="mobile-tool-history__empty">この端末では保存した写真を読み込めません。</p>';
    }
  };

  const openViewer = async (id) => {
    const entry = currentEntries.find((item) => String(item.id) === String(id));
    if (!entry) return;
    const image = viewer.querySelector("[data-mobile-photo-memo-viewer-image]");
    const media = viewer.querySelector("[data-mobile-photo-memo-viewer-media]");
    const date = viewer.querySelector("[data-mobile-photo-memo-viewer-date]");
    const note = viewer.querySelector("[data-mobile-photo-memo-viewer-note]");
    const size = viewer.querySelector("[data-mobile-photo-memo-viewer-size]");
    if (!image || !media || !date || !note || !size) return;

    revokeViewerUrl();
    media.classList.remove("is-image-error");
    const blob = await displayBlobForEntry(entry);
    if (blob) {
      viewerUrl = URL.createObjectURL(blob);
      image.src = viewerUrl;
      image.onerror = () => media.classList.add("is-image-error");
    } else {
      image.removeAttribute("src");
      media.classList.add("is-image-error");
    }
    date.textContent = formatTimestamp(entry.createdAt);
    note.textContent = String(entry.note || "").trim();
    note.hidden = !note.textContent;
    size.textContent = formatBytes(entry.byteSize);
    viewer.hidden = false;
    document.body.classList.add("mobile-photo-memo-viewer-open");
    viewer.querySelector("[data-mobile-photo-memo-viewer-close]:not(.mobile-photo-memo-viewer__backdrop)")?.focus();
  };

  const handleFileChange = async () => {
    const file = fileInput.files?.[0] || null;
    prepared = null;
    revokePreview();
    preview.hidden = true;
    saveButton.disabled = true;
    if (!file) {
      setStatus(root, "");
      return;
    }
    preparing = true;
    setStatus(root, "写真を保存用に調整しています。");
    try {
      prepared = await preparePhoto(file);
      previewUrl = URL.createObjectURL(prepared.blob);
      previewImage.src = previewUrl;
      if (previewName) previewName.textContent = file.name || "選択した写真";
      if (previewSize) previewSize.textContent = `${prepared.width}×${prepared.height}px ・ ${formatBytes(prepared.blob.size)}`;
      preview.hidden = false;
      saveButton.disabled = false;
      setStatus(root, "保存できます。", "success");
    } catch (error) {
      setStatus(root, prepareFailureMessage(error), "error");
    } finally {
      preparing = false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (preparing || !prepared) {
      setStatus(root, "写真を選んでください。", "error");
      return;
    }
    saveButton.disabled = true;
    setStatus(root, "保存しています。");
    const note = String(new FormData(form).get("note") || "").trim();
    const result = await savePhotoMemo({ ...prepared, note });
    if (!result.ok) {
      saveButton.disabled = false;
      setStatus(root, saveFailureMessage(result.reason), "error");
      return;
    }
    setStatus(root, "写真メモを保存しました。", "success");
    if (typeof context.rerender === "function") context.rerender();
    else await renderHistory();
  };

  const handleClick = async (event) => {
    const close = event.target.closest("[data-mobile-photo-memo-viewer-close]");
    if (close) {
      event.preventDefault();
      closeViewer();
      return;
    }

    const open = event.target.closest("[data-mobile-photo-memo-open]");
    if (open) {
      event.preventDefault();
      await openViewer(open.dataset.mobilePhotoMemoOpen);
      return;
    }

    const button = event.target.closest("[data-mobile-photo-memo-delete]");
    if (!button) return;
    event.preventDefault();
    const confirmed = typeof globalThis.confirm === "function"
      ? globalThis.confirm("この写真メモを削除しますか？")
      : false;
    if (!confirmed) return;
    button.disabled = true;
    const deleted = await deletePhotoMemo(button.dataset.mobilePhotoMemoDelete);
    if (!deleted) {
      button.disabled = false;
      setStatus(root, "写真メモを削除できませんでした。", "error");
      return;
    }
    if (typeof context.rerender === "function") context.rerender();
    else await renderHistory();
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape" && !viewer.hidden) closeViewer();
  };

  fileInput.addEventListener("change", handleFileChange);
  form.addEventListener("submit", handleSubmit);
  root.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
  renderHistory();

  return () => {
    fileInput.removeEventListener("change", handleFileChange);
    form.removeEventListener("submit", handleSubmit);
    root.removeEventListener("click", handleClick);
    document.removeEventListener("keydown", handleKeydown);
    revokePreview();
    revokeHistoryUrls();
    closeViewer();
  };
}
