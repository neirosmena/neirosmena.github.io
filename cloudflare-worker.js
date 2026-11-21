/**
 * Cloudflare Worker — прокси к сайту на Netlify.
 *
 * Зачем: домашний Wi-Fi не открывает IP Netlify, но Cloudflare доступен.
 * Worker принимает запросы на своём адресе *.workers.dev и проксирует их
 * на neirosmena.netlify.app. Форма Netlify Forms продолжает работать,
 * потому что POST-запросы тоже проходят через прокси.
 *
 * Как установить — в README.md, раздел «Если сайт не открывается с Wi-Fi».
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = "neirosmena.netlify.app";

    return fetch(new Request(url.toString(), request));
  }
};
