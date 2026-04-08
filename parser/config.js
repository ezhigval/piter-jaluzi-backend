export const CONFIG = {
    baseUrl: 'https://www.intersklad.ru',
    categories: [
        'tkani-vertikalnye',
        'lenta',
        'tkani-rulonnye',
        'plastik',
        'tkani-rulonnye-zebra'
    ],
    selectors: {
        slide: '.swiper-slide--equipment',
        link: 'a.equipment__slider-item',
        image: 'div.equipment__slider-img img',
        title: 'div.equipment__slider-info .equipment-title'
    },
    download: {
        dir: './images',
        timeout: 10000
    },
    delays: {
        pageLoad: 2000,
        request: 1500
    }
};