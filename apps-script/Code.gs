/**
 * Step3D.Lab backend
 *
 * GET:
 *  - ?action=health
 *  - ?action=content
 *  - ?action=experiments
 *  - ?action=session&key=...
 *
 * POST:
 *  - { action: 'create_session', studentName, groupName }
 *  - { action: 'save_session', participantKey, currentStep, draft }
 *  - { action: 'submit_experiment', ...payload }
 */

const SHEET_CONTENT_SETTINGS = 'settings';
const SHEET_PAGES = 'pages';
const SHEET_CONTENT_BLOCKS = 'content_blocks';
const SHEET_LAB_WORKS = 'lab_works';
const SHEET_FAQ = 'faq';
const SHEET_NAV = 'nav';
const SHEET_MEDIA = 'media';
const SHEET_EXPERIMENTS = 'experiments';
const SHEET_SESSIONS = 'sessions';

const SESSION_HEADERS = [
  'participantKey','createdAt','updatedAt','status','studentName','groupName',
  'variantCode','taskTitle','taskDescription',
  'recommendedNozzleTemperature','recommendedBedTemperature','recommendedPrintSpeed','recommendedLayerHeight',
  'currentStep','draftJson'
];

const EXPERIMENT_HEADERS = [
  'participantKey','sampleId','submittedAt','studentName','groupName','experimentDate','variantCode',
  'taskTitle','taskDescription','printerModel','scannerModel','softwareName','materialName','materialColor','materialBatch',
  'nozzleTemperature','bedTemperature','printSpeed','layerHeight','nozzleDiameter','actualPrintTime',
  'cadX','factX','cadY','factY','cadZ','factZ',
  'shrinkageX','shrinkageY','shrinkageZ','shrinkageIntegral',
  'meanDeviation','meanAbsDeviation','rmsDeviation','maxPositiveDeviation','maxNegativeDeviation','toleranceRatio',
  'photoLink','deviationMapLink','gcodeLink','scanReportLink','notes','platform','stlFolder'
];

const TASK_CATALOG = [
  {
    variantCode: 'V01',
    title: 'PLA. Базовый температурный режим',
    description: 'Напечатайте образец Step3D_01 из PLA на базовом режиме. Зафиксируйте фактические параметры, линейные размеры и результаты контроля геометрии.',
    recommendedNozzleTemperature: 205,
    recommendedBedTemperature: 60,
    recommendedPrintSpeed: 40,
    recommendedLayerHeight: 0.20
  },
  {
    variantCode: 'V02',
    title: 'PLA. Повышенная скорость печати',
    description: 'Напечатайте образец Step3D_01 из PLA с повышенной скоростью печати. Сравните усадку и метрики качества с базовым режимом.',
    recommendedNozzleTemperature: 205,
    recommendedBedTemperature: 60,
    recommendedPrintSpeed: 55,
    recommendedLayerHeight: 0.20
  },
  {
    variantCode: 'V03',
    title: 'PLA. Повышенная температура сопла',
    description: 'Напечатайте образец Step3D_01 из PLA при повышенной температуре сопла. Зафиксируйте размеры, усадку и карту отклонений.',
    recommendedNozzleTemperature: 215,
    recommendedBedTemperature: 60,
    recommendedPrintSpeed: 45,
    recommendedLayerHeight: 0.20
  },
  {
    variantCode: 'V04',
    title: 'PLA. Уменьшенная высота слоя',
    description: 'Напечатайте образец Step3D_01 из PLA с уменьшенной высотой слоя. Оцените влияние на точность и контроль геометрии.',
    recommendedNozzleTemperature: 210,
    recommendedBedTemperature: 60,
    recommendedPrintSpeed: 40,
    recommendedLayerHeight: 0.16
  },
  {
    variantCode: 'V05',
    title: 'PLA. Увеличенная высота слоя',
    description: 'Напечатайте образец Step3D_01 из PLA с увеличенной высотой слоя. Зафиксируйте изменение времени печати и геометрической точности.',
    recommendedNozzleTemperature: 210,
    recommendedBedTemperature: 60,
    recommendedPrintSpeed: 45,
    recommendedLayerHeight: 0.24
  },
  {
    variantCode: 'V06',
    title: 'PLA. Комбинированный режим',
    description: 'Напечатайте образец Step3D_01 из PLA на комбинированном режиме с повышенной температурой и скоростью. Оцените интегральную усадку и отклонения.',
    recommendedNozzleTemperature: 215,
    recommendedBedTemperature: 60,
    recommendedPrintSpeed: 60,
    recommendedLayerHeight: 0.20
  }
];

