import type { SpatialSnapshot } from '@formshift/domain';
import type {
  BoundsMeters,
  SpatialImportComparison,
  SpatialImportEvidence,
  SpatialImportInspectionInput,
  SpatialImportProvider,
} from './types';

const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const ZIP_EOCD = 0x06054b50;
const ZIP_CENTRAL = 0x02014b50;

export function inspectSpatialImport(input: SpatialImportInspectionInput): SpatialImportEvidence {
  const extension = extensionOf(input.fileName);
  if (extension === 'glb') return inspectGlb(input);
  if (extension === 'gltf') return inspectGltfJson(input, decodeUtf8(input.bytes), 'gltf');
  if (extension === 'json') return inspectJson(input);
  if (extension === 'zip') return inspectZipInventory(input);
  return baseEvidence(input, 'unknown', 'unsupported', 'inventory', [
    'Unsupported import type. Use Polycam/RoomPlan JSON, glTF, GLB, or a Developer Mode/session ZIP inventory.',
  ]);
}

export function compareSpatialImport(evidence: SpatialImportEvidence, snapshot: SpatialSnapshot | null | undefined): SpatialImportComparison | null {
  if (!snapshot) return null;
  const canonicalBounds = canonicalSnapshotBounds(snapshot);
  const importBounds = evidence.floorplan?.boundsMeters ?? evidence.mesh?.boundsMeters;
  const conclusions: string[] = [];

  if (importBounds && canonicalBounds) {
    const dx = importBounds.size[0] - canonicalBounds.size[0];
    const dz = importBounds.size[2] - canonicalBounds.size[2];
    const dy = snapshot.boundary.ceilingHeightMm
      ? importBounds.size[1] - snapshot.boundary.ceilingHeightMm / 1000
      : undefined;
    conclusions.push(`Imported X/Z span differs from the current canonical boundary by ${signed(dx)} m / ${signed(dz)} m.`);
    if (dy !== undefined) conclusions.push(`Imported vertical span differs from the current ceiling height by ${signed(dy)} m.`);
  } else {
    conclusions.push('No directly comparable metric bounds are available from both sources yet.');
  }

  if (evidence.floorplan) {
    const importOpenings = evidence.floorplan.doors + evidence.floorplan.windows + evidence.floorplan.openings;
    conclusions.push(`Imported floorplan reports ${evidence.floorplan.objects} objects and ${importOpenings} openings; FormShift currently has ${snapshot.objects.length} objects and ${snapshot.openings.length} openings.`);
  } else if (evidence.mesh) {
    conclusions.push('Mesh evidence is useful for scale/coverage comparison but does not by itself identify FormShift semantic objects or openings.');
  }

  conclusions.push('This comparison is diagnostic only. Import evidence never replaces canonical FormShift geometry without an explicit review/adoption workflow.');

  return {
    importHasMetricBounds: !!importBounds,
    canonicalHasBoundary: snapshot.boundary.floorPolygon.length >= 3,
    importBoundsMeters: importBounds,
    canonicalBoundsMeters: canonicalBounds,
    spanDeltaMeters: importBounds && canonicalBounds ? {
      x: importBounds.size[0] - canonicalBounds.size[0],
      y: snapshot.boundary.ceilingHeightMm ? importBounds.size[1] - snapshot.boundary.ceilingHeightMm / 1000 : undefined,
      z: importBounds.size[2] - canonicalBounds.size[2],
    } : undefined,
    objectCountDelta: evidence.floorplan ? evidence.floorplan.objects - snapshot.objects.length : undefined,
    openingCountDelta: evidence.floorplan
      ? evidence.floorplan.doors + evidence.floorplan.windows + evidence.floorplan.openings - snapshot.openings.length
      : undefined,
    conclusions,
  };
}

