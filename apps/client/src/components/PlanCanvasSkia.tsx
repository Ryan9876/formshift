import { Canvas, Rect, Line, Circle } from '@shopify/react-native-skia';
import { demoSnapshot, mmToInches, type SpatialObject, type SpatialSnapshot } from '@formshift/domain';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

const DESIGN_W = 720;
const DESIGN_H = 460;
const PAD_RATIO = 44 / DESIGN_W;

export default function PlanCanvas({
  snapshot = demoSnapshot,
  editable = true,
  editableObjectIds,
  onSnapshotChange,
}: {
  snapshot?: SpatialSnapshot;
  editable?: boolean;
  editableObjectIds?: string[];
  onSnapshotChange?: (snapshot: SpatialSnapshot) => void;
}) {
  const maxX = Math.max(...snapshot.boundary.floorPolygon.map((p) => p.x), 1);
  const maxZ = Math.max(...snapshot.boundary.floorPolygon.map((p) => p.z), 1);
  const [canvasWidth, setCanvasWidth] = useState(DESIGN_W);
  const canvasHeight = Math.max(240, canvasWidth * (DESIGN_H / DESIGN_W));
  const pad = Math.max(24, canvasWidth * PAD_RATIO);
  const scale = Math.min((canvasWidth - pad * 2) / maxX, (canvasHeight - pad * 2) / maxZ);
  const [selected, setSelected] = useState(snapshot.objects[0]?.id ?? '');
  const [positions, setPositions] = useState(() => positionsFrom(snapshot));
  const selectedObject = snapshot.objects.find((o) => o.id === selected);

  useEffect(() => {
    setPositions(positionsFrom(snapshot));
    setSelected((current) => snapshot.objects.some((object) => object.id === current) ? current : snapshot.objects[0]?.id ?? '');
  }, [snapshot]);

  const selectObject = useCallback((id: string) => setSelected(id), []);
  const moveObject = useCallback((id: string, x: number, z: number) => {
    setPositions((current) => ({ ...current, [id]: { x, z } }));
  }, []);
  const commitObject = useCallback((id: string, x: number, z: number) => {
    if (!onSnapshotChange) return;
    const next: SpatialSnapshot = {
      ...snapshot,
      objects: snapshot.objects.map((object) => object.id === id
        ? {
            ...object,
            transform: {
              ...object.transform,
              translation: { ...object.transform.translation, x, z },
            },
          }
        : object),
    };
    onSnapshotChange(next);
  }, [onSnapshotChange, snapshot]);

  return (
    <View style={styles.shell}>
      <View
        style={[styles.canvas, { height: canvasHeight }]}
        onLayout={(event) => {
          const next = Math.max(260, Math.min(DESIGN_W, event.nativeEvent.layout.width));
          if (Math.abs(next - canvasWidth) > 1) setCanvasWidth(next);
        }}
      >
        <Canvas style={{ width: '100%', height: canvasHeight }}>
          <Rect x={pad} y={pad} width={maxX * scale} height={maxZ * scale} color="#FAF9F5" />
          <Line p1={{ x: pad, y: pad }} p2={{ x: pad + maxX * scale, y: pad }} color="#676E6A" strokeWidth={3} />
          <Line p1={{ x: pad, y: pad }} p2={{ x: pad, y: pad + maxZ * scale }} color="#676E6A" strokeWidth={3} />
          <Line p1={{ x: pad + maxX * scale, y: pad }} p2={{ x: pad + maxX * scale, y: pad + maxZ * scale }} color="#676E6A" strokeWidth={3} />
          <Line p1={{ x: pad, y: pad + maxZ * scale }} p2={{ x: pad + maxX * scale, y: pad + maxZ * scale }} color="#676E6A" strokeWidth={3} />
          {snapshot.objects.map((o) => {
            const p = positions[o.id] ?? { x: o.transform.translation.x, z: o.transform.translation.z };
            const w = o.dimensions.width * scale;
            const d = o.dimensions.depth * scale;
            const x = pad + p.x * scale - w / 2;
            const y = pad + p.z * scale - d / 2;
            const active = o.id === selected;
            return <React.Fragment key={o.id}><Rect x={x} y={y} width={w} height={d} color={active ? tokens.color.blueSoft : '#D9D4C8'} /><Rect x={x} y={y} width={w} height={d} color={active ? tokens.color.blue : '#9E9A91'} strokeWidth={active ? 2.5 : 1} style="stroke" /></React.Fragment>;
          })}
          {selectedObject ? <Circle cx={pad + (positions[selected]?.x ?? selectedObject.transform.translation.x) * scale} cy={pad + (positions[selected]?.z ?? selectedObject.transform.translation.z) * scale} r={5} color={tokens.color.blue} /> : null}
        </Canvas>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {snapshot.objects.map((o) => {
            const p = positions[o.id] ?? { x: o.transform.translation.x, z: o.transform.translation.z };
            const w = o.dimensions.width * scale;
            const d = o.dimensions.depth * scale;
            const canEdit = editable && (!editableObjectIds || editableObjectIds.includes(o.id));
            return (
              <DragHandle
                key={o.id}
                object={o}
                position={p}
                left={pad + p.x * scale - w / 2}
                top={pad + p.z * scale - d / 2}
                width={w}
                height={d}
                scale={scale}
                maxX={maxX}
                maxZ={maxZ}
                editable={canEdit}
                selected={o.id === selected}
                onSelect={selectObject}
                onMove={moveObject}
                onCommit={commitObject}
              />
            );
          })}
        </View>
      </View>
      <View style={styles.measureBar}>
        <Text style={styles.measureTitle}>{selectedObject?.label ?? 'Room'}</Text>
        {selectedObject
          ? <Text style={styles.measureText}>{mmToInches(selectedObject.dimensions.width).toFixed(1)} × {mmToInches(selectedObject.dimensions.depth).toFixed(1)} in · dimensions stay fixed while dragging</Text>
          : <Text style={styles.measureText}>{snapshot.objects.length === 0 ? 'Add measured objects to begin arranging.' : 'Select an object to inspect its fixed footprint.'}</Text>}
      </View>
    </View>
  );
}