function doGet(e) {
  try {
    const action = getParam_(e, 'action', 'content');

    if (action === 'health') {
      return jsonResponse_({
        ok: true,
        service: 'Step3D.Lab endpoint',
        spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'content') {
      return jsonResponse_({ ok: true, content: buildSiteContentPayload_() });
    }

    if (action === 'experiments') {
      return jsonResponse_({ ok: true, experiments: getExperimentsPayload_() });
    }

    if (action === 'session') {
      const participantKey = getParam_(e, 'key', '');
      if (!participantKey) {
        return jsonResponse_({ ok: false, error: 'Не передан ключ участника' });
      }
      return jsonResponse_({ ok: true, session: getSessionPayload_(participantKey) });
    }

    return jsonResponse_({ ok: false, error: 'Неизвестный action' });
  } catch (error) {
    return jsonResponse_({ ok: false, error: String(error) });
  }
}

function doPost(e) {
  try {
    const payload = parsePostBody_(e);
    const action = payload.action || 'submit_experiment';

    if (action === 'create_session') {
      return jsonResponse_({ ok: true, session: createSession_(payload) });
    }

    if (action === 'save_session') {
      return jsonResponse_({ ok: true, session: saveSession_(payload) });
    }

    if (action === 'submit_experiment') {
      return jsonResponse_(submitExperiment_(payload));
    }

    return jsonResponse_({ ok: false, error: 'Неизвестный action' });
  } catch (error) {
    return jsonResponse_({ ok: false, error: String(error) });
  }
}

function buildSiteContentPayload_() {
  return {
    settings: rowsToKeyValue_(SHEET_CONTENT_SETTINGS),
    pages: rowsToObjectsSafe_(SHEET_PAGES).filter(row => isTrue_(row.is_published)),
    content_blocks: rowsToObjectsSafe_(SHEET_CONTENT_BLOCKS)
      .filter(row => isTrue_(row.is_visible))
      .sort(sortByNumericField_('sort_order')),
    lab_works: rowsToObjectsSafe_(SHEET_LAB_WORKS)
      .filter(row => isTrue_(row.is_visible))
      .sort(sortByNumericField_('sort_order')),
    faq: rowsToObjectsSafe_(SHEET_FAQ),
    nav: rowsToObjectsSafe_(SHEET_NAV),
    media: rowsToObjectsSafe_(SHEET_MEDIA)
  };
}

function getExperimentsPayload_() {
  return rowsToObjectsSafe_(SHEET_EXPERIMENTS)
    .filter(row => row && Object.values(row).some(value => String(value || '').trim() !== ''));
}

function getSessionPayload_(participantKey) {
  const sheet = getOrCreateSheet_(SHEET_SESSIONS);
  ensureHeaders_(sheet, SESSION_HEADERS);
  const row = getRowObjectByKey_(sheet, 'participantKey', participantKey);
  if (!row) {
    throw new Error('Сессия с таким ключом не найдена');
  }
  return sessionToClient_(row);
}

function createSession_(payload) {
  const sheet = getOrCreateSheet_(SHEET_SESSIONS);
  ensureHeaders_(sheet, SESSION_HEADERS);

  const participantKey = generateParticipantKey_();
  const task = pickTask_();
  const now = new Date().toISOString();

  const draft = {
    participantKey: participantKey,
    studentName: payload.studentName || '',
    groupName: payload.groupName || '',
    variantCode: task.variantCode,
    taskTitle: task.title,
    taskDescription: task.description,
    nozzleTemperature: task.recommendedNozzleTemperature,
    bedTemperature: task.recommendedBedTemperature,
    printSpeed: task.recommendedPrintSpeed,
    layerHeight: task.recommendedLayerHeight,
    materialName: 'PLA'
  };

  const session = {
    participantKey: participantKey,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    studentName: payload.studentName || '',
    groupName: payload.groupName || '',
    variantCode: task.variantCode,
    taskTitle: task.title,
    taskDescription: task.description,
    recommendedNozzleTemperature: task.recommendedNozzleTemperature,
    recommendedBedTemperature: task.recommendedBedTemperature,
    recommendedPrintSpeed: task.recommendedPrintSpeed,
    recommendedLayerHeight: task.recommendedLayerHeight,
    currentStep: '0',
    draftJson: JSON.stringify(draft)
  };

  appendObjectRow_(sheet, session);
  return sessionToClient_(session);
}

function saveSession_(payload) {
  const sheet = getOrCreateSheet_(SHEET_SESSIONS);
  ensureHeaders_(sheet, SESSION_HEADERS);

  const participantKey = String(payload.participantKey || '').trim();
  if (!participantKey) {
    throw new Error('Не передан participantKey');
  }

  const existing = getRowObjectByKey_(sheet, 'participantKey', participantKey) || {};
  const now = new Date().toISOString();
  const draft = payload.draft || {};

  const rowObject = Object.assign({}, existing, {
    participantKey: participantKey,
    createdAt: existing.createdAt || now,
    updatedAt: now,
    status: payload.status || existing.status || 'draft',
    studentName: payload.studentName || draft.studentName || existing.studentName || '',
    groupName: payload.groupName || draft.groupName || existing.groupName || '',
    variantCode: payload.variantCode || draft.variantCode || existing.variantCode || '',
    taskTitle: payload.taskTitle || draft.taskTitle || existing.taskTitle || '',
    taskDescription: payload.taskDescription || draft.taskDescription || existing.taskDescription || '',
    recommendedNozzleTemperature: payload.recommendedNozzleTemperature || existing.recommendedNozzleTemperature || '',
    recommendedBedTemperature: payload.recommendedBedTemperature || existing.recommendedBedTemperature || '',
    recommendedPrintSpeed: payload.recommendedPrintSpeed || existing.recommendedPrintSpeed || '',
    recommendedLayerHeight: payload.recommendedLayerHeight || existing.recommendedLayerHeight || '',
    currentStep: String(payload.currentStep || existing.currentStep || '0'),
    draftJson: JSON.stringify(draft)
  });

  upsertObjectByKey_(sheet, 'participantKey', participantKey, rowObject);
  return sessionToClient_(rowObject);
}

function submitExperiment_(payload) {
  const sheet = getOrCreateSheet_(SHEET_EXPERIMENTS);
  ensureHeaders_(sheet, EXPERIMENT_HEADERS);

  const now = new Date().toISOString();
  const rowObject = Object.assign({}, payload, {
    submittedAt: payload.submittedAt || now,
    materialName: payload.materialName || 'PLA'
  });

  appendObjectRow_(sheet, rowObject);

  if (payload.participantKey) {
    saveSession_({
      participantKey: payload.participantKey,
      studentName: payload.studentName,
      groupName: payload.groupName,
      variantCode: payload.variantCode,
      taskTitle: payload.taskTitle,
      taskDescription: payload.taskDescription,
      currentStep: 'submitted',
      status: 'submitted',
      draft: payload
    });
  }

  return {
    ok: true,
    message: 'Запись добавлена',
    participantKey: payload.participantKey || '',
    sampleId: payload.sampleId || '',
    rowNumber: sheet.getLastRow()
  };
}

function getOrCreateSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function rowsToKeyValue_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return {};
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};

  const header = values[0];
  const keyIndex = header.indexOf('key');
  const valueIndex = header.indexOf('value');
  if (keyIndex === -1 || valueIndex === -1) return {};

  const result = {};
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const key = String(row[keyIndex] || '').trim();
    if (!key) continue;
    result[key] = row[valueIndex];
  }
  return result;
}

