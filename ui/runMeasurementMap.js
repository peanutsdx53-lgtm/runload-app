const TILE_SIZE = 256;
const MIN_ZOOM = 14;
const MAX_ZOOM = 18;
const MAX_LAT = 85.05112878;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function worldPixel(lat, lon, zoom) {
  const safeLat = clamp(lat, -MAX_LAT, MAX_LAT);
  const scale = 2 ** zoom;
  const x = (Number(lon) + 180) / 360 * scale * TILE_SIZE;
  const sinLat = Math.sin(safeLat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale * TILE_SIZE;
  return { x, y };
}

function tileUrl(zoom, x, y) {
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

function createElement(name, className = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  return element;
}

export function createRunMeasurementMap(container, { initialZoom = 16 } = {}) {
  if (!(container instanceof HTMLElement)) return null;

  container.replaceChildren();
  container.classList.add("run-map");
  const tileLayer = createElement("div", "run-map__tiles");
  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.setAttribute("class", "run-map__overlay");
  overlay.setAttribute("aria-hidden", "true");
  const routeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  marker.setAttribute("class", "run-map__marker");
  marker.setAttribute("r", "7");
  routeGroup.append(marker);
  overlay.append(routeGroup);

  const attribution = createElement("div", "run-map__attribution");
  attribution.innerHTML = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>';
  container.append(tileLayer, overlay, attribution);

  const tileNodes = new Map();
  let zoom = clamp(initialZoom, MIN_ZOOM, MAX_ZOOM);
  let center = null;
  let track = [];

  function dimensions() {
    return {
      width: Math.max(1, container.clientWidth || 320),
      height: Math.max(1, container.clientHeight || 360),
    };
  }

  function renderTiles() {
    if (!center) return;
    const { width, height } = dimensions();
    const centerPixel = worldPixel(center.lat, center.lon, zoom);
    const left = centerPixel.x - width / 2;
    const top = centerPixel.y - height / 2;
    const firstX = Math.floor(left / TILE_SIZE) - 1;
    const lastX = Math.floor((left + width) / TILE_SIZE) + 1;
    const firstY = Math.floor(top / TILE_SIZE) - 1;
    const lastY = Math.floor((top + height) / TILE_SIZE) + 1;
    const maxTile = 2 ** zoom;
    const active = new Set();

    for (let rawX = firstX; rawX <= lastX; rawX += 1) {
      for (let y = firstY; y <= lastY; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        const x = ((rawX % maxTile) + maxTile) % maxTile;
        const key = `${zoom}/${rawX}/${y}`;
        active.add(key);
        let image = tileNodes.get(key);
        if (!image) {
          image = createElement("img", "run-map__tile");
          image.alt = "";
          image.draggable = false;
          image.decoding = "async";
          image.src = tileUrl(zoom, x, y);
          tileNodes.set(key, image);
          tileLayer.append(image);
        }
        image.style.transform = `translate(${rawX * TILE_SIZE - left}px, ${y * TILE_SIZE - top}px)`;
      }
    }

    for (const [key, node] of tileNodes) {
      if (active.has(key)) continue;
      node.remove();
      tileNodes.delete(key);
    }
  }

  function renderOverlay() {
    if (!center) return;
    const { width, height } = dimensions();
    overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const centerPixel = worldPixel(center.lat, center.lon, zoom);
    const project = (point) => {
      const pixel = worldPixel(point.lat, point.lon, zoom);
      return {
        x: pixel.x - centerPixel.x + width / 2,
        y: pixel.y - centerPixel.y + height / 2,
      };
    };

    routeGroup.querySelectorAll(".run-map__route").forEach((node) => node.remove());
    if (track.length >= 2) {
      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      polyline.setAttribute("class", "run-map__route");
      polyline.setAttribute("points", track.map((point) => {
        const p = project(point);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      }).join(" "));
      routeGroup.insertBefore(polyline, marker);
    }

    const current = project(center);
    marker.setAttribute("cx", current.x.toFixed(1));
    marker.setAttribute("cy", current.y.toFixed(1));
  }

  function render() {
    renderTiles();
    renderOverlay();
  }

  function setCenter(point) {
    if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lon))) return;
    center = { lat: Number(point.lat), lon: Number(point.lon) };
    render();
  }

  function setTrack(points = []) {
    track = Array.isArray(points)
      ? points.filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lon)))
      : [];
    renderOverlay();
  }

  function setZoom(nextZoom) {
    const next = clamp(Math.round(Number(nextZoom)), MIN_ZOOM, MAX_ZOOM);
    if (next === zoom) return zoom;
    zoom = next;
    tileNodes.forEach((node) => node.remove());
    tileNodes.clear();
    render();
    return zoom;
  }

  function getZoom() {
    return zoom;
  }

  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(render) : null;
  resizeObserver?.observe(container);

  function destroy() {
    resizeObserver?.disconnect();
    tileNodes.forEach((node) => node.remove());
    tileNodes.clear();
    container.replaceChildren();
  }

  return Object.freeze({ setCenter, setTrack, setZoom, getZoom, destroy });
}