function inspectGlb(input: SpatialImportInspectionInput): SpatialImportEvidence {
  const view = dataView(input.bytes);
  if (input.bytes.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
    return baseEvidence(input, providerFromName(input.fileName), 'glb', 'inventory', ['The file extension is GLB but the GLB header is invalid.']);
  }
  const version = view.getUint32(4, true);
  const declaredLength = view.getUint32(8, true);
  if (version !== 2) {
    return baseEvidence(input, providerFromName(input.fileName), 'glb', 'inventory', [`GLB version ${version} is not supported by this v1 inspector.`]);
  }
  if (declaredLength > input.bytes.byteLength) {
    return baseEvidence(input, providerFromName(input.fileName), 'glb', 'inventory', ['GLB declared length exceeds the supplied file length.']);
  }

  let offset = 12;
  while (offset + 8 <= declaredLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + chunkLength;
    if (end > declaredLength) break;
    if (chunkType === GLB_JSON_CHUNK) {
      const text = decodeUtf8(input.bytes.subarray(start, end)).replace(/[\u0000\s]+$/g, '');
      return inspectGltfJson(input, text, 'glb');
    }
    offset = end;
  }

  return baseEvidence(input, providerFromName(input.fileName), 'glb', 'inventory', ['GLB contains no readable JSON scene chunk.']);
}

function inspectGltfJson(input: SpatialImportInspectionInput, text: string, format: 'gltf' | 'glb'): SpatialImportEvidence {
  let document: any;
  try {
    document = JSON.parse(text);
  } catch {
    return baseEvidence(input, providerFromName(input.fileName), format, 'inventory', ['The glTF JSON metadata could not be parsed.']);
  }

  if (!document || typeof document !== 'object' || !document.asset) {
    return baseEvidence(input, providerFromName(input.fileName), format, 'inventory', ['The file does not contain a glTF asset object.']);
  }

  const provider = providerFromGltf(input.fileName, document);
  const nodes = array(document.nodes);
  const meshes = array(document.meshes);
  const accessors = array(document.accessors);
  const scenes = array(document.scenes);
  const materials = array(document.materials);
  const images = array(document.images);
  let primitiveCount = 0;
  let vertexCount = 0;
  let hasVertexCount = false;
  for (const mesh of meshes) {
    for (const primitive of array(mesh?.primitives)) {
      primitiveCount += 1;
      const accessorIndex = integer(primitive?.attributes?.POSITION);
      const accessor = accessorIndex === null ? null : accessors[accessorIndex];
      if (typeof accessor?.count === 'number' && Number.isFinite(accessor.count)) {
        vertexCount += accessor.count;
        hasVertexCount = true;
      }
    }
  }

  const worldBounds = gltfWorldBounds(document);
  const localBounds = worldBounds ?? gltfLocalBounds(document);
  const warnings: string[] = [];
  if (!localBounds) warnings.push('glTF POSITION accessors do not expose enough min/max metadata to derive metric bounds without reading binary geometry.');
  if (!worldBounds && localBounds) warnings.push('Metric bounds are based on local accessor min/max values because the scene graph could not be resolved completely.');
  if (format === 'gltf' && hasExternalUris(document)) warnings.push('This report inspects glTF metadata only; external geometry/textures are not uploaded or fetched.');

  return {
    ...baseEvidence(input, provider, format, localBounds ? 'measured-candidate' : 'structural', warnings),
    coordinateSystem: { unit: 'm', handedness: 'right', upAxis: 'y' },
    mesh: {
      assetVersion: string(document.asset?.version),
      sceneCount: scenes.length,
      nodeCount: nodes.length,
      meshCount: meshes.length,
      primitiveCount,
      positionVertexCount: hasVertexCount ? vertexCount : undefined,
      materialCount: materials.length,
      imageCount: images.length,
      boundsMeters: localBounds ?? undefined,
      boundsBasis: worldBounds ? 'accessor-minmax-with-node-transforms' : localBounds ? 'accessor-minmax-local-only' : undefined,
    },
    notes: [
      'glTF uses a right-handed, Y-up, meter-based scene convention; FormShift still treats the imported mesh as evidence until reviewed.',
      'Polycam glTF/GLB is suitable for coverage, scale, mesh and later camera/render comparison, not automatic semantic adoption.',
    ],
  };
}

