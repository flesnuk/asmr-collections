import type { ParsedWorkInput } from '../utils';

import * as z from 'zod';

import { parseWorkInput } from '../utils';

const ParsedWorkInputSchema = z.object({
  isEmpty: z.boolean(),
  isValid: z.boolean(),
  validIds: z.array(z.string())
});

export type PlaylistUpsert = z.infer<typeof PlaylistUpsertSchema>;
export const PlaylistUpsertSchema: z.ZodObject<{
  name: z.ZodString
  cover: z.ZodOptional<z.ZodString>
  description: z.ZodOptional<z.ZodString>
  works: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
    isEmpty: z.ZodBoolean
    isValid: z.ZodBoolean
    validIds: z.ZodArray<z.ZodString>
  }>]>>, z.ZodTransform<ParsedWorkInput, string | {
    isEmpty: boolean
    isValid: boolean
    validIds: string[]
  } | undefined>>
}> = z.object({
  name: z.string(),
  cover: z.string().optional(),
  description: z.string().optional(),
  works: z
    .union([z.string(), ParsedWorkInputSchema])
    .optional()
    .transform(value => (typeof value === 'string' || typeof value === 'undefined' ? parseWorkInput(value) : value))
});
