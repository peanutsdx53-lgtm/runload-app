function numberValue(form, name) {
  const value = Number(new FormData(form).get(name));
  return Number.isFinite(value) ? value : 0;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatPace(secondsPerKm) {
  const rounded = Math.max(0, Math.round(Number(secondsPerKm) || 0));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function splitInterval(distanceKm) {
  if (distanceKm <= 15) return 1;
  if (distanceKm <= 30) return 2;
  return 5;
}

function splitPoints(distanceKm) {
  const interval = splitInterval(distanceKm);
  const points = [];
  for (let point = interval; point < distanceKm - 1e-9; point += interval) points.push(point);
  points.push(distanceKm);
  return points;
}

function setStatus(root, message = "", state = "") {
  const status = root.querySelector("[data-mobile-pace-status]");
  if (!status) return;
  status.textContent = message;
  if (state) status.dataset.state = state;
  else delete status.dataset.state;
}

function calculate(root, form) {
  const distanceKm = numberValue(form, "distance");
  const hours = numberValue(form, "hours");
  const minutes = numberValue(form, "minutes");
  const seconds = numberValue(form, "seconds");
  const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

  if (!(distanceKm > 0) || distanceKm > 100) {
    setStatus(root, "距離は0.1〜100kmで入力してください。", "error");
    return;
  }
  if (!(totalSeconds > 0) || totalSeconds > 24 * 3600) {
    setStatus(root, "目標時間を入力してください。", "error");
    return;
  }

  const secondsPerKm = totalSeconds / distanceKm;
  const speedKmh = distanceKm / (totalSeconds / 3600);
  const average = root.querySelector("[data-mobile-pace-average]");
  const speed = root.querySelector("[data-mobile-pace-speed]");
  const splits = root.querySelector("[data-mobile-pace-splits]");
  const result = root.querySelector("[data-mobile-pace-result]");
  if (!average || !speed || !splits || !result) return;

  average.textContent = formatPace(secondsPerKm);
  speed.textContent = speedKmh.toFixed(1);
  splits.innerHTML = splitPoints(distanceKm).map((point) => {
    const isFinish = Math.abs(point - distanceKm) < 1e-9;
    const label = isFinish ? `${Number(distanceKm.toFixed(3))} km` : `${Number(point.toFixed(1))} km`;
    const cumulative = totalSeconds * (point / distanceKm);
    return `<div class="mobile-pace-split-row"><span>${label}</span><strong>${formatDuration(cumulative)}</strong>${isFinish ? '<small>ゴール</small>' : ""}</div>`;
  }).join("");
  result.hidden = false;
  setStatus(root, "換算しました。", "success");
  result.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

export function bindMobilePaceCalculator() {
  const root = document.querySelector("[data-mobile-pace-tool]");
  if (!root) return null;
  const form = root.querySelector("[data-mobile-pace-form]");
  if (!form) return null;

  const handleClick = (event) => {
    const preset = event.target.closest("[data-pace-distance]");
    if (!preset) return;
    const input = form.elements.distance;
    if (!input) return;
    input.value = preset.dataset.paceDistance || "5";
    input.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    calculate(root, form);
  };

  root.addEventListener("click", handleClick);
  form.addEventListener("submit", handleSubmit);

  return () => {
    root.removeEventListener("click", handleClick);
    form.removeEventListener("submit", handleSubmit);
  };
}
