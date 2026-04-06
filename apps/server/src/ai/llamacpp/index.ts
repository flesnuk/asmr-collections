import type { WorkInfo } from '~/types/source';

export async function generateEmbedding(d: WorkInfo | string) {
  const apiUrl = process.env.LLAMACPP_API_URL || 'http://host.docker.internal:8111/v1/embeddings';

  let embeddingText: string;

  if (typeof d === 'string') {
    embeddingText = `Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: ${d}`;
  } else {
    const parts = [
      `Title: ${d.name}`,
      d.intro ? `Description: ${d.intro}` : '',
      d.series?.name ? `Series: ${d.series.name}` : '',
      d.genres?.length ? `Tags: ${d.genres.map(g => g.name).join(', ')}` : ''
    ];

    embeddingText = parts.filter(Boolean).join('\n  ');
  }

  const body = {
    input: [embeddingText],
    cache_prompt: false
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.error('Failed to generate embedding via llamacpp:', await res.text());
      return undefined;
    }

    const data = await res.json() as { data: Array<{ embedding: number[] }> };
    return data?.data?.at(0)?.embedding;
  } catch (err) {
    console.error('Error fetching llamacpp embedding:', err);
    return undefined;
  }
}
