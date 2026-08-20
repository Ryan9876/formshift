import { applyActions, validateBuildObjectPlacement } from './spatial.js';
import type { SpatialObject, SpatialSnapshot, Vector3Mm } from './types.js';

export const OPEN_SHELVING_ARCHETYPE_VERSION = 'open-shelving-1' as const;
export const PLYWOOD_THICKNESS_MM = 19.05;
export const PLYWOOD_SHEET_WIDTH_MM = 1219.2;
export const PLYWOOD_SHEET_LENGTH_MM = 2438.4;
export const MAX_UNBRACED_SHELF_SPAN_MM = 1219.2;
export const DEFAULT_WASTE_FACTOR = 0.15;

export interface OpenShelvingDesignInput {
  objectId: string;
  label: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  interiorShelves: number;
}

export interface BuildComponentSpec {
  componentKey: string;
  label: string;
  quantity: number;
  dimensionsJson: {
    lengthMm: number;
    widthMm: number;
    thicknessMm: number;
  };
  materialKey: string;
  cutNotes: string;
  sortOrder: number;
}

export interface BuildMaterialSpec {
  materialKey: string;
  description: string;
  quantity: number;
  unit: string;
  dimensionsSpec: string | null;
  wasteFactor: number;
  confirmationRequired: boolean;
  assumptions: string[];
}

export interface BuildCostEstimate {
  lowAmount: number;
  expectedAmount: number;
  highAmount: number;
  currency: 'USD';
  wasteAssumption: number;
  assumptions: string[];
  exclusions: string[];
}

export interface BuildEffortEstimate {
  assumedSkillLevel: 'intermediate';
  difficulty: 'easy' | 'moderate' | 'advanced';
  activeLowHours: number;
  activeHighHours: number;
  elapsedLowHours: number | null;
  elapsedHighHours: number | null;
  toolProfile: string[];
  taskBreakdown: Array<{ task: string; lowHours: number; highHours: number }>;
  assumptions: string[];
}

export interface OpenShelvingPlanDraft {
  schemaVersion: 'build-plan-1';
  archetype: 'open_shelving';
  archetypeVersion: typeof OPEN_SHELVING_ARCHETYPE_VERSION;
  input: OpenShelvingDesignInput;
  object: SpatialObject;
  geometry: {
    widthMm: number;
    heightMm: number;
    depthMm: number;
    panelThicknessMm: number;
    interiorSpanMm: number;
    interiorShelves: number;
    sheetCountPlanning: number;
  };
  components: BuildComponentSpec[];
  materials: BuildMaterialSpec[];
  cost: BuildCostEstimate;
  effort: BuildEffortEstimate;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    assumptions: string[];
  };
}

export function createOpenShelvingPlan(
  snapshot: SpatialSnapshot,
  input: OpenShelvingDesignInput,
  placement?: Pick<Vector3Mm, 'x' | 'z'>,
): OpenShelvingPlanDraft {
  const errors = validateOpenShelvingInput(input);
  const bounds = roomBounds(snapshot);
  const position = placement ?? {
    x: bounds ? (bounds.minX + bounds.maxX) / 2 : input.widthMm / 2,
    z: bounds ? bounds.minZ + input.depthMm / 2 + 50 : input.depthMm / 2,
  };
  const object: SpatialObject = {
    id: input.objectId,
    label: input.label.trim() || 'Open shelving',
    category: 'custom_build',
    movable: true,
    measurementState: 'estimated',
    dimensions: { width: input.widthMm, height: input.heightMm, depth: input.depthMm },
    transform: {
      translation: { x: position.x, y: input.heightMm / 2, z: position.z },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    },
  };

  if (errors.length === 0) errors.push(...validateBuildObjectPlacement(snapshot, object));

  const innerSpan = Math.max(0, input.widthMm - 2 * PLYWOOD_THICKNESS_MM);
  if (innerSpan > MAX_UNBRACED_SHELF_SPAN_MM + 0.001) {
    errors.push('clear shelf span exceeds 48 in for the current unbraced archetype; reduce width or use a later center-divider/stiffener design');
  }

  const components = createComponents(input, innerSpan);
  for (const component of components) {
    const { lengthMm, widthMm } = component.dimensionsJson;
    if (!pieceFitsSheet(lengthMm, widthMm)) {
      errors.push(`${component.label} does not fit a standard 4 × 8 ft plywood sheet in this archetype.`);
    }
  }

  const totalPanelArea = components.reduce(
    (sum, component) => sum + component.quantity * component.dimensionsJson.lengthMm * component.dimensionsJson.widthMm,
    0,
  );
  const sheetArea = PLYWOOD_SHEET_WIDTH_MM * PLYWOOD_SHEET_LENGTH_MM;
  const sheetCount = Math.max(1, Math.ceil((totalPanelArea * (1 + DEFAULT_WASTE_FACTOR)) / sheetArea));
  const materials = createMaterials(sheetCount);
  const cost = createCostEstimate(sheetCount);
  const effort = createEffortEstimate(components);

  return {
    schemaVersion: 'build-plan-1',
    archetype: 'open_shelving',
    archetypeVersion: OPEN_SHELVING_ARCHETYPE_VERSION,
    input: { ...input },
    object,
    geometry: {
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      depthMm: input.depthMm,
      panelThicknessMm: PLYWOOD_THICKNESS_MM,
      interiorSpanMm: innerSpan,
      interiorShelves: input.interiorShelves,
      sheetCountPlanning: sheetCount,
    },
    components,
    materials,
    cost,
    effort,
    validation: {
      valid: errors.length === 0,
      errors: Array.from(new Set(errors)),
      warnings: [
        'Plywood sheet count is a planning quantity based on panel area plus 15% waste; confirm a cut layout before purchase.',
        'Material prices are generic planning allowances, not live retailer quotes.',
        'Finish, delivery, wall repair, electrical work, and site-specific anchoring hardware are excluded.',
        'Tall or heavily loaded freestanding shelving may need an anti-tip restraint; attachment design is outside this Class A slice.',
      ],
      assumptions: [
        'Freestanding rectangular open shelving.',
        'Nominal 3/4 in plywood construction with no full back panel.',
        'Unbraced clear shelf spans are limited to 48 in in this first archetype.',
        'Two rear plywood stretchers are included for basic carcass rigidity; this is not structural engineering.',
        'Build geometry is planning geometry until actual stock, site conditions, and as-built dimensions are verified.',
      ],
    },
  };
}

