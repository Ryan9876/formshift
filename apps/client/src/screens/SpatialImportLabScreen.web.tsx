import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRoomWorkspace } from '../data/useRoomWorkspace';
import { compareSpatialImport, inspectSpatialImport } from '../spatial-import/inspect';
import type { BoundsMeters, SpatialImportBenchmark, SpatialImportEvidence } from '../spatial-import/types';
import { tokens } from '../theme/tokens';

const MAX_LOCAL_FILE_BYTES = 256 * 1024 * 1024;

export function SpatialImportLabScreen() {
  const workspace = useRoomWorkspace();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [benchmark, setBenchmark] = useState<SpatialImportBenchmark | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentContext = useMemo(() => {
    if (!workspace.project || !workspace.space) return 'No active FormShift room loaded';
    return `${workspace.project.name} · ${workspace.space.name}`;
  }, [workspace.project, workspace.space]);

  async function inspectFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      if (file.size > MAX_LOCAL_FILE_BYTES) {
        throw new Error('This v1 browser inspector limits a single local file to 256 MB. Use Polycam floorplan JSON or a smaller GLB/glTF export for the first benchmark; large Developer Mode archives can be analyzed separately without changing FormShift architecture.');
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const evidence = inspectSpatialImport({ fileName: file.name, sizeBytes: file.size, mimeType: file.type || undefined, bytes });
      const comparison = compareSpatialImport(evidence, workspace.workingSnapshot);
      setBenchmark({ evidence, comparison, snapshot: workspace.workingSnapshot });
    } catch (cause) {
      setBenchmark(null);
      setError(cause instanceof Error ? cause.message : 'The spatial export could not be inspected.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function copyReport() {
    if (!benchmark || !navigator.clipboard) return;
    await navigator.clipboard.writeText(JSON.stringify({ evidence: benchmark.evidence, comparison: benchmark.comparison }, null, 2));
    setCopied(true);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.color.canvasA }} contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
      <View style={{ width: '100%', maxWidth: 980, alignSelf: 'center', gap: 14 }}>
        <View style={cardStyle}>
          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: tokens.color.peach }}>FORMSHIFT · SPATIAL IMPORT LAB</Text>
          <Text style={{ marginTop: 8, fontSize: 28, lineHeight: 34, fontWeight: '800', color: tokens.color.text }}>Benchmark Polycam without making it a dependency.</Text>
          <Text style={bodyStyle}>Inspect Polycam/RoomPlan floorplan JSON, glTF/GLB meshes, or a Developer Mode/session ZIP inventory locally in this browser. The report is evidence only: it cannot overwrite measurements, spatial versions, or the immutable room photo.</Text>
          <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Badge text="Local-only inspection" />
            <Badge text="No Polycam API required" />
            <Badge text="No canonical mutation" />
          </View>
          <Text style={{ marginTop: 10, fontSize: 10, color: tokens.color.muted }}>Current comparison target: {currentContext}</Text>
          <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}>
            <Pressable onPress={() => inputRef.current?.click()} disabled={busy} style={primaryButtonStyle}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{busy ? 'Inspecting…' : 'Choose Polycam export'}</Text>
            </Pressable>
            <Pressable onPress={() => { window.location.href = '/'; }} style={secondaryButtonStyle}><Text style={{ color: tokens.color.text, fontWeight: '800', fontSize: 11 }}>Back to Studio</Text></Pressable>
            {busy ? <ActivityIndicator color={tokens.color.blue} /> : null}
            <input
              ref={inputRef}
              type="file"
              accept=".json,.gltf,.glb,.zip,application/json,model/gltf+json,model/gltf-binary,application/zip"
              onChange={(event) => { void inspectFile(event.currentTarget.files?.[0]); }}
              style={{ display: 'none' }}
            />
          </View>
          {error ? <Text style={{ marginTop: 12, color: '#A84C4C', fontSize: 11, lineHeight: 17 }}>{error}</Text> : null}
        </View>

        <View style={cardStyle}>
          <Text style={eyebrowStyle}>REFERENCE CAPTURE PACKAGE</Text>
          <Text style={titleStyle}>Best first Polycam benchmark</Text>
          <Text style={bodyStyle}>For the same room used in Prepared Scene, capture a new Polycam Space/Floorplan session. Enable Developer Mode before scanning if you want raw evidence. Export the structured floorplan JSON when available and a GLB or original glTF mesh. A session.zip is useful for inventorying raw keyframes/depth/camera evidence, but it is not required for the first comparison.</Text>
          <View style={{ marginTop: 10, gap: 5 }}>
            <Step n="1" text="Floorplan JSON — highest-value structural comparison: walls, floors, openings, objects, dimensions and transforms." />
            <Step n="2" text="GLB or original.gltf — mesh scale, bounds, scene coverage, vertex/primitive complexity and rendering reference." />
            <Step n="3" text="session.zip / Developer Mode — raw evidence inventory for later camera/depth/keyframe adapter work." />
          </View>
        </View>

        {benchmark ? <Report evidence={benchmark.evidence} comparison={benchmark.comparison} copied={copied} onCopy={copyReport} /> : (
          <View style={cardStyle}>
            <Text style={eyebrowStyle}>WAITING FOR EXPORT</Text>
            <Text style={titleStyle}>Nothing is uploaded until you choose a file—and even then it stays local.</Text>
            <Text style={bodyStyle}>This lab exists to tell us what a mature capture pipeline already knows about the room before FormShift writes more custom perception code.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Report({ evidence, comparison, copied, onCopy }: { evidence: SpatialImportEvidence; comparison: ReturnType<typeof compareSpatialImport>; copied: boolean; onCopy: () => Promise<void> }) {
  return (
    <>
      <View style={cardStyle}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 240 }}>
            <Text style={eyebrowStyle}>IMPORT EVIDENCE</Text>
            <Text style={titleStyle}>{evidence.source.fileName}</Text>
            <Text style={bodyStyle}>{evidence.source.provider} · {evidence.source.format} · {formatBytes(evidence.source.sizeBytes)} · confidence {evidence.confidence}</Text>
          </View>
          <Pressable onPress={() => void onCopy()} style={secondaryButtonStyle}><Text style={{ color: tokens.color.text, fontWeight: '800', fontSize: 11 }}>{copied ? 'Copied' : 'Copy report JSON'}</Text></Pressable>
        </View>
        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Badge text={`Units: ${evidence.coordinateSystem.unit}`} />
          <Badge text={`Up: ${evidence.coordinateSystem.upAxis}`} />
          <Badge text={`Handedness: ${evidence.coordinateSystem.handedness}`} />
          <Badge text="Canonical mutation: blocked" />
        </View>
      </View>

      {evidence.floorplan ? <View style={cardStyle}>
        <Text style={eyebrowStyle}>FLOORPLAN / ROOMPLAN</Text>
        <Text style={titleStyle}>{evidence.floorplan.walls} walls · {evidence.floorplan.floors} floors · {evidence.floorplan.objects} objects</Text>
        <MetricGrid values={[
          ['Doors', evidence.floorplan.doors], ['Windows', evidence.floorplan.windows], ['Openings', evidence.floorplan.openings], ['Sections', evidence.floorplan.sections],
          ['High confidence', evidence.floorplan.highConfidenceItems], ['Medium confidence', evidence.floorplan.mediumConfidenceItems], ['Low confidence', evidence.floorplan.lowConfidenceItems], ['Floor polygon pts', evidence.floorplan.floorPolygonPointCount],
        ]} />
        {evidence.floorplan.boundsMeters ? <BoundsView label="Imported structural bounds" bounds={evidence.floorplan.boundsMeters} /> : null}
        <Text style={{ marginTop: 8, fontSize: 10, color: tokens.color.muted }}>Categories: {formatCategories(evidence.floorplan.categories)}</Text>
      </View> : null}

      {evidence.mesh ? <View style={cardStyle}>
        <Text style={eyebrowStyle}>MESH / GLTF</Text>
        <Text style={titleStyle}>{evidence.mesh.meshCount} meshes · {evidence.mesh.primitiveCount} primitives · {evidence.mesh.nodeCount} nodes</Text>
        <MetricGrid values={[
          ['Scenes', evidence.mesh.sceneCount], ['Vertices', evidence.mesh.positionVertexCount ?? 'unknown'], ['Materials', evidence.mesh.materialCount], ['Images', evidence.mesh.imageCount],
        ]} />
        {evidence.mesh.boundsMeters ? <BoundsView label={`Metric bounds · ${evidence.mesh.boundsBasis ?? 'unknown basis'}`} bounds={evidence.mesh.boundsMeters} /> : null}
      </View> : null}

      {evidence.archive ? <View style={cardStyle}>
        <Text style={eyebrowStyle}>RAW ARCHIVE INVENTORY</Text>
        <Text style={titleStyle}>{evidence.archive.entryCount} entries · {evidence.archive.keyframeImageCount} keyframe images</Text>
        <MetricGrid values={[
          ['Depth-like', evidence.archive.likelyDepthEntryCount], ['Confidence-like', evidence.archive.likelyConfidenceEntryCount], ['Camera/pose-like', evidence.archive.likelyCameraEntryCount],
        ]} />
        <Text style={{ marginTop: 10, fontSize: 9, lineHeight: 14, color: tokens.color.muted }}>{evidence.archive.sampleEntries.join('\n')}</Text>
      </View> : null}

      {comparison ? <View style={cardStyle}>
        <Text style={eyebrowStyle}>FORMSHIFT COMPARISON</Text>
        <Text style={titleStyle}>External evidence vs current canonical room</Text>
        {comparison.importBoundsMeters ? <BoundsView label="Imported evidence bounds" bounds={comparison.importBoundsMeters} /> : null}
        {comparison.canonicalBoundsMeters ? <BoundsView label="Current FormShift bounds" bounds={comparison.canonicalBoundsMeters} /> : null}
        <View style={{ marginTop: 10, gap: 6 }}>{comparison.conclusions.map((text, index) => <Text key={index} style={bodyStyle}>• {text}</Text>)}</View>
      </View> : null}

      {(evidence.warnings.length || evidence.notes.length) ? <View style={cardStyle}>
        <Text style={eyebrowStyle}>INTERPRETATION</Text>
        {evidence.warnings.map((warning, index) => <Text key={`w-${index}`} style={{ ...bodyStyle, color: '#8B5A4A' }}>• {warning}</Text>)}
        {evidence.notes.map((note, index) => <Text key={`n-${index}`} style={bodyStyle}>• {note}</Text>)}
      </View> : null}
    </>
  );
}

