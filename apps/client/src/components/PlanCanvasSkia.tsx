import { Canvas, Rect, Line, Circle } from '@shopify/react-native-skia';
import { demoSnapshot, mmToInches, type SpatialSnapshot } from '@formshift/domain';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

const DESIGN_W = 720;
const DESIGN_H = 460;
const PAD_RATIO = 44 / DESIGN_W;

export function PlanCanvas({ snapshot = demoSnapshot, editable = true }: { snapshot?: SpatialSnapshot; editable?: boolean }) {
  const maxX = Math.max(...snapshot.boundary.floorPolygon.map((p) => p.x), 1);
  const maxZ = Math.max(...snapshot.boundary.floorPolygon.map((p) => p.z), 1);
  const [canvasWidth, setCanvasWidth] = useState(DESIGN_W);
  const canvasHeight = Math.max(240, canvasWidth * (DESIGN_H / DESIGN_W));
  const pad = Math.max(24, canvasWidth * PAD_RATIO);
  const scale = Math.min((canvasWidth - pad * 2) / maxX, (canvasHeight - pad * 2) / maxZ);
  const [selected, setSelected] = useState(snapshot.objects[0]?.id ?? '');
  const [positions, setPositions] = useState(() => Object.fromEntries(snapshot.objects.map((o) => [o.id, { x: o.transform.translation.x, z: o.transform.translation.z }])));
  const dragStart = useRef({ x: 0, z: 0 });

  const selectedObject = snapshot.objects.find((o) => o.id === selected);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => editable && !!selectedObject?.movable,
    onPanResponderGrant: () => { const p = positions[selected]; if (p) dragStart.current = { ...p }; },
    onPanResponderMove: (_, gesture) => {
      if (!selected || !selectedObject?.movable) return;
      const halfW = selectedObject.dimensions.width / 2;
      const halfD = selectedObject.dimensions.depth / 2;
      setPositions((current) => ({ ...current, [selected]: {
        x: clamp(dragStart.current.x + gesture.dx / scale, halfW, Math.max(halfW, maxX - halfW)),
        z: clamp(dragStart.current.z + gesture.dy / scale, halfD, Math.max(halfD, maxZ - halfD))
      } }));
    }
  }), [editable, maxX, maxZ, positions, scale, selected, selectedObject]);

  return (
    <View style={styles.shell}>
      <View
        style={[styles.canvas, { height: canvasHeight }]}
        onLayout={(event) => {
          const next = Math.max(260, Math.min(DESIGN_W, event.nativeEvent.layout.width));
          if (Math.abs(next - canvasWidth) > 1) setCanvasWidth(next);
        }}
        {...pan.panHandlers}
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
            return (
              <Text accessibilityRole="button" key={o.id} onPress={() => setSelected(o.id)} style={[styles.objectLabel, { left: pad + p.x * scale - 50, top: pad + p.z * scale - 10 }, o.id === selected && styles.objectLabelActive]}>
                {o.label}
              </Text>
            );
          })}
        </View>
      </View>
      <View style={styles.measureBar}>
        <Text style={styles.measureTitle}>{selectedObject?.label ?? 'Room'}</Text>
        {selectedObject ? <Text style={styles.measureText}>{mmToInches(selectedObject.dimensions.width).toFixed(1)} × {mmToInches(selectedObject.dimensions.depth).toFixed(1)} in · dimensions stay fixed while dragging</Text> : null}
      </View>
    </View>
  );
}
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
const styles = StyleSheet.create({
  shell: { width: '100%', borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.74)', borderWidth: 1, borderColor: tokens.color.line },
  canvas: { width: '100%', minHeight: 240, overflow: 'hidden' },
  objectLabel: { position: 'absolute', width: 100, textAlign: 'center', fontSize: 10, color: tokens.color.muted, fontWeight: '600' },
  objectLabelActive: { color: tokens.color.blue, fontWeight: '800' },
  measureBar: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: tokens.color.line },
  measureTitle: { fontSize: 12, fontWeight: '800', color: tokens.color.text },
  measureText: { fontSize: 11, color: tokens.color.peach }
});
