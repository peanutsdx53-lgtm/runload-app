import { normalizeBodyProfile, STORAGE_KEYS } from "../../core/appCore.js";

import { DEFAULT_APP_SETTINGS, applyAppSettings, mergeAppSettings } from "../appSettings.js";
import { createRunMeasurementNotifier } from "../runMeasurementNotifications.js";
import { downloadJsonText } from "./browserUtilities.js";
import { showDataMessage, showFormMessages } from "./formUtilities.js";
import { clearRecordInputWorkspace } from "../recordInputWorkspace.js";
import { renderRestoreInspection } from "../restorePreviewPresentation.js";

function readSettingsForm(form) {
  const data = new FormData(form);
  const values = {
    appearanceMode: String(data.get("appearanceMode") || "system"),
    colorTheme: String(data.get("colorTheme") || "standard"),
    textSize: String(data.get("textSize") || "standard"),
    regionalResultInitialView: String(data.get("regionalResultInitialView") || "all"),
    showRegionalPreviousComparison: String(data.get("showRegionalPreviousComparison") || "show") === "show",
  };
  if (form.elements.namedItem("measurementSoundEnabled")) values.measurementSoundEnabled = data.has("measurementSoundEnabled");
  if (form.elements.namedItem("measurementVibrationEnabled")) values.measurementVibrationEnabled = data.has("measurementVibrationEnabled");
  return values;
}

function readProfileForm(form) {
  const data = new FormData(form);
  return {
    sex: String(data.get("profileSex") || ""),
    ageBand: String(data.get("profileAgeBand") || ""),
    heightCm: String(data.get("profileHeightCm") || ""),
    weightKg: String(data.get("profileWeightKg") || ""),
    runningStartDateOrBand: String(data.get("runningStartDateOrBand") || ""),
    experienceSelfAssessment: String(data.get("experienceSelfAssessment") || ""),
    runningGoalTags: data.getAll("runningGoalTags").map(String),
    updatedAt: new Date().toISOString(),
  };
}

function saveSettings(services, settingsUpdate) {
  const current = services.storage.settings.load();
  const next = mergeAppSettings(current, settingsUpdate);
  const result = services.storage.settings.save(next);
  if (!result.ok) return { ...result, settings: next };
  applyAppSettings(next);
  return { ok: true, settings: next };
}

function saveSettingsAndProfile(services, settingsUpdate, profileUpdate) {
  const current = services.storage.settings.load();
  const nextSettings = mergeAppSettings(current, settingsUpdate);
  const nextProfile = normalizeBodyProfile(profileUpdate);
  const result = services.storage.gateway.transact([
    { key: STORAGE_KEYS.settings, value: nextSettings },
    { key: STORAGE_KEYS.profile, value: nextProfile },
  ]);
  if (!result.ok) return result;
  applyAppSettings(nextSettings);
  return { ok: true, settings: nextSettings, profile: nextProfile };
}

// Perform the fallible IndexedDB cleanup first. A rejected photo-store removal
// must not erase the ordinary records kept in localStorage. These two stores
// cannot share one atomic transaction; report a later localStorage failure.
export async function clearAppDataAcrossStores({ services, platformRuntime }) {
  let platformCleared = true;
  try { platformCleared = await platformRuntime?.clearPlatformUserData?.(); }
  catch { platformCleared = false; }
  if (platformCleared === false) return { ok: false, stage: "PLATFORM" };
  const result = services.dataManagement.clearAllUserData();
  if (!result.ok) return { ...result, ok: false, stage: "PRIMARY" };
  return { ok: true };
}