export function repositionOpenShelvingPlan(
  snapshot: SpatialSnapshot,
  plan: OpenShelvingPlanDraft,
  placement: Pick<Vector3Mm, 'x' | 'z'>,
): OpenShelvingPlanDraft {
  return createOpenShelvingPlan(snapshot, plan.input, placement);
}

export function previewOpenShelvingPlan(snapshot: SpatialSnapshot, plan: OpenShelvingPlanDraft): SpatialSnapshot {
  return applyActions(snapshot, [{ type: 'add', object: plan.object }]);
}

function validateOpenShelvingInput(input: OpenShelvingDesignInput): string[] {
  const errors: string[] = [];
  if (!input.objectId.trim()) errors.push('build object id is required');
  if (![input.widthMm, input.heightMm, input.depthMm].every(Number.isFinite)) errors.push('build dimensions must be finite');
  if (input.widthMm < 300) errors.push('shelving width must be at least 300 mm');
  if (input.heightMm < 300) errors.push('shelving height must be at least 300 mm');
  if (input.depthMm < 150) errors.push('shelving depth must be at least 150 mm');
  if (input.widthMm <= 2 * PLYWOOD_THICKNESS_MM + 100) errors.push('shelving width is too narrow for this panel construction');
  if (!Number.isInteger(input.interiorShelves) || input.interiorShelves < 0 || input.interiorShelves > 12) {
    errors.push('interior shelf count must be a whole number from 0 to 12');
  }
  return errors;
}

function createComponents(input: OpenShelvingDesignInput, innerSpan: number): BuildComponentSpec[] {
  const components: BuildComponentSpec[] = [
    {
      componentKey: 'side-panels', label: 'Side panels', quantity: 2,
      dimensionsJson: { lengthMm: input.heightMm, widthMm: input.depthMm, thicknessMm: PLYWOOD_THICKNESS_MM },
      materialKey: 'plywood-3-4', cutNotes: 'Keep the pair matched and square.', sortOrder: 10,
    },
    {
      componentKey: 'top-bottom', label: 'Top and bottom panels', quantity: 2,
      dimensionsJson: { lengthMm: innerSpan, widthMm: input.depthMm, thicknessMm: PLYWOOD_THICKNESS_MM },
      materialKey: 'plywood-3-4', cutNotes: 'Fits between side panels.', sortOrder: 20,
    },
  ];
  if (input.interiorShelves > 0) {
    components.push({
      componentKey: 'interior-shelves', label: 'Interior shelves', quantity: input.interiorShelves,
      dimensionsJson: { lengthMm: innerSpan, widthMm: input.depthMm, thicknessMm: PLYWOOD_THICKNESS_MM },
      materialKey: 'plywood-3-4', cutNotes: 'Space evenly unless the build brief requires otherwise.', sortOrder: 30,
    });
  }
  components.push({
    componentKey: 'rear-stretchers', label: 'Rear stretchers', quantity: 2,
    dimensionsJson: { lengthMm: innerSpan, widthMm: 76.2, thicknessMm: PLYWOOD_THICKNESS_MM },
    materialKey: 'plywood-3-4', cutNotes: 'Install high and low across the rear for carcass rigidity.', sortOrder: 40,
  });
  return components;
}