function inspectJson(input: SpatialImportInspectionInput): SpatialImportEvidence {
  let document: any;
  try {
    document = JSON.parse(decodeUtf8(input.bytes));
  } catch {
    return baseEvidence(input, providerFromName(input.fileName), 'unknown-json', 'inventory', ['JSON could not be parsed.']);
  }
  if (looksLikeRoomPlan(document)) return inspectRoomPlanJson(input, document);
  if (document?.asset?.version) return inspectGltfJson(input, JSON.stringify(document), 'gltf');
  return baseEvidence(input, providerFromName(input.fileName), 'unknown-json', 'inventory', [
    'JSON is valid but does not look like Apple RoomPlan/CapturedRoom or glTF metadata.',
  ]);
}

function inspectRoomPlanJson(input: SpatialImportInspectionInput, document: any): SpatialImportEvidence {
  const provider: SpatialImportProvider = providerFromName(input.fileName) === 'polycam' ? 'polycam' : 'apple-roomplan';
  const roots = array(document?.rooms).length ? array(document.rooms) : [document];
  const walls = flattenKey(roots, 'walls');
  const floors = flattenKey(roots, 'floors');
  const doors = flattenKey(roots, 'doors');
  const windows = flattenKey(roots, 'windows');
  const openings = flattenKey(roots, 'openings');
  const objects = flattenKey(roots, 'objects');
  const sections = flattenKey(roots, 'sections');
  const allItems = [...walls, ...floors, ...doors, ...windows, ...openings, ...objects];
  const categories: Record<string, number> = {};
  let high = 0; let medium = 0; let low = 0;
  for (const item of allItems) {
    const category = roomPlanCaseName(item?.category) ?? roomPlanCaseName(item?.attributes) ?? 'unknown';
    categories[category] = (categories[category] ?? 0) + 1;
    const confidence = roomPlanCaseName(item?.confidence);
    if (confidence === 'high') high += 1;
    else if (confidence === 'medium') medium += 1;
    else if (confidence === 'low') low += 1;
  }

  const bounds = roomPlanBounds(allItems);
  const floorPolygonPointCount = floors.reduce((sum, floor) => sum + array(floor?.polygonCorners).length, 0);
  const warnings: string[] = [];
  if (!floors.length) warnings.push('No RoomPlan floor surface is present; floor-polygon comparison will be limited.');
  if (!bounds) warnings.push('RoomPlan items do not expose enough valid dimensions/transforms to derive metric bounds.');

  return {
    ...baseEvidence(input, provider, 'roomplan-json', bounds ? 'measured-candidate' : 'structural', warnings),
    coordinateSystem: { unit: 'm', handedness: 'right', upAxis: 'y' },
    floorplan: {
      identifier: string(document?.identifier) ?? string(roots[0]?.identifier),
      version: finite(document?.version) ?? finite(roots[0]?.version),
      story: finite(document?.story) ?? finite(roots[0]?.story),
      walls: walls.length,
      floors: floors.length,
      doors: doors.length,
      windows: windows.length,
      openings: openings.length,
      objects: objects.length,
      sections: sections.length,
      highConfidenceItems: high,
      mediumConfidenceItems: medium,
      lowConfidenceItems: low,
      categories,
      boundsMeters: bounds ?? undefined,
      floorPolygonPointCount,
    },
    notes: [
      'Apple RoomPlan dimensions/transforms are metric scene evidence and can be compared against FormShift measurements.',
      provider === 'polycam'
        ? 'Polycam floorplan JSON is treated as a RoomPlan-derived external evidence source, not as a privileged canonical format.'
        : 'RoomPlan JSON is treated as imported capture evidence until FormShift explicitly adopts reviewed measurements.',
    ],
  };
}

