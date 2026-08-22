const DRIVE_CATALOG_FOLDERS = {
  covers: '18h2v0vtZxagwB9WV_eyidSHO9uvh6zDr',
  shirts: '1mjLOqhA80otwFtAXS3HOeMHwOSYE0fn5'
};

const PEDIDOS_SPREADSHEET_ID = '1WG93fHGhMZjHPCDXWtWmXxX360CxfmdpKvwutIxRiM8';
const PEDIDOS_SHEET_NAME = 'Pedidos';

// Cada elemento de este listado corresponde a una columna de la base.
const PEDIDOS_HEADERS = [
  'Fecha y hora',
  'ID de pedido',
  'Estado',
  'Nombre completo',
  'Celular',
  'Método de entrega',
  'Cantidad de calificadores',
  'Opción de cursos',
  'Precio base del calificador',
  'Tapa elegida',
  'Agregados elegidos',
  'Cantidades de agregados',
  'Precios unitarios de agregados',
  'Total de agregados',
  '¿Agregó remera?',
  'Modelo de remera',
  'Talle y color',
  'Precio de remera',
  'Código promocional',
  'Porcentaje de descuento',
  'Forma de pago',
  'Subtotal agenda y agregados',
  'Subtotal remera sin descuento',
  'Subtotal general',
  'Monto de descuento',
  'Total final',
  'Pago ahora',
  'Saldo al entregar',
  'Mensaje completo de WhatsApp'
];

/**
 * GET del Web App.
 * Sin parámetro devuelve tapas; ?type=shirts devuelve remeras.
 */
function doGet(e) {
  const requestedType = String(
    e && e.parameter && e.parameter.type ? e.parameter.type : 'covers'
  ).toLowerCase();

  const type = Object.prototype.hasOwnProperty.call(DRIVE_CATALOG_FOLDERS, requestedType)
    ? requestedType
    : 'covers';

  try {
    const folder = DriveApp.getFolderById(DRIVE_CATALOG_FOLDERS[type]);
    const items = [];
    collectImages_(folder, items);
    items.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    return jsonResponse_({ ok: true, type, count: items.length, items });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      type,
      error: String(error && error.message ? error.message : error),
      items: []
    });
  }
}

/**
 * POST del Web App.
 * Cada confirmación agrega SIEMPRE una fila nueva. Nunca modifica filas anteriores.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(15000);

    const payload = parseOrderPayload_(e);
    validateOrderPayload_(payload);
    const row = appendOrderRow_(payload);

    return jsonResponse_({
      ok: true,
      orderId: payload.orderId,
      row
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

/**
 * Ejecutar una vez antes de publicar la nueva versión.
 * Si la pestaña está vacía o solo tiene encabezados viejos, prepara las columnas nuevas.
 * Si ya contiene pedidos, no borra nada y avisa para evitar pérdida de datos.
 */
function initializePedidosSheet() {
  const sheet = getPedidosSheet_();

  if (sheet.getLastRow() > 1) {
    throw new Error(
      'La pestaña Pedidos ya contiene filas de datos. No se modificó para evitar borrar compras. ' +
      'Creá una pestaña vacía llamada “Pedidos” o respaldá los datos antes de reconfigurarla.'
    );
  }

  sheet.clearContents();
  writeHeaders_(sheet);
  return `Base lista: ${sheet.getParent().getUrl()}`;
}

function appendOrderRow_(payload) {
  const sheet = getPedidosSheet_();
  ensurePedidosHeaders_(sheet);

  const rowValues = buildOrderRow_(payload);
  const targetRow = Math.max(2, sheet.getLastRow() + 1);

  // Una compra = una fila nueva.
  sheet.getRange(targetRow, 1, 1, PEDIDOS_HEADERS.length).setValues([rowValues]);

  sheet.getRange(targetRow, 1).setNumberFormat('dd/mm/yyyy hh:mm:ss');
  sheet.getRange(targetRow, 2).setNumberFormat('@');
  sheet.getRange(targetRow, 5).setNumberFormat('@');
  sheet.getRange(targetRow, 9).setNumberFormat('$#,##0');
  sheet.getRange(targetRow, 13, 1, 2).setNumberFormat('$#,##0');
  sheet.getRange(targetRow, 18).setNumberFormat('$#,##0');
  sheet.getRange(targetRow, 20).setNumberFormat('0"%"');
  sheet.getRange(targetRow, 22, 1, 7).setNumberFormat('$#,##0');
  sheet.getRange(targetRow, 29).setWrap(true);

  SpreadsheetApp.flush();
  return targetRow;
}

