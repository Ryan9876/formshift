import { z } from 'zod';

const vector3 = z.object({ x: z.number(), y: z.number(), z: z.number() });
const quaternion = z.object({ x: z.number(), y: z.number(), z: z.number(), w: z.number() });

// Keep the model-facing schema deliberately simple: no optional properties and no
// discriminated unions. This improves structured-output portability across AI
// Gateway providers. The deterministic domain layer validates type-specific fields.
export const organizeOutputSchema = z.object({
  proposals: z.array(z.object({
    title: z.string().min(1),
    rationale: z.string().min(1),
    expectedBenefits: z.array(z.string()),
    assumptions: z.array(z.string()),
    actions: z.array(z.object({
      type: z.enum(['move', 'rotate']),
      objectId: z.string().min(1),
      to: vector3.nullable(),
      rotation: quaternion.nullable()
    }))
  })).min(1).max(3)
});

export const buildBriefSchema = z.object({
  archetype: z.enum(['shelving', 'cabinet', 'storage', 'desk', 'bench', 'other']),
  purpose: z.string(),
  targetWidthMm: z.number().positive().nullable(),
  targetHeightMm: z.number().positive().nullable(),
  targetDepthMm: z.number().positive().nullable(),
  placementIntent: z.string(),
  materialPreferences: z.array(z.string()),
  constraints: z.array(z.string()),
  missingCriticalInformation: z.array(z.string())
});

export type OrganizeOutput = z.infer<typeof organizeOutputSchema>;
export type BuildBriefOutput = z.infer<typeof buildBriefSchema>;
