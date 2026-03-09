import * as z from 'zod';

export type PlaylistUpsert = z.infer<typeof PlaylistUpsertSchema>;
export const PlaylistUpsertSchema: z.ZodObject<{
  name: z.ZodString
  cover: z.ZodOptional<z.ZodString>
  intro: z.ZodOptional<z.ZodString>
}> = z.object({
  name: z.string(),
  cover: z.string().optional(),
  intro: z.string().optional()
});