function buildOrderRow_(payload) {
  const customer = payload.customer || {};
  const delivery = payload.delivery || {};
  const coupon = payload.coupon || {};
  const totals = payload.totals || {};
  const items = Array.isArray(payload.items) ? payload.items : [];

  const courseOptions = [];
  const covers = [];
  const addonNames = [];
  const addonQuantities = [];
  const addonUnitPrices = [];
  const shirtModels = [];

  let basePriceTotal = 0;
  let addonTotal = 0;
  let shirtPriceTotal = 0;
  let includesShirt = false;

  items.forEach(item => {
    const courseOption = cleanText_(item.courseOption);
    const coverName = cleanText_(item.coverName);
    if (courseOption) courseOptions.push(courseOption);
    if (coverName) covers.push(coverName);

    basePriceTotal += number_(item.coursePrice, 0);

    const addons = Array.isArray(item.addons) ? item.addons : [];
    addons.forEach(addon => {
      const name = cleanText_(addon.name);
      if (!name) return;

      const quantity = number_(addon.quantity, 1);
      const unitPrice = number_(addon.unitPrice, 0);
      const subtotal = number_(addon.subtotal, unitPrice * quantity);

      addonNames.push(name);
      addonQuantities.push(String(quantity));
      addonUnitPrices.push(`$${formatInteger_(unitPrice)}`);
      addonTotal += subtotal;
    });

    if (item.includesShirtPromo) {
      includesShirt = true;
      const model = cleanText_(item.shirtModel);
      if (model) shirtModels.push(model);
      shirtPriceTotal += number_(item.nonDiscountableTotal, 0);
    }
  });

  // Respaldo por compatibilidad si el navegador no informó el precio base explícito.
  if (basePriceTotal === 0) {
    basePriceTotal = Math.max(0, number_(totals.discountableSubtotal, 0) - addonTotal);
  }

  const isTwoPayments = Boolean(coupon.isTwoPayments);
  const paymentType = isTwoPayments ? '50% ahora y 50% al entregar' : 'Pago total';

  return [
    new Date(),
    cleanText_(payload.orderId),
    'Pedido iniciado por WhatsApp',
    cleanText_(customer.fullName),
    cleanText_(customer.phone),
    cleanText_(delivery.label || delivery.code),
    items.length,
    uniqueNonEmpty_(courseOptions).join(' | '),
    basePriceTotal,
    uniqueNonEmpty_(covers).join(' | '),
    addonNames.length ? addonNames.join(' | ') : 'Sin agregados',
    addonQuantities.length ? addonQuantities.join(' | ') : '0',
    addonUnitPrices.length ? addonUnitPrices.join(' | ') : '$0',
    addonTotal,
    includesShirt ? 'Sí' : 'No',
    includesShirt ? uniqueNonEmpty_(shirtModels).join(' | ') : 'No agregó remera',
    includesShirt ? 'A coordinar por WhatsApp' : 'No corresponde',
    shirtPriceTotal,
    cleanText_(coupon.code) || 'Sin código',
    number_(coupon.percent, 0),
    paymentType,
    number_(totals.discountableSubtotal, 0),
    number_(totals.shirtSubtotal, totals.nonDiscountableSubtotal),
    number_(totals.subtotal, 0),
    number_(totals.discountAmount, 0),
    number_(totals.finalTotal, 0),
    number_(totals.payNow, totals.finalTotal),
    number_(totals.payOnDelivery, 0),
    cleanText_(payload.whatsappMessage)
  ];
}

function getPedidosSheet_() {
  const spreadsheet = SpreadsheetApp.openById(PEDIDOS_SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(PEDIDOS_SHEET_NAME);
  if (sheet) return sheet;

  const firstSheet = spreadsheet.getSheets()[0];
  const firstSheetIsBlank = firstSheet && firstSheet.getLastRow() === 0;

  if (firstSheetIsBlank) {
    firstSheet.setName(PEDIDOS_SHEET_NAME);
    return firstSheet;
  }

  return spreadsheet.insertSheet(PEDIDOS_SHEET_NAME);
}

function ensurePedidosHeaders_(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow === 0) {
    writeHeaders_(sheet);
    return;
  }

  const currentHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), PEDIDOS_HEADERS.length))
    .getValues()[0]
    .slice(0, PEDIDOS_HEADERS.length)
    .map(cleanText_);

  const headersMatch = PEDIDOS_HEADERS.every((header, index) => currentHeaders[index] === header);
  if (!headersMatch) {
    if (lastRow === 1) {
      sheet.clearContents();
      writeHeaders_(sheet);
      return;
    }

    throw new Error(
      'La pestaña Pedidos contiene datos con una estructura anterior. ' +
      'No se guardó la compra para no mezclar columnas. Prepará una pestaña vacía llamada “Pedidos”.'
    );
  }
}

function writeHeaders_(sheet) {
  sheet.getRange(1, 1, 1, PEDIDOS_HEADERS.length).setValues([PEDIDOS_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, PEDIDOS_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#1A3B5C')
    .setFontColor('#FFFFFF')
    .setWrap(true);

  sheet.autoResizeColumns(1, PEDIDOS_HEADERS.length);
  sheet.setColumnWidth(4, 190);
  sheet.setColumnWidth(6, 250);
  sheet.setColumnWidth(8, 190);
  sheet.setColumnWidth(10, 190);
  sheet.setColumnWidth(11, 260);
  sheet.setColumnWidth(16, 190);
  sheet.setColumnWidth(29, 520);
}

function parseOrderPayload_(e) {
  let raw = '';

  if (e && e.parameter && e.parameter.payload) {
    raw = e.parameter.payload;
  } else if (e && e.postData && e.postData.contents) {
    raw = e.postData.contents;
  }

  if (!raw) throw new Error('El pedido llegó vacío.');

  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new Error('El pedido no contiene un JSON válido.');
  }
}

function validateOrderPayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Formato de pedido inválido.');
  }
  if (!cleanText_(payload.orderId)) {
    throw new Error('Falta el ID del pedido.');
  }
  if (!payload.customer || !cleanText_(payload.customer.fullName)) {
    throw new Error('Falta el nombre del cliente.');
  }
  if (!payload.customer || cleanText_(payload.customer.phoneDigits).length < 8) {
    throw new Error('Falta un número de celular válido.');
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('El pedido no contiene productos.');
  }
  if (!cleanText_(payload.whatsappMessage)) {
    throw new Error('Falta el mensaje completo de WhatsApp.');
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

function uniqueNonEmpty_(values) {
  const seen = {};
  const result = [];

  values.forEach(value => {
    const cleaned = cleanText_(value);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen[key]) return;
    seen[key] = true;
    result.push(cleaned);
  });

  return result;
}

function cleanText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function number_(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
}

function formatInteger_(value) {
  return Math.round(Number(value || 0)).toLocaleString('es-AR');
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
