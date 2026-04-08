// Импорт двух версий fs: promises для асинхронных операций, callback для потоков
import fsPromises from 'fs/promises';
import fs from 'fs';                          // ← createWriteStream здесь
import path from 'path';
import { pipeline } from 'stream/promises';
import { CONFIG } from './config.js';
import { log, error } from './logger.js';

export async function downloadImage(url, category, title) {
    try {
        // 1. Создаём папку для изображений (если нет)
        await fsPromises.mkdir(CONFIG.download.dir, { recursive: true });

        // 2. Санитизация имени файла:
        //    - заменяем все недопустимые символы на _
        //    - обрезаем до 50 символов, чтобы не превысить лимиты ОС
        const safeName = title.replace(/[^a-zа-яё0-9]/gi, '_').slice(0, 50);

        // 3. Определяем расширение файла из URL
        //    url.split('?')[0] — убираем параметры типа ?v=123
        const ext = path.extname(url.split('?')[0]) || '.jpg';

        // 4. Формируем имя и полный путь к файлу
        const filename = `${category}_${safeName}${ext}`;
        const localPath = path.join(CONFIG.download.dir, filename);

        // 5. HTTP-запрос на скачивание
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        // 6. Проверка статуса ответа
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        if (!response.body) throw new Error('Empty response body');

        // 7. Потоковая запись: читаем тело ответа → пишем в файл
        //    Не грузит всю картинку в память, эффективно для больших файлов
        await pipeline(response.body, fs.createWriteStream(localPath));

        log('debug', 'downloader', `Скачано: ${filename}`);
        return localPath;

    } catch (err) {
        error('downloader', err, `Не удалось скачать ${url}`);
        return null;
    }
}