function BoundsView({ label, bounds }: { label: string; bounds: BoundsMeters }) {
  return <View style={{ marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: 'rgba(40,199,232,.06)', borderWidth: 1, borderColor: 'rgba(40,199,232,.18)' }}><Text style={{ fontSize: 10, fontWeight: '800', color: tokens.color.text }}>{label}</Text><Text style={{ marginTop: 4, fontSize: 10, color: tokens.color.muted }}>size X/Y/Z: {bounds.size.map((value) => `${value.toFixed(3)} m`).join(' · ')}</Text><Text style={{ marginTop: 2, fontSize: 9, color: tokens.color.muted }}>center: {bounds.center.map((value) => value.toFixed(3)).join(', ')}</Text></View>;
}

function MetricGrid({ values }: { values: Array<[string, string | number]> }) {
  return <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{values.map(([label, value]) => <View key={label} style={{ minWidth: 112, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.65)', borderWidth: 1, borderColor: tokens.color.line }}><Text style={{ fontSize: 9, color: tokens.color.muted }}>{label}</Text><Text style={{ marginTop: 2, fontSize: 13, fontWeight: '800', color: tokens.color.text }}>{value}</Text></View>)}</View>;
}

function Step({ n, text }: { n: string; text: string }) { return <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}><View style={{ width: 22, height: 22, borderRadius: 22, backgroundColor: 'rgba(40,199,232,.1)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 9, fontWeight: '800', color: tokens.color.blue }}>{n}</Text></View><Text style={{ ...bodyStyle, flex: 1 }}>{text}</Text></View>; }
function Badge({ text }: { text: string }) { return <View style={{ paddingVertical: 5, paddingHorizontal: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.68)', borderWidth: 1, borderColor: tokens.color.line }}><Text style={{ fontSize: 9, fontWeight: '700', color: tokens.color.text }}>{text}</Text></View>; }
function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function formatCategories(categories: Record<string, number>) { const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]); return entries.length ? entries.slice(0, 12).map(([name, count]) => `${name} ${count}`).join(' · ') : 'none reported'; }

const cardStyle = { padding: 18, borderRadius: 22, backgroundColor: 'rgba(250,249,246,.9)', borderWidth: 1, borderColor: tokens.color.line } as const;
const eyebrowStyle = { fontSize: 9, fontWeight: '800' as const, letterSpacing: 1.3, color: tokens.color.peach };
const titleStyle = { marginTop: 6, fontSize: 18, lineHeight: 23, fontWeight: '800' as const, color: tokens.color.text };
const bodyStyle = { marginTop: 6, fontSize: 11, lineHeight: 17, color: tokens.color.muted };
const primaryButtonStyle = { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: tokens.color.blue };
const secondaryButtonStyle = { minHeight: 44, paddingHorizontal: 13, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: '#fff', borderWidth: 1, borderColor: tokens.color.line };
