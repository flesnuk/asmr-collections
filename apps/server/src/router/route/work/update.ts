import type { WorkInfo } from '~/types/source';

import * as z from 'zod';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';

import { getPrisma } from '~/lib/db';
import { generateEmbedding } from '~/ai/jina';
import { zValidator } from '~/lib/validator';
import { fetchDLsiteInfo } from '~/lib/dlsite';
import { findwork, formatError, formatMessage, saveCoverImage } from '~/router/utils';

import { clearSimilarCache } from './similar';
import { getT } from '~/i18n';

export const updateApp = new Hono();

updateApp.put('/update/:id', async c => {
  const { id } = c.req.param();
  const locale = getCookie(c, 'locale') ?? 'zh-cn';
  const t = getT(locale);

  try {
    if (!await findwork(id))
      return c.json(formatMessage(t('收藏不存在')), 400);
  } catch (e) {
    console.error(e);
    return c.json(formatError(e), 500);
  }

  let data: WorkInfo | null;

  try {
    data = await fetchDLsiteInfo(id);
  } catch (e) {
    console.error(e);
    return c.json(formatError(e), 500);
  }

  if (!data) return c.json(formatMessage(t('DLsite 不存在此作品')), 404);

  try {
    const coverPath = await saveCoverImage(data.image_main, id);
    data.image_main = coverPath ?? data.image_main;
  } catch (e) {
    console.error(t('保存 cover 图片失败'), e);
  }

  try {
    const work = await updateWork(data, id);

    return c.json(work);
  } catch (e) {
    console.error(e);
    return c.json(formatError(e), 500);
  }
});

updateApp.put('/update/embedding/:id', async c => {
  const { id } = c.req.param();
  const locale = getCookie(c, 'locale') ?? 'zh-cn';
  const t = getT(locale);

  try {
    if (!await findwork(id))
      return c.json(formatMessage(t('收藏不存在')), 400);
  } catch (e) {
    console.error(e);
    return c.json(formatError(e), 500);
  }

  let data: WorkInfo | null;

  try {
    data = await fetchDLsiteInfo(id);
  } catch (e) {
    console.error(e);
    return c.json(formatError(e), 500);
  }

  if (!data) return c.json(formatMessage(t('DLsite 不存在此作品')), 404);
  const prisma = getPrisma();

  try {
    const embedding = await generateEmbedding(data);
    if (embedding) {
      const vectorString = `[${embedding.join(',')}]`;
      await prisma.$executeRaw`UPDATE "Work" SET embedding = ${vectorString}::vector WHERE id = ${id}`;
      await clearSimilarCache(id);
    }

    return c.json(formatMessage(t('向量更新成功')));
  } catch (e) {
    console.error(e);
    return c.json(formatError(e, t('生成向量失败')), 500);
  }
});

const updateGenresSchema = z.object({
  genres: z.array(z.object({
    id: z.number(),
    name: z.string().min(1)
  }))
});

updateApp.put('/update/genres/:id', zValidator('json', updateGenresSchema), async c => {
  const { id } = c.req.param();
  const locale = getCookie(c, 'locale') ?? 'zh-cn';
  const t = getT(locale);

  try {
    if (!await findwork(id))
      return c.json(formatMessage(t('收藏不存在')), 400);
  } catch (e) {
    console.error(e);
    return c.json(formatError(e), 500);
  }

  const { genres } = c.req.valid('json');
  const prisma = getPrisma();

  try {
    // Separate existing genres (id > 0) from new ones (id <= 0)
    const existingGenres = genres.filter(g => g.id > 0);
    const newGenres = genres.filter(g => g.id <= 0);

    // For new genres, generate IDs starting from max(maxId, 8999) + 1
    let nextId = 9000;
    if (newGenres.length > 0) {
      const maxGenre = await prisma.genre.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true }
      });
      nextId = Math.max(maxGenre?.id ?? 0, 8999) + 1;
    }

    const connectOrCreateOps = [
      ...existingGenres.map(g => ({
        where: { id: g.id },
        create: { id: g.id, name: g.name }
      })),
      ...newGenres.map((g, i) => ({
        where: { id: nextId + i },
        create: { id: nextId + i, name: g.name }
      }))
    ];

    const work = await prisma.work.update({
      where: { id },
      data: {
        genres: {
          set: [],
          connectOrCreate: connectOrCreateOps
        }
      },
      include: {
        circle: true,
        series: true,
        artists: true,
        illustrators: true,
        genres: true,
        translationInfo: true,
        playback: true
      }
    });

    return c.json(work);
  } catch (e) {
    console.error(e);
    return c.json(formatError(e), 500);
  }
});

export async function updateWork(data: WorkInfo, id: string) {
  const translationInfo = {
    isVolunteer: data.translation_info.is_volunteer,
    isOriginal: data.translation_info.is_original,
    isParent: data.translation_info.is_parent,
    isChild: data.translation_info.is_child,
    isTranslationBonusChild: data.translation_info.is_translation_bonus_child,
    originalWorkno: data.translation_info.original_workno,
    parentWorkno: data.translation_info.parent_workno,
    childWorknos: data.translation_info.child_worknos,
    lang: data.translation_info.lang
  };

  const prisma = getPrisma();

  await prisma.work.update({
    where: { id },
    data: {
      circle: {
        connectOrCreate: {
          where: { id: data.maker.id },
          create: {
            id: data.maker.id,
            name: data.maker.name
          }
        }
      },
      series: data.series?.id
        ? {
          connectOrCreate: {
            where: { id: data.series.id },
            create: {
              id: data.series.id,
              name: data.series.name
            }
          }
        }
        : undefined
    }
  });

  return prisma.work.update({
    where: { id },
    data: {
      id: data.id,
      name: data.name,
      cover: data.image_main,
      intro: data.intro,
      circle: {
        update: { name: data.maker.name }
      },
      series: data.series?.id
        ? {
          update: { name: data.series.name }
        }
        : undefined,
      artists: {
        connectOrCreate: data.artists?.map(artist => ({
          where: { name: artist },
          create: {
            name: artist
          }
        }))
      },
      illustrators: {
        connectOrCreate: data.illustrators?.map(illustrator => ({
          where: { name: illustrator },
          create: {
            name: illustrator
          }
        }))
      },
      ageCategory: data.age_category,
      genres: {
        connectOrCreate: data.genres?.map(genre => ({
          where: { id: genre.id },
          create: {
            id: genre.id,
            name: genre.name
          }
        }))
      },
      price: data.price ?? 0,
      sales: data.sales ?? 0,
      wishlistCount: data.wishlist_count,
      rate: data.rating ?? 0,
      rateCount: data.rating_count ?? 0,
      reviewCount: data.review_count ?? 0,
      originalId: data.translation_info.original_workno,
      translationInfo: {
        upsert: {
          create: translationInfo,
          update: translationInfo
        }
      },
      languageEditions: data.language_editions?.map(l => ({
        workId: l.work_id,
        label: l.label,
        lang: l.lang
      })),
      releaseDate: data.release_date
    },
    include: {
      circle: true,
      series: true,
      artists: true,
      illustrators: true,
      genres: true,
      translationInfo: true
    }
  });
}
