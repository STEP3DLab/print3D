# Step3D.Lab MVP

Минималистичный MVP сайта для GitHub Pages по проекту Step3D.Lab.

## Что уже реализовано
- стильная одностраничная витрина проекта
- описание лабораторной работы Step3D_01
- ссылки на STL, README и папку образца
- форма регистрации эксперимента
- автоматический расчет усадки по X, Y и Z
- автоматический расчет интегральной усадки
- генерация `sample_id`
- локальное сохранение черновика в браузере
- отправка данных в Google Apps Script и далее в Google Sheets
- загрузка файлов не напрямую, а через ссылки на облачные материалы студента или преподавателя

## Что нужно подключить после публикации
1. Создать Google Sheet с листом `Experiments`
2. Создать Google Apps Script из файла `apps-script/Code.gs`
3. Опубликовать Apps Script как Web App
4. Вставить URL Web App в переменную `APPS_SCRIPT_URL` в `index.html`
5. Включить GitHub Pages:
   - Repository Settings
   - Pages
   - Deploy from a branch
   - Branch: `main`
   - Folder: `/root`

## Минимальные поля в Google Sheets
- sampleId
- submittedAt
- studentName
- groupName
- experimentDate
- variantCode
- repeatCode
- printerModel
- scannerModel
- materialName
- nozzleTemperature
- printSpeed
- layerHeight
- cadX
- factX
- cadY
- factY
- cadZ
- factZ
- shrinkageX
- shrinkageY
- shrinkageZ
- shrinkageIntegral
- meanDeviation
- meanAbsDeviation
- rmsDeviation
- maxPositiveDeviation
- maxNegativeDeviation
- toleranceRatio
- photoLink
- deviationMapLink
- gcodeLink
- scanReportLink
- notes

## Публичные материалы образца
- Папка образца: https://github.com/STEP3DLab/Pi_theorem/tree/main/Step3D_01
- STL: https://github.com/STEP3DLab/Pi_theorem/blob/main/Step3D_01/Step3D_01.stl