function inspectZipInventory(input: SpatialImportInspectionInput): SpatialImportEvidence {
  const names = zipCentralDirectoryNames(input.bytes);
  if (!names) return baseEvidence(input, providerFromName(input.fileName), 'zip-inventory', 'inventory', ['ZIP central directory could not be read. The archive may be truncated or use an unsupported layout.']);
  const lowered = names.map((name) => name.toLowerCase());
  const keyframes = lowered.filter((name) => /(^|\/)keyframes\/images\//.test(name) && !name.endsWith('/')).length;
  const depth = lowered.filter((name) => /depth|lidar/.test(name) && !name.endsWith('/')).length;
  const confidence = lowered.filter((name) => /confidence/.test(name) && !name.endsWith('/')).length;
  const camera = lowered.filter((name) => /camera|intrinsic|extrinsic|pose/.test(name) && !name.endsWith('/')).length;
  const provider = providerFromName(input.fileName) === 'polycam' || keyframes > 0 ? 'polycam' : 'unknown';
  return {
    ...baseEvidence(input, provider, 'zip-inventory', 'inventory', [
      'v1 inventories ZIP contents without decompressing raw capture files. No archive content is uploaded.',
    ]),
    archive: {
      entryCount: names.length,
      keyframeImageCount: keyframes,
      likelyDepthEntryCount: depth,
      likelyConfidenceEntryCount: confidence,
      likelyCameraEntryCount: camera,
      sampleEntries: names.filter((name) => !name.endsWith('/')).slice(0, 20),
    },
    notes: [
      'A Developer Mode/session archive can reveal which raw evidence classes are available before FormShift adds a decoder for a specific version.',
      'Raw archive inventory remains diagnostic and cannot mutate the canonical room model.',
    ],
  };
}

function baseEvidence(
  input: SpatialImportInspectionInput,
  provider: SpatialImportProvider,
  format: SpatialImportEvidence['source']['format'],
  confidence: SpatialImportEvidence['confidence'],
  warnings: string[],
): SpatialImportEvidence {
  return {
    schemaVersion: 'spatial-import-1',
    source: {
      provider,
      format,
      fileName: input.fileName,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
    },
    coordinateSystem: { unit: 'unknown', handedness: 'unknown', upAxis: 'unknown' },
    confidence,
    canonicalMutationAllowed: false,
    warnings,
    notes: [],
  };
}

function gltfWorldBounds(document: any): BoundsMeters | null {
  const nodes = array(document?.nodes);
  const scenes = array(document?.scenes);
  if (!nodes.length || !scenes.length) return null;
  const accumulator = emptyBounds();
  const roots = new Set<number>();
  for (const scene of scenes) for (const nodeIndex of array(scene?.nodes)) if (typeof nodeIndex === 'number') roots.add(nodeIndex);
  if (!roots.size) return null;
  const visiting = new Set<number>();
  for (const root of roots) walkNode(root, identityMatrix(), document, accumulator, visiting);
  return finishBounds(accumulator);
}

function walkNode(index: number, parent: number[], document: any, bounds: MutableBounds, visiting: Set<number>) {
  if (visiting.has(index)) return;
  const node = array(document?.nodes)[index];
  if (!node || typeof node !== 'object') return;
  visiting.add(index);
  const world = multiplyMatrix(parent, nodeMatrix(node));
  const meshIndex = integer(node.mesh);
  if (meshIndex !== null) includeMeshBounds(meshIndex, world, document, bounds);
  for (const child of array(node.children)) if (typeof child === 'number') walkNode(child, world, document, bounds, visiting);
  visiting.delete(index);
}

function includeMeshBounds(meshIndex: number, matrix: number[], document: any, bounds: MutableBounds) {
  const mesh = array(document?.meshes)[meshIndex];
  const accessors = array(document?.accessors);
  for (const primitive of array(mesh?.primitives)) {
    const accessorIndex = integer(primitive?.attributes?.POSITION);
    const accessor = accessorIndex === null ? null : accessors[accessorIndex];
    const min = vector3(accessor?.min);
    const max = vector3(accessor?.max);
    if (!min || !max) continue;
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) includePoint(bounds, transformPoint(matrix, [x, y, z]));
  }
}