function rowsToObjectsSafe_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h || '').trim());
  return values.slice(1)
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx];
      });
      return obj;
    });
}

function ensureHeaders_(sheet, expectedHeaders) {
  const currentHeaders = getHeaderRow_(sheet);
  const hasAnyHeader = currentHeaders.some(h => String(h || '').trim() !== '');

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }

  const missingHeaders = expectedHeaders.filter(header => currentHeaders.indexOf(header) === -1);
  if (!missingHeaders.length) return;

  sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  sheet.getRange(1, 1, 1, currentHeaders.length + missingHeaders.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function getHeaderRow_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function appendObjectRow_(sheet, rowObject) {
  const headers = getHeaderRow_(sheet);
  const row = headers.map(header => normalizeValue_(rowObject[header]));
  sheet.appendRow(row);
}

function upsertObjectByKey_(sheet, keyField, keyValue, rowObject) {
  const headers = getHeaderRow_(sheet);
  const rowIndex = findRowIndexByKey_(sheet, keyField, keyValue);

  if (rowIndex === -1) {
    appendObjectRow_(sheet, rowObject);
    return;
  }

  const existingValues = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const existingObject = {};
  headers.forEach((header, index) => {
    existingObject[header] = existingValues[index];
  });

  const merged = Object.assign({}, existingObject, rowObject);
  const row = headers.map(header => normalizeValue_(merged[header]));
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
}

function findRowIndexByKey_(sheet, keyField, keyValue) {
  const headers = getHeaderRow_(sheet);
  const keyIndex = headers.indexOf(keyField);
  if (keyIndex === -1) return -1;

  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return -1;

  const values = sheet.getRange(2, keyIndex + 1, numRows, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === String(keyValue || '').trim()) {
      return i + 2;
    }
  }
  return -1;
}

