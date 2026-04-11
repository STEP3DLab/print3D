# Apps Script для базы экспериментов

Этот файл нужен, чтобы страница `database.html` могла читать записи из листа `experiments`.

## Что делать

1. Откройте Google Sheets проекта.
2. Перейдите в **Расширения -> Apps Script**.
3. Замените текущий код содержимым файла `apps-script/Code.gs` из репозитория.
4. Нажмите **Deploy -> Manage deployments**.
5. Отредактируйте текущий Web App или создайте новый deployment.
6. Повторно опубликуйте Web App.

## Что добавлено

Теперь backend поддерживает:

- `?action=health`
- `?action=content`
- `?action=experiments`
- `POST` для записи новой строки в `experiments`

## Как проверить

После перепубликации откройте:

- `ВАШ_URL?action=health`
- `ВАШ_URL?action=content`
- `ВАШ_URL?action=experiments`

Если последний URL возвращает JSON с массивом `experiments`, страница `database.html` начнет работать полностью.
