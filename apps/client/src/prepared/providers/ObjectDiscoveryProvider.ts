import type { ObjectDetectionCandidate } from '../types';

export type ObjectDiscoveryResult = {
  candidates: ObjectDetectionCandidate[];
  provider: string;
  model: string;
  modelVersion: string;
  processingMs: number;
};

export interface ObjectDiscoveryProvider {
  readonly id: string;
  readonly model: string;
  readonly modelVersion: string;
  isSupported(): boolean;
  discover(imageUrl: string): Promise<ObjectDiscoveryResult>;
}
