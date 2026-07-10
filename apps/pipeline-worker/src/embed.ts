import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { EMBEDDING_MODEL } from '@bytebulletin/shared';

// Loaded exactly once per process — model init costs seconds and ~90 MB.
let extractorPromise: Promise<FeatureExtractionPipeline> | undefined;

// Resolving pipeline()'s task-string overloads trips TS2590 ("union type too
// complex to represent"), so call it through a narrowed signature instead.
const createPipeline = pipeline as unknown as (
  task: 'feature-extraction',
  model: string,
  options?: { dtype: 'q8' },
) => Promise<FeatureExtractionPipeline>;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  extractorPromise ??= createPipeline('feature-extraction', EMBEDDING_MODEL, { dtype: 'q8' });
  return extractorPromise;
}

/** Mean-pooled, L2-normalized 384-dim embedding. */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

/** Both inputs are L2-normalized, so the dot product IS the cosine similarity. */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error(`dimension mismatch: ${a.length} vs ${b.length}`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] as number) * (b[i] as number);
  return sum;
}

/** Element-wise mean of vectors, re-normalized to unit length. */
export function meanVector(vectors: ReadonlyArray<readonly number[]>): number[] {
  if (vectors.length === 0) throw new Error('meanVector of empty set');
  const dim = vectors[0]!.length;
  const mean = new Array<number>(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) mean[i]! += (v[i] as number) / vectors.length;
  }
  const norm = Math.sqrt(mean.reduce((s, x) => s + x * x, 0)) || 1;
  return mean.map((x) => x / norm);
}