export function bindDataManagement({ services, router, rerender, platformRuntime }) {
  let pendingRestoreInspection = null;
  let pendingRestoreFile = null;
  let restoreInspectionGeneration = 0;
  const previewHost = document.querySelector("[data-restore-preview-host]");
  const fileInput = document.querySelector('[data-action="restore-backup"]');

  function clearRestorePreview() {
    restoreInspectionGeneration += 1;
    pendingRestoreInspection = null;
    pendingRestoreFile = null;
    if (fileInput) fileInput.value = "";
    if (previewHost) {
      previewHost.innerHTML = '<p class="muted-text">ファイルを選ぶと、保存内容と件数を確認してから復元できます。</p>';
    }
  }

  function bindRestorePreviewActions() {
    const confirmButton = previewHost?.querySelector('[data-action="confirm-restore-backup"]');
    const acknowledgement = previewHost?.querySelector("[data-restore-review-ack]");
    acknowledgement?.addEventListener("change", () => {
      if (confirmButton) confirmButton.disabled = !acknowledgement.checked;
    });
    previewHost?.querySelector('[data-action="cancel-restore-preview"]')?.addEventListener("click", clearRestorePreview);
    confirmButton?.addEventListener("click", () => {
      if (!pendingRestoreInspection || pendingRestoreFile !== fileInput?.files?.[0]) {
        showDataMessage("復元前の検査をやり直してください。", "error");
        return;
      }
      const acceptReview = pendingRestoreInspection.requiresAcknowledgement
        ? Boolean(acknowledgement?.checked)
        : true;
      if (!acceptReview) {
        showDataMessage("要確認の内容を確認してください。", "error");
        return;
      }
      if (!window.confirm("現在の端末内データを自動バックアップしてから、この内容を復元しますか？")) return;
      const result = services.storage.backup.restoreInspectedBackup(pendingRestoreInspection, { acceptReview });
      if (result.ok) {
        clearRecordInputWorkspace();
        rerender();
        showDataMessage("バックアップを復元しました。復元前の端末内データは自動バックアップとして残しています。");
      } else {
        showDataMessage(result.message || "復元できませんでした。", "error");
      }
    });
  }

  document.querySelector('[data-action="export-backup"]')?.addEventListener("click", () => {
    const exported = services.storage.backup.tryExportBackupText();
    if (!exported.ok) {
      showDataMessage(exported.message || "バックアップファイルを作成できませんでした。", "error");
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadJsonText(`running-record-backup-${date}.json`, exported.text);
    showDataMessage("バックアップファイルを作成しました。");
  });
  fileInput?.addEventListener("change", async (event) => {
    // Every new selection invalidates the previous approval immediately. File
    // reading is asynchronous and may complete out of selection order.
    const generation = ++restoreInspectionGeneration;
    pendingRestoreInspection = null;
    pendingRestoreFile = null;
    const file = event.target.files?.[0];
    if (!file) { clearRestorePreview(); return; }
    if (previewHost) previewHost.textContent = "バックアップを検査しています。";
    let inspection;
    try {
      inspection = await services.storage.backup.inspectBackupFile(file);
    } catch {
      if (generation === restoreInspectionGeneration && fileInput?.files?.[0] === file) {
        showDataMessage("バックアップの検査に失敗しました。別のファイルを選択してください。", "error");
      }
      return;
    }
    if (generation !== restoreInspectionGeneration || fileInput?.files?.[0] !== file) return;
    pendingRestoreInspection = inspection.canRestore ? inspection : null;
    pendingRestoreFile = inspection.canRestore ? file : null;
    if (previewHost) {
      previewHost.innerHTML = renderRestoreInspection(inspection, file.name);
      previewHost.querySelector("[tabindex]")?.focus();
      bindRestorePreviewActions();
    }
    showDataMessage(
      inspection.status === "SUPPORTED"
        ? "復元前の検査が完了しました。内容を確認して復元してください。"
        : inspection.status === "REVIEW_REQUIRED"
          ? "要確認の内容があります。内容を読んでから復元してください。"
          : "このバックアップは復元できません。検査結果を確認してください。",
      inspection.canRestore ? "success" : "error",
    );
  });
  document.querySelector('[data-action="clear-all-user-data"]')?.addEventListener("click", async () => {
    const confirmation = document.getElementById("clear-data-confirmation")?.value || "";
    if (confirmation !== "削除") {
      showDataMessage("確認欄へ「削除」と入力してください。", "error");
      return;
    }
    if (!window.confirm("このアプリの端末内データをすべて削除しますか？")) return;
    const result = await clearAppDataAcrossStores({ services, platformRuntime });
    if (!result.ok) {
      showDataMessage(
        result.stage === "PLATFORM"
          ? "写真などの保存領域を削除できませんでした。通常の記録は削除していません。"
          : "写真などの保存領域を削除した後、通常の記録を削除できませんでした。端末内データを確認してください。",
        "error",
      );
      return;
    }
    clearRecordInputWorkspace();
    router.navigateToScreen("home");
  });
}
function bindSavedShoeManagement({ services, router }) {
  document.querySelectorAll('[data-action="remove-saved-shoe"]').forEach((button) => {
    button.addEventListener("click", () => {
      const shoeId = String(button.dataset.shoeId || "");
      if (!shoeId) return;
      if (!window.confirm("この保存シューズを候補から削除しますか？過去記録は変更されません。")) return;
      const current = services.storage.settings.load();
      const savedShoes = (Array.isArray(current.savedShoes) ? current.savedShoes : [])
        .filter((item) => String(item?.id || "") !== shoeId);
      const result = services.storage.settings.save({ ...current, savedShoes });
      if (!result.ok) {
        window.alert("保存シューズを削除できませんでした。端末の保存状態を確認してください。");
        return;
      }
      router.navigateToScreen("settings", { status: "saved" });
    });
  });
}

function bindImmediateDisplaySettings({ services, form }) {
  const supported = new Set(["textSize", "appearanceMode", "colorTheme"]);
  form?.querySelectorAll("[data-immediate-display-setting]").forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked || !supported.has(input.name)) return;
      const result = saveSettings(services, { [input.name]: input.value });
      if (!result.ok) {
        showFormMessages(form, ["表示設定を保存できませんでした。端末の保存状態を確認してください。"]);
        return;
      }
      const current = form.querySelector(`[data-display-setting-value="${input.name}"]`);
      if (current) current.textContent = input.dataset.settingLabel || input.value;
      const status = form.querySelector("[data-display-settings-status]");
      if (status) status.textContent = `${input.dataset.settingLabel || "表示設定"}に変更しました。`;
      const disclosure = input.closest("details.display-setting");
      if (disclosure) disclosure.open = false;
    });
  });
}

