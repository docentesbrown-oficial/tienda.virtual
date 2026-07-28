const COVER_FOLDER_ID = '18h2v0vtZxagwB9WV_eyidSHO9uvh6zDr';

function doGet() {
  try {
    const folder = DriveApp.getFolderById(COVER_FOLDER_ID);
    const items = [];
    collectImages_(folder, items);

    items.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    return jsonResponse_({
      ok: true,
      count: items.length,
      items
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: String(error && error.message ? error.message : error),
      items: []
    });
  }
}

function collectImages_(folder, items) {
  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType() || '';

    if (!mimeType.startsWith('image/')) continue;

    const id = file.getId();
    const updated = file.getLastUpdated();

    items.push({
      id,
      name: cleanCoverName_(file.getName()),
      fileName: file.getName(),
      image: `https://drive.google.com/thumbnail?id=${id}&sz=w1000&v=${updated.getTime()}`,
      updatedAt: updated.toISOString()
    });
  }

  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    collectImages_(subfolders.next(), items);
  }
}

function cleanCoverName_(fileName) {
  return String(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/^\s*\d+\s*[-_.]\s*/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
