import { addMobileQuickToolEntry, removeMobileQuickToolEntry } from "../mobileQuickToolsStore.js";

function setFormStatus(root, message, state = "") {
  const status = root.querySelector("[data-mobile-tool-form-status]");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function locationErrorMessage(error) {
  if (error?.code === 1) return "位置情報の利用が許可されていません。端末の設定を確認してください。";
  if (error?.code === 2) return "現在地を取得できませんでした。場所を変えて再度お試しください。";
  if (error?.code === 3) return "位置情報の取得がタイムアウトしました。もう一度お試しください。";
  return "現在地を取得できませんでした。";
}

function bindLocationCapture(root) {
  const button = root.querySelector("[data-mobile-location-capture]");
  const status = root.querySelector("[data-mobile-location-status]");
  const form = root.querySelector('[data-mobile-tool-form="location"]');
  if (!button || !status || !form) return () => {};

  const handleCapture = () => {
    if (!globalThis.navigator?.geolocation) {
      status.textContent = "この端末では位置情報を利用できません。";
      status.dataset.state = "error";
      return;
    }
    button.disabled = true;
    status.textContent = "現在地を取得しています…";
    status.dataset.state = "loading";
    globalThis.navigator.geolocation.getCurrentPosition((position) => {
      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);
      const accuracy = Number(position.coords.accuracy || 0);
      form.elements.latitude.value = String(latitude);
      form.elements.longitude.value = String(longitude);
      form.elements.accuracy.value = String(accuracy);
      status.textContent = `取得しました（精度 約${Math.max(1, Math.round(accuracy))}m）`;
      status.dataset.state = "success";
      button.disabled = false;
    }, (error) => {
      status.textContent = locationErrorMessage(error);
      status.dataset.state = "error";
      button.disabled = false;
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 15000,
    });
  };

  button.addEventListener("click", handleCapture);
  return () => button.removeEventListener("click", handleCapture);
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function saveLocation(form, root) {
  const values = formValues(form);
  const latitude = Number(values.latitude);
  const longitude = Number(values.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    setFormStatus(root, "先に「現在地を取得」を押してください。", "error");
    return false;
  }
  const entry = addMobileQuickToolEntry("location", {
    latitude,
    longitude,
    accuracy: Number(values.accuracy) || 0,
    category: String(values.category || "地点").trim(),
    note: String(values.note || "").trim(),
  });
  if (!entry) {
    setFormStatus(root, "保存できませんでした。端末の保存領域を確認してください。", "error");
    return false;
  }
  return true;
}

function saveQuick(form, root) {
  const values = formValues(form);
  const payload = {
    good: String(values.good || "").trim(),
    notice: String(values.notice || "").trim(),
    next: String(values.next || "").trim(),
  };
  if (!payload.good && !payload.notice && !payload.next) {
    setFormStatus(root, "いずれか1項目を入力してください。", "error");
    return false;
  }
  if (!addMobileQuickToolEntry("quick", payload)) {
    setFormStatus(root, "保存できませんでした。端末の保存領域を確認してください。", "error");
    return false;
  }
  return true;
}

function saveGear(form, root) {
  const values = formValues(form);
  const payload = {
    shoes: String(values.shoes || "").trim(),
    gear: String(values.gear || "").trim(),
    note: String(values.note || "").trim(),
  };
  if (!payload.shoes && !payload.gear && !payload.note) {
    setFormStatus(root, "装備またはメモを入力してください。", "error");
    return false;
  }
  if (!addMobileQuickToolEntry("gear", payload)) {
    setFormStatus(root, "保存できませんでした。端末の保存領域を確認してください。", "error");
    return false;
  }
  return true;
}

function saveDeparture(form, root) {
  const data = new FormData(form);
  const checks = data.getAll("checks").map((value) => String(value || "").trim()).filter(Boolean);
  const note = String(data.get("note") || "").trim();
  if (!checks.length && !note) {
    setFormStatus(root, "確認項目を選ぶか、メモを入力してください。", "error");
    return false;
  }
  if (!addMobileQuickToolEntry("departure", { checks, note })) {
    setFormStatus(root, "保存できませんでした。端末の保存領域を確認してください。", "error");
    return false;
  }
  return true;
}

function saveFuel(form, root) {
  const values = formValues(form);
  const payload = { kind: String(values.kind || "水分").trim(), amount: String(values.amount || "").trim(), note: String(values.note || "").trim() };
  if (!payload.amount && !payload.note) {
    setFormStatus(root, "量・内容またはメモを入力してください。", "error");
    return false;
  }
  if (!addMobileQuickToolEntry("fuel", payload)) {
    setFormStatus(root, "保存できませんでした。端末の保存領域を確認してください。", "error");
    return false;
  }
  return true;
}

export function bindMobileQuickTool(context = {}) {
  const root = document.querySelector("[data-mobile-tool]");
  if (!root) return null;
  const form = root.querySelector("[data-mobile-tool-form]");
  const cleanupLocation = bindLocationCapture(root);

  const handleSubmit = (event) => {
    if (!form || event.target !== form) return;
    event.preventDefault();
    const tool = String(form.dataset.mobileToolForm || "");
    const saved = tool === "location"
      ? saveLocation(form, root)
      : tool === "quick"
        ? saveQuick(form, root)
        : tool === "gear"
          ? saveGear(form, root)
          : tool === "departure"
            ? saveDeparture(form, root)
            : tool === "fuel"
              ? saveFuel(form, root)
              : false;
    if (!saved) return;
    context.rerender?.();
  };

  const handleClick = (event) => {
    const remove = event.target.closest("[data-mobile-tool-delete]");
    if (!remove) return;
    event.preventDefault();
    const tool = remove.dataset.mobileToolDeleteKind || "";
    const id = remove.dataset.mobileToolDelete || "";
    if (removeMobileQuickToolEntry(tool, id)) context.rerender?.();
  };

  root.addEventListener("submit", handleSubmit);
  root.addEventListener("click", handleClick);

  return () => {
    cleanupLocation();
    root.removeEventListener("submit", handleSubmit);
    root.removeEventListener("click", handleClick);
  };
}
