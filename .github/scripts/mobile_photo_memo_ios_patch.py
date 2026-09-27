from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected 1 anchor, found {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "ui/mobilePhotoMemoStore.js",
    '''    const record = {
      id: createId(),
      createdAt: new Date().toISOString(),
      note: String(note || "").trim().slice(0, 160),
      blob,
      mimeType: blob.type || "image/jpeg",
      byteSize: blob.size,
      width: Number(width) || 0,
      height: Number(height) || 0,
    };''',
    '''    const imageBytes = await blob.arrayBuffer();
    const record = {
      id: createId(),
      createdAt: new Date().toISOString(),
      note: String(note || "").trim().slice(0, 160),
      imageBytes,
      mimeType: "image/jpeg",
      byteSize: blob.size,
      width: Number(width) || 0,
      height: Number(height) || 0,
    };''',
)

interactions = Path("ui/interactions/mobilePhotoMemoInteractions.js")
text = interactions.read_text(encoding="utf-8")
old = '''async function displayBlobForEntry(entry) {
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
'''
new = '''function detectImageMime(bytes, fallback = "image/jpeg") {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || new ArrayBuffer(0));
  if (view.length >= 3 && view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) return "image/jpeg";
  if (view.length >= 8 && view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) return "image/png";
  if (view.length >= 12 && view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 && view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50) return "image/webp";
  return String(fallback || "image/jpeg");
}

async function displayBlobForEntry(entry) {
  let bytes = null;
  if (entry?.imageBytes instanceof ArrayBuffer) bytes = entry.imageBytes;
  else if (ArrayBuffer.isView(entry?.imageBytes)) bytes = entry.imageBytes.buffer.slice(entry.imageBytes.byteOffset, entry.imageBytes.byteOffset + entry.imageBytes.byteLength);
  else if (entry?.blob instanceof Blob && entry.blob.size) bytes = await entry.blob.arrayBuffer();
  if (!(bytes instanceof ArrayBuffer) || !bytes.byteLength) return null;

  const mimeType = detectImageMime(bytes, entry?.mimeType || "image/jpeg");
  const blob = new Blob([bytes], { type: mimeType });
  if (["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return blob;
  try {
    return (await preparePhoto(blob)).blob;
  } catch {
    return blob;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!(blob instanceof Blob) || !blob.size || typeof FileReader !== "function") {
      reject(new Error("IMAGE_DATA_URL_FAILED"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("IMAGE_DATA_URL_FAILED"));
    reader.onerror = () => reject(reader.error || new Error("IMAGE_DATA_URL_FAILED"));
    reader.readAsDataURL(blob);
  });
}
'''
if text.count(old) != 1:
    raise SystemExit("displayBlobForEntry anchor mismatch")
text = text.replace(old, new, 1)

replacements = [
    (
        '''  let historyUrls = [];
  let viewerUrl = "";
''',
        '''  let historyUrls = [];
''',
    ),
    (
        '''  const revokeHistoryUrls = () => {
    historyUrls.forEach((url) => URL.revokeObjectURL(url));
    historyUrls = [];
  };

  const revokeViewerUrl = () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    viewerUrl = "";
  };
''',
        '''  const revokeHistoryUrls = () => {
    historyUrls = [];
  };
''',
    ),
    (
        '''    viewer.querySelector("[data-mobile-photo-memo-viewer-image]")?.removeAttribute("src");
    revokeViewerUrl();
''',
        '''    viewer.querySelector("[data-mobile-photo-memo-viewer-image]")?.removeAttribute("src");
''',
    ),
    (
        '''        const blob = await displayBlobForEntry(entry);
        const url = blob ? URL.createObjectURL(blob) : "";
        if (url) historyUrls.push(url);
        return { entry, url };
''',
        '''        const blob = await displayBlobForEntry(entry);
        const url = blob ? await blobToDataUrl(blob).catch(() => "") : "";
        if (url) historyUrls.push(url);
        return { entry, url };
''',
    ),
    (
        '''    revokeViewerUrl();
    media.classList.remove("is-image-error");
    const blob = await displayBlobForEntry(entry);
    if (blob) {
      viewerUrl = URL.createObjectURL(blob);
      image.src = viewerUrl;
      image.onerror = () => media.classList.add("is-image-error");
''',
        '''    media.classList.remove("is-image-error");
    const blob = await displayBlobForEntry(entry);
    const viewerUrl = blob ? await blobToDataUrl(blob).catch(() => "") : "";
    if (viewerUrl) {
      image.src = viewerUrl;
      image.onerror = () => media.classList.add("is-image-error");
''',
    ),
]
for old_value, new_value in replacements:
    if text.count(old_value) != 1:
        raise SystemExit(f"interaction anchor mismatch: {old_value[:80]!r}")
    text = text.replace(old_value, new_value, 1)
interactions.write_text(text, encoding="utf-8")

test_file = Path("tests/mobilePhotoMemo.test.mjs")
text = test_file.read_text(encoding="utf-8")
anchor = "await test('PHOTO-MEMO-PWA-ASSETS-ARE-PRECACHED', () => {"
addition = '''await test('PHOTO-MEMO-STORES-BYTES-AND-DISPLAYS-VIA-DATA-URL', () => {
  const store = read('ui/mobilePhotoMemoStore.js');
  const interactions = read('ui/interactions/mobilePhotoMemoInteractions.js');
  assert.ok(store.includes('const imageBytes = await blob.arrayBuffer()'));
  assert.ok(store.includes('imageBytes,'));
  assert.ok(interactions.includes('detectImageMime'));
  assert.ok(interactions.includes('blobToDataUrl'));
  assert.ok(interactions.includes('reader.readAsDataURL(blob)'));
  assert.ok(interactions.includes('entry?.imageBytes instanceof ArrayBuffer'));
});

'''
if text.count(anchor) != 1:
    raise SystemExit("photo memo test anchor mismatch")
text = text.replace(anchor, addition + anchor, 1)
test_file.write_text(text, encoding="utf-8")

Path(".github/workflows/mobile-photo-memo-ios-temp.yml").unlink(missing_ok=True)
Path(".github/scripts/mobile_photo_memo_ios_patch.py").unlink(missing_ok=True)
