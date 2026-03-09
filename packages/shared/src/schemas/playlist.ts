import * as z from 'zod';

export type PlaylistUpsert = z.infer<typeof PlaylistUpsertSchema>;
export const PlaylistUpsertSchema: z.ZodObject<{
  name: z.ZodString
  cover: z.ZodOptional<z.ZodString>
  description: z.ZodOptional<z.ZodString>
}> = z.object({
  name: z.string(),
  cover: z.string().optional(),
  description: z.string().optional()
});
