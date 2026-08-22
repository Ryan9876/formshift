import type { DepthProvider } from './DepthProvider';

export function createDepthProvider(): DepthProvider {
  return {
    id: 'depth-anything-v2-small',
    model: 'Depth Anything V2 Small',
    modelVersion: 'onnx-community/depth-anything-v2-small-ONNX',
    isSupported: () => false,
    estimate: async () => {
      throw new Error('Local Depth Anything V2 Small inference is not enabled on this platform yet.');
    },
  };
}