function DragHandle({
  object, position, left, top, width, height, scale, maxX, maxZ,
  editable, selected, onSelect, onMove, onCommit
}: {
  object: SpatialObject;
  position: { x: number; z: number };
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
  maxX: number;
  maxZ: number;
  editable: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  onCommit: (id: string, x: number, z: number) => void;
}) {
  const positionRef = useRef(position);
  positionRef.current = position;
  const start = useRef(position);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => editable && object.movable,
    onStartShouldSetPanResponderCapture: () => editable && object.movable,
    onMoveShouldSetPanResponder: (_, gesture) =>
      editable && object.movable && (Math.abs(gesture.dx) > 1 || Math.abs(gesture.dy) > 1),
    onPanResponderGrant: () => {
      start.current = { ...positionRef.current };
      onSelect(object.id);
    },
    onPanResponderMove: (_, gesture) => {
      if (!editable || !object.movable) return;
      const halfW = object.dimensions.width / 2;
      const halfD = object.dimensions.depth / 2;
      const next = {
        x: clamp(start.current.x + gesture.dx / scale, halfW, Math.max(halfW, maxX - halfW)),
        z: clamp(start.current.z + gesture.dy / scale, halfD, Math.max(halfD, maxZ - halfD)),
      };
      positionRef.current = next;
      onMove(object.id, next.x, next.z);
    },
    onPanResponderRelease: () => {
      onCommit(object.id, positionRef.current.x, positionRef.current.z);
    },
    onPanResponderTerminate: () => {
      onCommit(object.id, positionRef.current.x, positionRef.current.z);
    },
  }), [
    editable,
    maxX,
    maxZ,
    object.dimensions.depth,
    object.dimensions.width,
    object.id,
    object.movable,
    onCommit,
    onMove,
    onSelect,
    scale,
  ]);

  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={`Move ${object.label}`}
      {...pan.panHandlers}
      style={[styles.dragHandle, { left, top, width, height }]}
    >
      <Text style={[styles.objectLabel, selected && styles.objectLabelActive]}>
        {object.label}
      </Text>
    </View>
  );
}

function positionsFrom(snapshot: SpatialSnapshot) {
  return Object.fromEntries(snapshot.objects.map((object) => [object.id, { x: object.transform.translation.x, z: object.transform.translation.z }])) as Record<string, { x: number; z: number }>;
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
const styles = StyleSheet.create({
  shell: { width: '100%', borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.74)', borderWidth: 1, borderColor: tokens.color.line },
  canvas: { width: '100%', minHeight: 240, overflow: 'hidden' },
  dragHandle: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  objectLabel: { width: '100%', textAlign: 'center', fontSize: 10, color: tokens.color.muted, fontWeight: '600' },
  objectLabelActive: { color: tokens.color.blue, fontWeight: '800' },
  measureBar: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: tokens.color.line },
  measureTitle: { fontSize: 12, fontWeight: '800', color: tokens.color.text },
  measureText: { fontSize: 11, color: tokens.color.peach }
});