function bindMeasurementNotificationSettings({ services, form }) {
  const status = form?.querySelector("[data-measurement-notification-status]");
  const soundControl = form?.elements?.namedItem?.("measurementSoundEnabled");
  const vibrationControl = form?.elements?.namedItem?.("measurementVibrationEnabled");
  if (!soundControl && !vibrationControl) return;

  const announce = (message) => { if (status) status.textContent = message; };

  form.querySelectorAll("[data-immediate-measurement-setting]").forEach((input) => {
    input.addEventListener("change", () => {
      const result = saveSettings(services, { [input.name]: input.checked });
      if (!result.ok) {
        input.checked = !input.checked;
        announce("測定通知の設定を保存できませんでした。");
        return;
      }
      announce(`${input.name === "measurementSoundEnabled" ? "通知音" : "振動"}を${input.checked ? "オン" : "オフ"}にしました。`);
    });
  });

  form.querySelector('[data-action="test-measurement-sound"]')?.addEventListener("click", async () => {
    if (!soundControl?.checked) {
      announce("通知音をオンにすると試せます。");
      return;
    }
    const notifier = createRunMeasurementNotifier(window, { measurementSoundEnabled: true, measurementVibrationEnabled: false });
    const ready = await notifier.prepare();
    if (!ready.soundReady) {
      announce("この端末では通知音を再生できませんでした。");
      await notifier.close();
      return;
    }
    notifier.previewSound();
    announce("通知音を再生しました。");
    window.setTimeout(() => notifier.close(), 700);
  });

  form.querySelector('[data-action="test-measurement-vibration"]')?.addEventListener("click", () => {
    if (!vibrationControl?.checked) {
      announce("振動をオンにすると試せます。");
      return;
    }
    const notifier = createRunMeasurementNotifier(window, { measurementSoundEnabled: false, measurementVibrationEnabled: true });
    const vibrated = notifier.previewVibration();
    announce(vibrated ? "振動を実行しました。" : "この端末では振動を利用できません。");
  });
}

export function bindSettings({ services, router, rerender, platformRuntime }) {
  const form = document.getElementById("app-settings-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = saveSettingsAndProfile(services, readSettingsForm(form), readProfileForm(form));
    if (!result.ok) {
      showFormMessages(form, ["表示とプロフィールを保存できませんでした。端末の空き容量とブラウザーの保存許可を確認してください。"]);
      return;
    }
    router.navigateToScreen("settings", { status: "saved" });
  });
  bindImmediateDisplaySettings({ services, form });
  bindMeasurementNotificationSettings({ services, form });
  form?.querySelector('[data-action="reset-app-settings"]')?.addEventListener("click", () => {
    const result = saveSettings(services, DEFAULT_APP_SETTINGS);
    if (!result.ok) {
      showFormMessages(form, ["標準設定を保存できませんでした。端末の保存状態を確認してください。"]);
      return;
    }
    router.navigateToScreen("settings", { status: "saved" });
  });
  document.querySelector('[data-action="reopen-onboarding"]')?.addEventListener("click", () => {
    router.navigateToScreen("home", { onboarding: "1" });
  });
  bindSavedShoeManagement({ services, router });
  bindDataManagement({ services, router, rerender, platformRuntime });
}