function gltfLocalBounds(document: any): BoundsMeters | null {
  const accessors = array(document?.accessors);
  const meshes = array(document?.meshes);
  const accumulator = emptyBounds();
  for (const mesh of meshes) {
    for (const primitive of array(mesh?.primitives)) {
      const accessorIndex = integer(primitive?.attributes?.POSITION);
      const accessor = accessorIndex === null ? null : accessors[accessorIndex];
      const min = vector3(accessor?.min);
      const max = vector3(accessor?.max);
      if (!min || !max) continue;
      includePoint(accumulator, min); includePoint(accumulator, max);
    }
  }
  return finishBounds(accumulator);
}

function roomPlanBounds(items: any[]): BoundsMeters | null {
  const bounds = emptyBounds();
  for (const item of items) {
    const matrix = matrix16(item?.transform);
    const dimensions = vector3(item?.dimensions);
    if (matrix && dimensions) {
      const half: [number, number, number] = [Math.abs(dimensions[0]) / 2, Math.abs(dimensions[1]) / 2, Math.abs(dimensions[2]) / 2];
      for (const x of [-half[0], half[0]]) for (const y of [-half[1], half[1]]) for (const z of [-half[2], half[2]]) includePoint(bounds, transformPoint(matrix, [x, y, z]));
    }
    if (matrix) {
      for (const corner of array(item?.polygonCorners)) {
        const point = vector3(corner);
        if (point) includePoint(bounds, transformPoint(matrix, point));
      }
    }
  }
  return finishBounds(bounds);
}

function canonicalSnapshotBounds(snapshot: SpatialSnapshot): BoundsMeters | undefined {
  if (snapshot.boundary.floorPolygon.length < 3) return undefined;
  const xs = snapshot.boundary.floorPolygon.map((point) => point.x / 1000);
  const zs = snapshot.boundary.floorPolygon.map((point) => point.z / 1000);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minZ = Math.min(...zs); const maxZ = Math.max(...zs);
  const maxY = snapshot.boundary.ceilingHeightMm ? snapshot.boundary.ceilingHeightMm / 1000 : 0;
  return boundsFromMinMax([minX, 0, minZ], [maxX, maxY, maxZ]);
}

function looksLikeRoomPlan(document: any) {
  if (!document || typeof document !== 'object') return false;
  const keys = ['walls', 'floors', 'doors', 'windows', 'openings', 'objects', 'sections'];
  if (keys.some((key) => Array.isArray(document[key]))) return true;
  return array(document.rooms).some((room) => keys.some((key) => Array.isArray(room?.[key])));
}

function flattenKey(roots: any[], key: string) { return roots.flatMap((root) => array(root?.[key])); }
function roomPlanCaseName(value: any): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const keys = Object.keys(value);
  return keys.length ? keys[0] : undefined;
}

function providerFromGltf(fileName: string, document: any): SpatialImportProvider {
  const generator = `${document?.asset?.generator ?? ''}`.toLowerCase();
  if (generator.includes('polycam') || fileName.toLowerCase().includes('polycam')) return 'polycam';
  return 'generic-gltf';
}
function providerFromName(fileName: string): SpatialImportProvider {
  const name = fileName.toLowerCase();
  if (name.includes('polycam') || /(?:original|optimized|edited)_floorplan\.json$/.test(name) || name === 'session.zip') return 'polycam';
  return 'unknown';
}

function hasExternalUris(document: any) {
  return [...array(document?.buffers), ...array(document?.images)].some((entry) => typeof entry?.uri === 'string' && !entry.uri.startsWith('data:'));
}

