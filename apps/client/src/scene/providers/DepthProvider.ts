import type { DepthEstimate } from '../types';

export interface DepthProvider {
  readonly id: string;
  readonly model: string;
  readonly modelVersion: string;
  isSupported(): boolean;
  estimate(imageUrl: string): Promise<DepthEstimate>;
}
