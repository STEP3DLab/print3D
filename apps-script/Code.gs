/**
 * Step3D.Lab
 * Google Apps Script backend для сайта:
 * 1. GET ?action=content      -> контент сайта из таблицы
 * 2. GET ?action=health       -> статус сервиса
 * 3. GET ?action=experiments  -> строки из листа experiments
 * 4. POST                     -> запись нового эксперимента в лист experiments
 *
 * Таблица:
 * https://docs.google.com/spreadsheets/d/1Qs82BACFab20vovUPWKxYREEjtiyrZvxwxD0n_IYATo/edit
 */

const SHEET_CONTENT_SETTINGS = 'settings';
const SHEET_PAGES = 'pages';
const SHEET_CONTENT_BLOCKS = 'content_blocks';
const SHEET_LAB_WORKS = 'lab_works';
const SHEET_FAQ = 'faq';
const SHEET_NAV = 'nav';
const SHEET_MEDIA = 'media';
const SHEET_EXPERIMENTS = 'experiments';

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'content';

    if (action === 'health') {
      return jsonResponse({
        ok: true,
        service: 'Step3D.Lab endpoint',
        spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'content') {
      return jsonResponse({
        ok: true,
        content: buildSiteContentPayload()
      });
    }

    if (action === 'experiments') {
      return jsonResponse({
        ok: true,
        experiments: getExperimentsPayload()
      });
    }

    return jsonResponse({
      ok: false,
      error: 'Неизвестный action'
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error)
    });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) ? e.postData.contents : '{}');

    if (!payload || Object.keys(payload).length === 0) {
      return jsonResponse({
        ok: false,
        error: 'Пустой payload'
      });
    }

    const sheet = getSheetOrThrow(SHEET_EXPERIMENTS);
    ensureExperimentsHeader(sheet);

    const headers = getHeaderRow(sheet);
    const row = headers.map((header) => normalizeValue(payload[header]));

    sheet.appendRow(row);

    return jsonResponse({
      ok: true,
      message: 'Запись добавлена',
      sampleId: payload.sampleId || '',
      rowNumber: sheet.getLastRow()
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error)
    });
  }
}

function buildSiteContentPayload() {
  const settings = rowsToKeyValue(SHEET_CONTENT_SETTINGS);
  const pages = rowsToObjectsSafe(SHEET_PAGES).filter(row => isTrue(row.is_published));
  const contentBlocks = rowsToObjectsSafe(SHEET_CONTENT_BLOCKS)
    .filter(row => isTrue(row.is_visible))
    .sort(sortByNumericField('sort_order'));
  const labWorks = rowsToObjectsSafe(SHEET_LAB_WORKS)
    .filter(row => isTrue(row.is_visible))
    .sort(sortByNumericField('sort_order'));
  const faq = rowsToObjectsSafe(SHEET_FAQ);
  const nav = rowsToObjectsSafe(SHEET_NAV);
  const media = rowsToObjectsSafe(SHEET_MEDIA);

  return {
    settings,
    pages,
    content_blocks: contentBlocks,
    lab_works: labWorks,
    faq,
    nav,
    media
  };
}

function getExperimentsPayload() {
  const rows = rowsToObjectsSafe(SHEET_EXPERIMENTS);
  return rows
    .filter(row => row && Object.values(row).some(value => String(value || '').trim() !== ''))
    .map(row => ({
      sampleId: row.sampleId || '',
      submittedAt: row.submittedAt || '',
      studentName: row.studentName || '',
      groupName: row.groupName || '',
      experimentDate: row.experimentDate || '',
      variantCode: row.variantCode || '',
      repeatCode: row.repeatCode || '',
      printerModel: row.printerModel || '',
      scannerModel: row.scannerModel || '',
      softwareName: row.softwareName || '',
      materialName: row.materialName || '',
      materialColor: row.materialColor || '',
      materialBatch: row.materialBatch || '',
      nozzleTemperature: row.nozzleTemperature || '',
      bedTemperature: row.bedTemperature || '',
      printSpeed: row.printSpeed || '',
      layerHeight: row.layerHeight || '',
      nozzleDiameter: row.nozzleDiameter || '',
      infillPercent: row.infillPercent || '',
      wallCount: row.wallCount || '',
      coolingMode: row.coolingMode || '',
      actualPrintTime: row.actualPrintTime || '',
      cadX: row.cadX || '',
      factX: row.factX || '',
      cadY: row.cadY || '',
      factY: row.factY || '',
      cadZ: row.cadZ || '',
      factZ: row.factZ || '',
      shrinkageX: row.shrinkageX || '',
      shrinkageY: row.shrinkageY || '',
      shrinkageZ: row.shrinkageZ || '',
      shrinkageIntegral: row.shrinkageIntegral || '',
      meanDeviation: row.meanDeviation || '',
      meanAbsDeviation: row.meanAbsDeviation || '',
      rmsDeviation: row.rmsDeviation || '',
      maxPositiveDeviation: row.maxPositiveDeviation || '',
      maxNegativeDeviation: row.maxNegativeDeviation || '',
      toleranceRatio: row.toleranceRatio || '',
      photoLink: row.photoLink || '',
      deviationMapLink: row.deviationMapLink || '',
      gcodeLink: row.gcodeLink || '',
      scanReportLink: row.scanReportLink || '',
      notes: row.notes || '',
      platform: row.platform || '',
      stlFolder: row.stlFolder || ''
    }));
}

function getSheetOrThrow(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Лист "${sheetName}" не найден`);
  }
  return sheet;
}

function getHeaderRow(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    return [];
  }
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function rowsToKeyValue(sheetName) {
  const sheet = getSheetOrThrow(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {};
  }

  const result = {};
  const header = values[0];
  const keyIndex = header.indexOf('key');
  const valueIndex = header.indexOf('value');

  if (keyIndex === -1 || valueIndex === -1) {
    return {};
  }

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const key = String(row[keyIndex] || '').trim();
    const value = row[valueIndex];
    if (!key) continue;
    result[key] = value;
  }

  return result;
}

function rowsToObjectsSafe(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h || '').trim());

  return values
    .slice(1)
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx];
      });
      return obj;
    });
}

function ensureExperimentsHeader(sheet) {
  const currentHeader = getHeaderRow(sheet);
  if (currentHeader.length > 0 && currentHeader.some(v => String(v).trim() !== '')) {
    return;
  }

  const header = [
    'sampleId','submittedAt','studentName','groupName','experimentDate','variantCode','repeatCode',
    'printerModel','scannerModel','softwareName','materialName','materialColor','materialBatch',
    'nozzleTemperature','bedTemperature','printSpeed','layerHeight','nozzleDiameter','infillPercent',
    'wallCount','coolingMode','actualPrintTime','cadX','factX','cadY','factY','cadZ','factZ',
    'shrinkageX','shrinkageY','shrinkageZ','shrinkageIntegral','meanDeviation','meanAbsDeviation',
    'rmsDeviation','maxPositiveDeviation','maxNegativeDeviation','toleranceRatio','photoLink',
    'deviationMapLink','gcodeLink','scanReportLink','notes','platform','stlFolder'
  ];

  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function normalizeValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function isTrue(value) {
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'да';
}

function sortByNumericField(fieldName) {
  return (a, b) => {
    const av = Number(a[fieldName] || 0);
    const bv = Number(b[fieldName] || 0);
    return av - bv;
  };
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