function zipCentralDirectoryNames(bytes: Uint8Array): string[] | null {
  if (bytes.byteLength < 22) return null;
  const view = dataView(bytes);
  const minOffset = Math.max(0, bytes.byteLength - 65557);
  let eocd = -1;
  for (let offset = bytes.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_EOCD) { eocd = offset; break; }
  }
  if (eocd < 0) return null;
  const entryCount = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder('utf-8');
  const names: string[] = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount && offset + 46 <= bytes.byteLength; index += 1) {
    if (view.getUint32(offset, true) !== ZIP_CENTRAL) return null;
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.byteLength) return null;
    names.push(decoder.decode(bytes.subarray(nameStart, nameEnd)));
    offset = nameEnd + extraLength + commentLength;
  }
  return names;
}

function nodeMatrix(node: any): number[] {
  const matrix = matrix16(node?.matrix);
  if (matrix) return matrix;
  const translation = vector3(node?.translation) ?? [0, 0, 0];
  const scale = vector3(node?.scale) ?? [1, 1, 1];
  const rotation = quaternion(node?.rotation) ?? [0, 0, 0, 1];
  return trsMatrix(translation, rotation, scale);
}

function trsMatrix(t: [number, number, number], q: [number, number, number, number], s: [number, number, number]) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

function multiplyMatrix(a: number[], b: number[]) {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column += 1) for (let row = 0; row < 4; row += 1) {
    out[column * 4 + row] =
      a[0 * 4 + row]! * b[column * 4 + 0]!
      + a[1 * 4 + row]! * b[column * 4 + 1]!
      + a[2 * 4 + row]! * b[column * 4 + 2]!
      + a[3 * 4 + row]! * b[column * 4 + 3]!;
  }
  return out;
}
function transformPoint(matrix: number[], point: [number, number, number]): [number, number, number] {
  const [x, y, z] = point;
  return [
    matrix[0]! * x + matrix[4]! * y + matrix[8]! * z + matrix[12]!,
    matrix[1]! * x + matrix[5]! * y + matrix[9]! * z + matrix[13]!,
    matrix[2]! * x + matrix[6]! * y + matrix[10]! * z + matrix[14]!,
  ];
}

function identityMatrix() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
function matrix16(value: any): number[] | null { return Array.isArray(value) && value.length === 16 && value.every(number) ? value.map(Number) : null; }
function vector3(value: any): [number, number, number] | null { return Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every(number) ? [Number(value[0]), Number(value[1]), Number(value[2])] : null; }
function quaternion(value: any): [number, number, number, number] | null { return Array.isArray(value) && value.length >= 4 && value.slice(0, 4).every(number) ? [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])] : null; }
function number(value: any) { return typeof value === 'number' && Number.isFinite(value); }
function finite(value: any): number | undefined { return number(value) ? value : undefined; }
function integer(value: any): number | null { return Number.isInteger(value) && value >= 0 ? value : null; }
function string(value: any): string | undefined { return typeof value === 'string' && value ? value : undefined; }
function array(value: any): any[] { return Array.isArray(value) ? value : []; }
function extensionOf(name: string) { const match = name.toLowerCase().match(/\.([a-z0-9]+)$/); return match?.[1] ?? ''; }
function decodeUtf8(bytes: Uint8Array) { return new TextDecoder('utf-8').decode(bytes); }
function dataView(bytes: Uint8Array) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
function signed(value: number) { return `${value >= 0 ? '+' : ''}${value.toFixed(3)}`; }

type MutableBounds = { min: [number, number, number]; max: [number, number, number]; count: number };
function emptyBounds(): MutableBounds { return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], count: 0 }; }
function includePoint(bounds: MutableBounds, point: [number, number, number]) {
  for (let axis = 0; axis < 3; axis += 1) {
    bounds.min[axis] = Math.min(bounds.min[axis]!, point[axis]!);
    bounds.max[axis] = Math.max(bounds.max[axis]!, point[axis]!);
  }
  bounds.count += 1;
}
function finishBounds(bounds: MutableBounds): BoundsMeters | null { return bounds.count ? boundsFromMinMax(bounds.min, bounds.max) : null; }
function boundsFromMinMax(min: [number, number, number], max: [number, number, number]): BoundsMeters {
  return {
    min,
    max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
    center: [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2],
  };
}
