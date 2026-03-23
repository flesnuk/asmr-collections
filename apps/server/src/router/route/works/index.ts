import type { Prisma } from '~/lib/prisma/client';

import type { FindManyWorksQuery } from './utils';

import { Hono } from 'hono';
import { IndexSearchQuerySchema } from '@asmr-collections/shared';

import { getPrisma } from '~/lib/db';
import { zValidator } from '~/lib/validator';
import { formatError } from '~/router/utils';

import { categorizeWorks, findManyByArtistCount, findManyByEmbedding, sortIdsBySeed, whereBuilder } from './utils';

export const worksApp = new Hono();

worksApp.get('/', zValidator('query', IndexSearchQuerySchema), async c => {
  const query = c.req.valid('query');

  // pagination
  const { page, limit, seed } = query;

  // filter
  const { artistCount, storageFilter } = query;

  // sort
  const { order, sort } = query;

  // search type
  const { embedding } = query;

  const include: Prisma.WorkInclude = {
    circle: true,
    series: true,
    artists: true,
    illustrators: true,
    genres: true,
    translationInfo: true
  };

  const where = whereBuilder(query);

  const queryArgs: FindManyWorksQuery = {
    where,
    orderBy: {
      [sort]: order
    },
    include
  };

  try {
    if (embedding)
      return c.json(await findManyByEmbedding(embedding, include));

    if (storageFilter) {
      const { stored, orphaned } = await categorizeWorks();
      if (storageFilter === 'only') {
        queryArgs.where = {
          ...queryArgs.where,
          id: { in: stored }
        };
      } else {
        queryArgs.where = {
          ...queryArgs.where,
          id: { in: orphaned }
        };
      }
    }

    const prisma = getPrisma();

    if (sort === 'random') {
      const allIds = await prisma.work.findMany({
        where: queryArgs.where,
        select: { id: true }
      });

      const shuffledIds = sortIdsBySeed(
        allIds.map(item => item.id),
        seed ?? 'random'
      );

      const total = shuffledIds.length;

      const offset = (page - 1) * limit;
      const slicedIds = shuffledIds.slice(offset, offset + limit);

      const works = await prisma.work.findMany({
        where: { id: { in: slicedIds } },
        include: queryArgs.include
      });

      const idToIndex = new Map(slicedIds.map((id, index) => [id, index]));
      const sorted = works.sort((a, b) => (idToIndex.get(a.id) ?? 0) - (idToIndex.get(b.id) ?? 0));

      return c.json({
        page,
        limit,
        total,
        data: sorted
      });
    }

    if (artistCount)
      return c.json(await findManyByArtistCount(queryArgs, artistCount, page, limit));

    const [works, total] = await prisma.$transaction([
      prisma.work.findMany({
        ...queryArgs,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.work.count({ where: queryArgs.where })
    ]);

    return c.json({
      page,
      limit,
      total,
      data: works
    });
  } catch (e) {
    console.error(e);
    return c.json(formatError(e), 500);
  }
});
