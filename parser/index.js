import { chromium } from 'playwright';
import { CONFIG } from './config.js';
import { log, error } from './logger.js';
import { parseCategory } from './parser.js';
import { downloadImage } from './downloader.js';
import { saveToDatabase, updateImagePaths } from './database.js';

async function main() {
    log('info', 'app', '🚀 Запуск парсера Intersklad');
    log('info', 'app', `Категории: ${CONFIG.categories.join(', ')}`);

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,  // false — для отладки с видимым браузером
            args: ['--no-sandbox', '--disable-setuid-sandbox']  // для стабильности в некоторых средах
        });

        const allRecords = [];
        const imageUpdates = [];
        let totalDownloaded = 0;

        // Последовательная обработка категорий
        for (const [index, category] of CONFIG.categories.entries()) {
            log('info', 'app', `📁 Категория ${index + 1}/${CONFIG.categories.length}: ${category}`);

            const items = await parseCategory(browser, category);

            if (items.length === 0) {
                log('warn', 'app', `⚠️ Нет данных в категории ${category}, пропускаем`);
                continue;
            }

            // Обработка каждого товара
            for (const [i, item] of items.entries()) {
                log('debug', 'app', `  🖼️ [${i + 1}/${items.length}] ${item.name}`);

                const localPath = await downloadImage(item.imageFull, category, item.name);

                if (localPath) {
                    item.localPath = localPath;
                    imageUpdates.push({ linkFull: item.linkFull, localPath });
                    totalDownloaded++;
                } else {
                    log('warn', 'app', `  ⚠️ Не скачано: ${item.imageFull}`);
                }

                allRecords.push(item);

                // Микро-пауза между товарами (анти-бот)
                await new Promise(r => setTimeout(r, 300));
            }

            // Пауза между категориями
            if (index < CONFIG.categories.length - 1) {
                log('debug', 'app', `⏳ Пауза ${CONFIG.delays.request}мс перед следующей категорией`);
                await new Promise(r => setTimeout(r, CONFIG.delays.request));
            }
        }

        // Сохранение результатов
        log('info', 'app', '💾 Сохранение данных...');
        await saveToDatabase(allRecords);
        await updateImagePaths(imageUpdates);

        // Итоговый отчёт
        log('info', 'app', '✨ Парсинг завершён');
        log('info', 'app', `📊 Всего товаров: ${allRecords.length}`);
        log('info', 'app', `🖼️ Скачано фото: ${totalDownloaded}`);
        log('info', 'app', `📁 База: ${'/database.json'}`);
        log('info', 'app', `🖼️ Изображения: ${CONFIG.download.dir}/`);

    } catch (err) {
        error('app', err, '💥 Критическая ошибка');
        process.exitCode = 1;
    } finally {
        if (browser) {
            await browser.close();
            log('debug', 'app', '🔒 Браузер закрыт');
        }
    }
}

// Запуск
main();