import React from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { tokens } from '../theme/tokens';

export function SpatialImportLabScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.canvasA, padding: 18 }}>
      <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center', marginTop: 30, padding: 22, borderRadius: 22, backgroundColor: 'rgba(250,249,246,.92)', borderWidth: 1, borderColor: tokens.color.line }}>
        <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.3, color: tokens.color.peach }}>FORMSHIFT · SPATIAL IMPORT LAB</Text>
        <Text style={{ marginTop: 8, fontSize: 24, lineHeight: 30, fontWeight: '800', color: tokens.color.text }}>Reference import is web-first in this cycle.</Text>
        <Text style={{ marginTop: 8, fontSize: 11, lineHeight: 17, color: tokens.color.muted }}>The shared inspection contract already supports Polycam/RoomPlan JSON, glTF/GLB and Developer Mode archive inventory. Native document selection will be added only after the clean-room import contract is validated with a real Polycam export.</Text>
        <Text style={{ marginTop: 10, fontSize: 10, lineHeight: 16, color: tokens.color.muted }}>No imported file is allowed to overwrite canonical FormShift geometry. RoomPlan remains the preferred native capture source on supported iPhones.</Text>
        <Pressable onPress={() => {}} disabled style={{ marginTop: 14, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.6)', borderWidth: 1, borderColor: tokens.color.line }}><Text style={{ fontSize: 10, fontWeight: '800', color: tokens.color.muted }}>Native file picker pending real-export validation</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}