function getRowObjectByKey_(sheet, keyField, keyValue) {
  const headers = getHeaderRow_(sheet);
  const rowIndex = findRowIndexByKey_(sheet, keyField, keyValue);
  if (rowIndex === -1) return null;

  const values = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const result = {};
  headers.forEach((header, index) => {
    result[header] = values[index];
  });
  return result;
}

function sessionToClient_(row) {
  const draft = safeJsonParse_(row.draftJson, {});
  return {
    participantKey: row.participantKey || '',
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
    status: row.status || 'draft',
    studentName: row.studentName || '',
    groupName: row.groupName || '',
    variantCode: row.variantCode || '',
    taskTitle: row.taskTitle || '',
    taskDescription: row.taskDescription || '',
    recommendedNozzleTemperature: row.recommendedNozzleTemperature || '',
    recommendedBedTemperature: row.recommendedBedTemperature || '',
    recommendedPrintSpeed: row.recommendedPrintSpeed || '',
    recommendedLayerHeight: row.recommendedLayerHeight || '',
    currentStep: row.currentStep || '0',
    draft: draft
  };
}

function pickTask_() {
  const sheet = getOrCreateSheet_(SHEET_SESSIONS);
  const sessionsCount = Math.max(sheet.getLastRow() - 1, 0);
  return TASK_CATALOG[sessionsCount % TASK_CATALOG.length];
}

function generateParticipantKey_() {
  const datePart = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd');
  const randomPart = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return 'S3D-' + datePart + '-' + randomPart;
}

function safeJsonParse_(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function parsePostBody_(e) {
  const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Некорректный payload');
  }
  return parsed;
}

function normalizeValue_(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function getParam_(e, key, fallback) {
  if (e && e.parameter && e.parameter[key] !== undefined) {
    return e.parameter[key];
  }
  return fallback;
}

function isTrue_(value) {
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'да';
}

function sortByNumericField_(fieldName) {
  return function(a, b) {
    return Number(a[fieldName] || 0) - Number(b[fieldName] || 0);
  };
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
