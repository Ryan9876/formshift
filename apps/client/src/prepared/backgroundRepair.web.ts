export async function repairPreparedSceneBackground(input: {
  projectId?: string;
  spaceId?: string;
  accessToken?: string;
  sourceCanvas: HTMLCanvasElement;
  maskDataUrl: string;
}) {
  if (!input.projectId || !input.spaceId || !input.accessToken) {
    throw new Error('Sign in with edit access before requesting high-quality background repair.');
  }
  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!apiBase) throw new Error('The FormShift image service is not configured.');

  const prepared = await resizedPair(input.sourceCanvas, input.maskDataUrl, 1100);
  const startedAt = performance.now();
  const response = await fetch(`${apiBase}/api/ai/repair-background`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: input.projectId,
      spaceId: input.spaceId,
      sourceDataUrl: prepared.sourceDataUrl,
      maskDataUrl: prepared.maskDataUrl,
      mode: 'prepared-scene',
    }),
  });

  let body: { imageDataUrl?: string; modelUsed?: string; message?: string; error?: string } = {};
  try { body = await response.json(); } catch { /* handled below */ }
  if (!response.ok || !body.imageDataUrl) {
    throw new Error(body.message || body.error || `Background repair failed with HTTP ${response.status}.`);
  }
  return {
    imageDataUrl: body.imageDataUrl,
    modelUsed: body.modelUsed ?? 'unknown',
    processingMs: Math.round(performance.now() - startedAt),
  };
}

async function resizedPair(source: HTMLCanvasElement, maskDataUrl: string, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext('2d');
  if (!sourceContext) throw new Error('Prepared Scene repair source is unavailable.');
  sourceContext.drawImage(source, 0, 0, width, height);

  const maskImage = await loadImage(maskDataUrl);
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskContext = maskCanvas.getContext('2d');
  if (!maskContext) throw new Error('Prepared Scene repair mask is unavailable.');
  maskContext.imageSmoothingEnabled = false;
  maskContext.drawImage(maskImage, 0, 0, width, height);

  return {
    sourceDataUrl: sourceCanvas.toDataURL('image/jpeg', 0.9),
    maskDataUrl: maskCanvas.toDataURL('image/png'),
  };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Prepared Scene repair mask could not be loaded.'));
    image.src = url;
  });
}
