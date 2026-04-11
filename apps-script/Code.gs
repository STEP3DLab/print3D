/**
 * Step3D.Lab backend
 *
 * GET:
 *  - ?action=health
 *  - ?action=content
 *  - ?action=experiments
 *  - ?action=session&key=...
 *  - ?action=my_records&key=...
 *  - ?action=dashboard&token=...
 *  - ?action=sessions&token=...
 *  - ?action=admin_me&token=...
 *
 * POST:
 *  - { action: 'create_session', studentName, groupName }
 *  - { action: 'save_session', participantKey, currentStep, draft }
 *  - { action: 'submit_experiment', ...payload }
 *  - { action: 'admin_login', login, password }
 *  - { action: 'admin_logout', token }
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
const SHEET_ADMIN_USERS = 'admin_users';
const SHEET_ADMIN_SESSIONS = 'admin_sessions';

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

const ADMIN_USER_HEADERS = [
  'login','password_hash','password_plain','display_name','role','is_active','notes'
];

const ADMIN_SESSION_HEADERS = [
  'token','login','display_name','role','createdAt','expiresAt','is_active'
];

const ADMIN_SESSION_HOURS = 12;

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

    if (action === 'my_records') {
      const participantKey = getParam_(e, 'key', '');
      if (!participantKey) {
        return jsonResponse_({ ok: false, error: 'Не передан ключ участника' });
      }
      return jsonResponse_({ ok: true, personal: getPersonalCabinetPayload_(participantKey) });
    }

    if (action === 'dashboard') {
      const token = getParam_(e, 'token', '');
      return jsonResponse_({ ok: true, dashboard: getDashboardPayload_(token) });
    }

    if (action === 'sessions') {
      const token = getParam_(e, 'token', '');
      return jsonResponse_({ ok: true, sessions: getSessionsPayload_(token) });
    }

    if (action === 'admin_me') {
      const token = getParam_(e, 'token', '');
      return jsonResponse_({ ok: true, admin: requireAdminToken_(token) });
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

    if (action === 'admin_login') {
      return jsonResponse_({ ok: true, auth: adminLogin_(payload) });
    }

    if (action === 'admin_logout') {
      return jsonResponse_({ ok: true, result: adminLogout_(payload) });
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
    .filter(isNotEmptyRow_)
    .map(addRecordQuality_)
    .sort(sortByDateDescField_('submittedAt'));
}

function getSessionsPayload_(token) {
  requireAdminToken_(token);
  const rows = rowsToObjectsSafe_(SHEET_SESSIONS).filter(isNotEmptyRow_);
  return rows
    .map(sessionToDashboard_)
    .sort(sortByDateDescField_('updatedAt'));
}

function getDashboardPayload_(token) {
  const admin = requireAdminToken_(token);
  const sessions = rowsToObjectsSafe_(SHEET_SESSIONS)
    .filter(isNotEmptyRow_)
    .map(sessionToDashboard_)
    .sort(sortByDateDescField_('updatedAt'));
  const experiments = getExperimentsPayload_();
  const problemExperiments = experiments.filter(row => row.hasIssues);

  const summary = {
    totalSessions: sessions.length,
    draftSessions: sessions.filter(row => row.status === 'draft').length,
    submittedSessions: sessions.filter(row => row.status === 'submitted').length,
    activeSessions: sessions.filter(row => row.status !== 'submitted').length,
    totalExperiments: experiments.length,
    problemExperiments: problemExperiments.length,
    uniqueStudents: uniqueCount_(sessions.map(row => row.studentName || '')),
    recentUpdates24h: sessions.filter(row => isWithinHours_(row.updatedAt, 24)).length
  };

  return {
    admin: admin,
    summary: summary,
    sessions: sessions,
    experiments: experiments.slice(0, 500),
    problemExperiments: problemExperiments.slice(0, 500)
  };
}

function getPersonalCabinetPayload_(participantKey) {
  const sessionSheet = getOrCreateSheet_(SHEET_SESSIONS);
  ensureHeaders_(sessionSheet, SESSION_HEADERS);
  const sessionRow = getRowObjectByKey_(sessionSheet, 'participantKey', participantKey);
  const session = sessionRow ? sessionToClient_(sessionRow) : null;

  const experiments = getExperimentsPayload_()
    .filter(row => String(row.participantKey || '').trim() === String(participantKey || '').trim())
    .sort(sortByDateDescField_('submittedAt'));

  return {
    participantKey: participantKey,
    session: session,
    experiments: experiments,
    summary: {
      submissionsCount: experiments.length,
      lastSubmittedAt: experiments.length ? experiments[0].submittedAt : '',
      draftStatus: session ? session.status : 'not_found'
    }
  };
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

function adminLogin_(payload) {
  const usersSheet = getOrCreateSheet_(SHEET_ADMIN_USERS);
  ensureHeaders_(usersSheet, ADMIN_USER_HEADERS);
  const sessionsSheet = getOrCreateSheet_(SHEET_ADMIN_SESSIONS);
  ensureHeaders_(sessionsSheet, ADMIN_SESSION_HEADERS);

  const login = String(payload.login || '').trim();
  const password = String(payload.password || '');
  if (!login || !password) {
    throw new Error('Введите логин и пароль');
  }

  const users = rowsToObjectsSafe_(SHEET_ADMIN_USERS).filter(isNotEmptyRow_);
  if (!users.length) {
    throw new Error('Лист admin_users пуст. Добавьте администратора в таблицу.');
  }

  const adminUser = users.find(function(row) {
    return String(row.login || '').trim() === login && isActiveAdmin_(row);
  });

  if (!adminUser) {
    throw new Error('Администратор не найден или отключен');
  }

  if (!isAdminPasswordValid_(adminUser, password)) {
    throw new Error('Неверный пароль');
  }

  const token = generateAdminToken_();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ADMIN_SESSION_HOURS * 60 * 60 * 1000);
  const session = {
    token: token,
    login: login,
    display_name: adminUser.display_name || login,
    role: adminUser.role || 'admin',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    is_active: 'true'
  };
  appendObjectRow_(sessionsSheet, session);

  return {
    token: token,
    admin: {
      login: login,
      display_name: adminUser.display_name || login,
      role: adminUser.role || 'admin',
      expiresAt: session.expiresAt
    }
  };
}

function adminLogout_(payload) {
  const token = String(payload.token || '').trim();
  if (!token) {
    return { loggedOut: true };
  }

  const sheet = getOrCreateSheet_(SHEET_ADMIN_SESSIONS);
  ensureHeaders_(sheet, ADMIN_SESSION_HEADERS);
  const rowIndex = findRowIndexByKey_(sheet, 'token', token);
  if (rowIndex !== -1) {
    const row = getRowObjectByKey_(sheet, 'token', token) || {};
    row.is_active = 'false';
    upsertObjectByKey_(sheet, 'token', token, row);
  }
  return { loggedOut: true };
}

function requireAdminToken_(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new Error('Требуется вход администратора');
  }

  const sessionSheet = getOrCreateSheet_(SHEET_ADMIN_SESSIONS);
  ensureHeaders_(sessionSheet, ADMIN_SESSION_HEADERS);
  const row = getRowObjectByKey_(sessionSheet, 'token', normalizedToken);
  if (!row) {
    throw new Error('Сессия администратора не найдена');
  }
  if (!isTrue_(row.is_active)) {
    throw new Error('Сессия администратора отключена');
  }
  if (!row.expiresAt || new Date(row.expiresAt).getTime() < new Date().getTime()) {
    throw new Error('Сессия администратора истекла');
  }

  const userSheet = getOrCreateSheet_(SHEET_ADMIN_USERS);
  ensureHeaders_(userSheet, ADMIN_USER_HEADERS);
  const adminUser = getRowObjectByKey_(userSheet, 'login', row.login);
  if (!adminUser || !isActiveAdmin_(adminUser)) {
    throw new Error('Администратор отключен');
  }

  return {
    login: row.login,
    display_name: row.display_name || adminUser.display_name || row.login,
    role: row.role || adminUser.role || 'admin',
    expiresAt: row.expiresAt
  };
}

function addRecordQuality_(row) {
  const issues = calculateRecordIssues_(row);
  return Object.assign({}, row, {
    hasPhoto: !issues.missingPhoto,
    hasDeviationMap: !issues.missingMap,
    hasScanReport: !issues.missingReport,
    hasIssues: issues.hasIssues,
    issuesText: issues.issues.join(', '),
    issues: issues.issues,
    missingPhoto: issues.missingPhoto,
    missingMap: issues.missingMap,
    missingReport: issues.missingReport
  });
}

function calculateRecordIssues_(row) {
  const missingPhoto = !isHttpLink_(row.photoLink);
  const missingMap = !isHttpLink_(row.deviationMapLink);
  const missingReport = !isHttpLink_(row.scanReportLink);
  const issues = [];
  if (missingPhoto) issues.push('Нет фото');
  if (missingMap) issues.push('Нет карты');
  if (missingReport) issues.push('Нет отчета');
  return {
    missingPhoto: missingPhoto,
    missingMap: missingMap,
    missingReport: missingReport,
    hasIssues: issues.length > 0,
    issues: issues
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

  const headers = values[0].map(function(h) { return String(h || '').trim(); });
  return values.slice(1)
    .filter(function(row) { return row.some(function(cell) { return String(cell).trim() !== ''; }); })
    .map(function(row) {
      const obj = {};
      headers.forEach(function(header, idx) {
        obj[header] = row[idx];
      });
      return obj;
    });
}

function ensureHeaders_(sheet, expectedHeaders) {
  const currentHeaders = getHeaderRow_(sheet);
  const hasAnyHeader = currentHeaders.some(function(h) { return String(h || '').trim() !== ''; });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }

  const missingHeaders = expectedHeaders.filter(function(header) {
    return currentHeaders.indexOf(header) === -1;
  });
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
  const row = headers.map(function(header) { return normalizeValue_(rowObject[header]); });
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
  headers.forEach(function(header, index) {
    existingObject[header] = existingValues[index];
  });

  const merged = Object.assign({}, existingObject, rowObject);
  const row = headers.map(function(header) { return normalizeValue_(merged[header]); });
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
  headers.forEach(function(header, index) {
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

function sessionToDashboard_(row) {
  const client = sessionToClient_(row);
  const draft = client.draft || {};
  const completeness = calculateDraftCompleteness_(draft);
  return {
    participantKey: client.participantKey,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    status: client.status,
    studentName: client.studentName,
    groupName: client.groupName,
    variantCode: client.variantCode,
    taskTitle: client.taskTitle,
    currentStep: client.currentStep,
    sampleId: draft.sampleId || '',
    printerModel: draft.printerModel || '',
    shrinkageIntegral: draft.shrinkageIntegral || '',
    completenessPercent: completeness,
    draft: draft
  };
}

function calculateDraftCompleteness_(draft) {
  const importantFields = [
    'studentName','groupName','experimentDate','variantCode','printerModel','scannerModel',
    'materialName','nozzleTemperature','bedTemperature','printSpeed','layerHeight',
    'cadX','factX','cadY','factY','cadZ','factZ'
  ];
  const filled = importantFields.filter(function(field) {
    return String(draft[field] || '').trim() !== '';
  }).length;
  return Math.round((filled / importantFields.length) * 100);
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

function generateAdminToken_() {
  return 'ADM-' + Utilities.getUuid().replace(/-/g, '').toUpperCase();
}

function isAdminPasswordValid_(adminUser, password) {
  const storedHash = String(adminUser.password_hash || '').trim().toLowerCase();
  const storedPlain = String(adminUser.password_plain || '');
  if (storedHash) {
    return hashPassword_(password) === storedHash;
  }
  return storedPlain !== '' && storedPlain === password;
}

function isActiveAdmin_(row) {
  const flag = String(row.is_active || '').trim();
  if (!flag) return true;
  return isTrue_(flag);
}

function hashPassword_(value) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    const hex = normalized.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function isHttpLink_(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
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

function isNotEmptyRow_(row) {
  return row && Object.values(row).some(function(value) {
    return String(value || '').trim() !== '';
  });
}

function sortByNumericField_(fieldName) {
  return function(a, b) {
    return Number(a[fieldName] || 0) - Number(b[fieldName] || 0);
  };
}

function sortByDateDescField_(fieldName) {
  return function(a, b) {
    return String(b[fieldName] || '').localeCompare(String(a[fieldName] || ''));
  };
}

function uniqueCount_(values) {
  const filtered = values.filter(function(value) {
    return String(value || '').trim() !== '';
  });
  return Array.from(new Set(filtered)).length;
}

function isWithinHours_(isoString, hours) {
  if (!isoString) return false;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return false;
  const diffMs = new Date().getTime() - date.getTime();
  return diffMs <= hours * 60 * 60 * 1000;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
