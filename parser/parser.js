import { chromium } from 'playwright';
import { load } from 'cheerio';
import { CONFIG } from './config.js';
import { log, error } from './logger.js';

export async function parseCategory(browser, category) {
    const url = `${CONFIG.baseUrl}/catalog/${category}/?count=1000`;
    log('info', 'parser', `Начинаю парсинг: ${category}`);

    const page = await browser.newPage();

    // Эмуляция обычного браузера
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
    });

    try {
        // Загрузка страницы с ожиданием завершения сетевых запросов
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Дополнительная пауза для отработки динамических скриптов (Swiper, lazy-load)
        await page.waitForTimeout(CONFIG.delays.pageLoad);

        // Ожидание появления целевых элементов
        await page.waitForSelector(CONFIG.selectors.slide, { timeout: 10000 }).catch(() => {
            log('warn', 'parser', `Элементы "${CONFIG.selectors.slide}" не найдены на ${category}`);
        });

        // Получаем итоговый HTML после выполнения всего JS
        const html = await page.content();
        const $ = load(html);  // Передаём в Cheerio для парсинга
        const items = [];

        // Итерируемся по всем карточкам товаров
        $(CONFIG.selectors.slide).each((_, slide) => {
            const $slide = $(slide);
            const $link = $slide.find(CONFIG.selectors.link);

            // Извлекаем данные
            const href = $link.attr('href');
            const title = $slide.find(CONFIG.selectors.title).text().trim();
            const imgRel = $slide.find(CONFIG.selectors.image).attr('src');

            // Добавляем в результат только полные записи
            if (href && title && imgRel) {
                items.push({
                    category,
                    name: title,
                    imageRel: imgRel,
                    imageFull: `${CONFIG.baseUrl}${imgRel}`,
                    linkRel: href,
                    linkFull: `${CONFIG.baseUrl}${href}`,
                    localPath: null  // Заполнится после скачивания
                });
            }
        });

        log('info', 'parser', `Найдено ${items.length} товаров в ${category}`);
        return items;

    } catch (err) {
        error('parser', err, `Ошибка при парсинге ${category}`);
        return [];
    } finally {
        // Гарантированно закрываем страницу, даже если произошла ошибка
        await page.close();
    }
}