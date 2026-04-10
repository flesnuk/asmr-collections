import type { DLsiteResponse, WorkInfo } from '~/types/source';

import * as cheerio from 'cheerio';

import { fetcher } from './fetcher';

const BASE_URI = 'https://www.dlsite.com';
const PROXY_URI = process.env.DLSITE_PROXY_URI;

/** Maps locale cookie value (e.g. 'zh-cn') to DLsite query param format (e.g. 'zh_CN') */
function toDLsiteLocale(locale: string): string {
  if (locale.startsWith('en')) return 'en_US';
  if (locale.startsWith('ja')) return 'ja_JP';
  return 'zh_CN';
}

export async function fetchDLsiteInfo(id: string, locale = 'zh-cn'): Promise<WorkInfo | null> {
  const dlLocale = toDLsiteLocale(locale);

  let currentBaseUri = BASE_URI;
  let product = await fetcher<Record<string, DLsiteResponse> | unknown[]>(`${currentBaseUri}/home/product/info/ajax?product_id=${id}&locale=${dlLocale}`);

  if (Array.isArray(product) && PROXY_URI) {
    currentBaseUri = PROXY_URI;
    product = await fetcher<Record<string, DLsiteResponse> | unknown[]>(`${currentBaseUri}/home/product/info/ajax?product_id=${id}&locale=${dlLocale}`);
  }

  if (Array.isArray(product))
    return null;

  const data = product[id];
  const other = await parserDLsiteHTML(id, locale, currentBaseUri);

  return {
    id,
    name: data.work_name,
    age_category: data.age_category,
    artists: other.artists,
    illustrators: other.illustrators,
    image_main: data.work_image,
    intro: other.intro,
    maker: other.maker,
    series: {
      id: data.title_id,
      name: data.title_name
    },
    genres: other.tags,
    release_date: new Date(data.regist_date),
    price: data.price,
    sales: data.dl_count,
    rating: data.rate_average_2dp,
    rating_count: data.rate_count,
    review_count: data.review_count,
    translation_info: data.translation_info,
    language_editions: data.dl_count_items?.filter(item => item.lang !== 'JPN').map(item => ({
      lang: item.lang,
      work_id: item.workno,
      label: item.display_label
    })),
    rating_count_detail: data.rate_count_detail,
    wishlist_count: data.wishlist_count
  };
}

async function parserDLsiteHTML(id: string, locale = 'zh-cn', baseUri = BASE_URI) {
  const dlLocale = toDLsiteLocale(locale);
  const str = await fetcher<string>(`${baseUri}/maniax/work/=/product_id/${id}.html/?locale=${dlLocale}`, {
    headers: {
      Cookie: `locale=${locale}`
    }
  });

  const $ = cheerio.load(str);

  const maker = $('table#work_maker').find('span.maker_name > a');
  const makerId = maker.attr('href')?.split('/').pop()?.replaceAll('.html', '');
  const makerName = maker.text().trim();

  if (!makerId || !makerName)
    throw new Error('解析社团信息时未能找到社团 ID 或名称');

  let artists: string[] = [];
  let illustrators: string[] = [];
  $('table#work_outline').find('th').each((_, el) => {
    const text = $(el).text().trim();

    if (text === '声優' || text === '声优' || text === 'Voice Actor')
      artists = $(el).parent('tr').find('td a').map((_, el) => $(el).text().trim()).toArray();

    else if (text === 'イラスト' || text === '插画' || text === 'Illustration')
      illustrators = $(el).parent('tr').find('td a').map((_, el) => $(el).text().trim()).toArray();
  });

  const tags = $('div.main_genre > a').map((_, el) => {
    return {
      id: Number.parseInt($(el).attr('href')?.match(/\d+/g)?.at(0) ?? '', 10),
      name: $(el).text().trim()
    };
  }).toArray();

  const quote = locale === 'en-us' ? '"' : '「';
  const intro = $('meta[name="description"]').attr('content')?.replace(new RegExp(`${quote}DLsite.*`), '').trim() ?? '';

  return {
    id,
    maker: {
      id: makerId,
      name: makerName
    },
    artists,
    illustrators,
    intro,
    tags
  };
}