function createMaterials(sheetCount: number): BuildMaterialSpec[] {
  return [
    {
      materialKey: 'plywood-3-4',
      description: '3/4 in plywood, 4 × 8 ft sheet',
      quantity: sheetCount,
      unit: 'sheet',
      dimensionsSpec: '48 × 96 × 0.75 in nominal',
      wasteFactor: DEFAULT_WASTE_FACTOR,
      confirmationRequired: true,
      assumptions: ['Confirm grade, actual thickness, flatness, and cut nesting before purchase.'],
    },
    {
      materialKey: 'cabinet-screws',
      description: 'Wood/cabinet screws appropriate for 3/4 in plywood',
      quantity: 1,
      unit: 'box',
      dimensionsSpec: null,
      wasteFactor: 0,
      confirmationRequired: true,
      assumptions: ['Final screw gauge/length depends on joinery method and actual plywood thickness.'],
    },
    {
      materialKey: 'wood-glue',
      description: 'Interior wood glue',
      quantity: 1,
      unit: 'bottle',
      dimensionsSpec: null,
      wasteFactor: 0,
      confirmationRequired: false,
      assumptions: ['Small project bottle allowance.'],
    },
  ];
}

function createCostEstimate(sheetCount: number): BuildCostEstimate {
  return {
    lowAmount: roundMoney(sheetCount * 45 + 20),
    expectedAmount: roundMoney(sheetCount * 65 + 35),
    highAmount: roundMoney(sheetCount * 95 + 60),
    currency: 'USD',
    wasteAssumption: DEFAULT_WASTE_FACTOR,
    assumptions: [
      'Planning allowance per 4 × 8 ft plywood sheet: $45 low / $65 expected / $95 high.',
      'Generic allowance for screws and glue is included.',
    ],
    exclusions: ['Sales tax', 'Delivery', 'Finish/paint', 'Specialty joinery hardware', 'Anti-tip hardware', 'Tools'],
  };
}

function createEffortEstimate(components: BuildComponentSpec[]): BuildEffortEstimate {
  const pieceCount = components.reduce((sum, component) => sum + component.quantity, 0);
  const cuttingLow = roundHours(Math.max(0.75, pieceCount * 0.1));
  const cuttingHigh = roundHours(Math.max(1.5, pieceCount * 0.2));
  const assemblyLow = roundHours(1.25 + pieceCount * 0.08);
  const assemblyHigh = roundHours(2.25 + pieceCount * 0.18);
  const prepLow = 0.75;
  const prepHigh = 1.5;
  const activeLow = roundHours(cuttingLow + assemblyLow + prepLow);
  const activeHigh = roundHours(cuttingHigh + assemblyHigh + prepHigh);
  return {
    assumedSkillLevel: 'intermediate',
    difficulty: pieceCount <= 7 ? 'easy' : 'moderate',
    activeLowHours: activeLow,
    activeHighHours: activeHigh,
    elapsedLowHours: activeLow,
    elapsedHighHours: activeHigh,
    toolProfile: ['Tape measure', 'Square', 'Circular/track saw or table saw', 'Drill/driver', 'Clamps', 'Sander'],
    taskBreakdown: [
      { task: 'Layout and cutting', lowHours: cuttingLow, highHours: cuttingHigh },
      { task: 'Dry fit and assembly', lowHours: assemblyLow, highHours: assemblyHigh },
      { task: 'Edge prep and basic sanding', lowHours: prepLow, highHours: prepHigh },
    ],
    assumptions: ['Intermediate DIY skill', 'Straight square cuts', 'No finish cure time included', 'No wall anchoring or structural modification'],
  };
}

function roomBounds(snapshot: SpatialSnapshot) {
  if (snapshot.boundary.floorPolygon.length < 3) return null;
  const xs = snapshot.boundary.floorPolygon.map((point) => point.x);
  const zs = snapshot.boundary.floorPolygon.map((point) => point.z);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

function pieceFitsSheet(a: number, b: number) {
  const long = Math.max(a, b);
  const short = Math.min(a, b);
  return long <= PLYWOOD_SHEET_LENGTH_MM + 0.001 && short <= PLYWOOD_SHEET_WIDTH_MM + 0.001;
}

function roundMoney(value: number) { return Math.round(value * 100) / 100; }
function roundHours(value: number) { return Math.round(value * 4) / 4; }
