const DRIVE_CATALOG_FOLDERS = {
  covers: '18h2v0vtZxagwB9WV_eyidSHO9uvh6zDr',
  shirts: '1mjLOqhA80otwFtAXS3HOeMHwOSYE0fn5'
};

/**
 * Web App para devolver las imágenes de las tapas o de las remeras.
 *
 * Sin parámetro, devuelve las tapas:
 *   .../exec
 *
 * Para devolver las remeras:
 *   .../exec?type=shirts
 */
function doGet(e) {
  const requestedType = String(
    e && e.parameter && e.parameter.type ? e.parameter.type : 'covers'
  ).toLowerCase();

  const type = Object.prototype.hasOwnProperty.call(DRIVE_CATALOG_FOLDERS, requestedType)
    ? requestedType
    : 'covers';

  try {
    const folderId = DRIVE_CATALOG_FOLDERS[type];
    const folder = DriveApp.getFolderById(folderId);
    const items = [];

    collectImages_(folder, items);
    items.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    return jsonResponse_({
      ok: true,
      type,
      count: items.length,
      items
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      type,
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
      name: cleanItemName_(file.getName()),
      fileName: file.getName(),
      image: `https://drive.google.com/thumbnail?id=${id}&sz=w1200&v=${updated.getTime()}`,
      updatedAt: updated.toISOString()
    });
  }

  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    collectImages_(subfolders.next(), items);
  }
}

function cleanItemName_(fileName) {
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
