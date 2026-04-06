import type { WorkInfo } from '~/types/source';
import { generateEmbedding as generateEmbeddingJina } from './jina';
import { generateEmbedding as generateEmbeddingLlamacpp } from './llamacpp';

export async function generateEmbedding(d: WorkInfo | string) {
  if (process.env.EMBEDDING_API === 'llamacpp') {
    return generateEmbeddingLlamacpp(d);
  }
  return generateEmbeddingJina(d);
}
