import fsPromises from 'fs/promises';  // ← только promises-версия
import { log, error } from './logger.js';

const DB_PATH = './database.json';

export async function saveToDatabase(records) {
    try {
        let db = [];

        // Пробуем прочитать существующую БД
        try {
            const raw = await fsPromises.readFile(DB_PATH, 'utf-8');
            db = JSON.parse(raw);
        } catch (readErr) {
            // Файл не существует или повреждён — начинаем с нуля
            if (readErr.code !== 'ENOENT') {
                log('warn', 'database', `Не удалось прочитать БД: ${readErr.message}`);
            }
        }

        // Объединяем старые и новые записи
        db = [...db, ...records];

        // Сохраняем обратно в файл с форматированием
        await fsPromises.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

        log('info', 'database', `Сохранено ${records.length} записей (всего: ${db.length})`);
        return true;

    } catch (err) {
        error('database', err, 'Ошибка сохранения в БД');
        return false;
    }
}

export async function updateImagePaths(items) {
    // items: [{ linkFull: string, localPath: string }, ...]
    try {
        const raw = await fsPromises.readFile(DB_PATH, 'utf-8');
        let db = JSON.parse(raw);

        let updated = 0;

        // Проходим по всем записям в БД и обновляем localPath, если есть совпадение по linkFull
        db = db.map(record => {
            const match = items.find(i => i.linkFull === record.linkFull);
            if (match?.localPath) {
                record.localPath = match.localPath;
                updated++;
            }
            return record;
        });

        await fsPromises.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
        log('info', 'database', `Обновлено путей к фото: ${updated}`);
        return true;

    } catch (err) {
        error('database', err, 'Ошибка обновления путей к изображениям');
        return false;
    }
}