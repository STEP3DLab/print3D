/**
 * Google Apps Script для приема записей с сайта Step3D.Lab
 * и записи их в Google Sheets.
 *
 * Как использовать:
 * 1. Откройте Google Sheets.
 * 2. Создайте Apps Script.
 * 3. Вставьте этот код.
 * 4. Укажите имя листа в константе SHEET_NAME.
 * 5. Deploy -> New deployment -> Web app.
 * 6. Доступ: Anyone with the link.
 * 7. Скопируйте URL и вставьте его в APPS_SCRIPT_URL в index.html.
 */
const SHEET_NAME = 'Experiments';
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ ok: false, error: 'Лист Experiments не найден' });
    }
    const payload = JSON.parse(e.postData.contents || '{}');
    ensureHeader(sheet, payload);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map((header) => payload[header] ?? '');
    sheet.appendRow(row);
    return jsonResponse({ ok: true, message: 'Запись добавлена', sample_id: payload.sampleId || '' });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}
function doGet() {
  return jsonResponse({ ok: true, service: 'Step3D.Lab Google Apps Script endpoint' });
}
function ensureHeader(sheet, payload) {
  if (sheet.getLastRow() > 0) return;
  const headers = Object.keys(payload);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
