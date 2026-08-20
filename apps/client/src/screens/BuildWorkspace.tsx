import { type OpenShelvingPlanDraft, type SpatialSnapshot } from '@formshift/domain';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { BuildBlueprintPanel, BuildCutListTable } from '../components/BuildBlueprintPanel';
import { PlanCanvas } from '../components/PlanCanvas';
import { formatBuildInches, useBuildPlanner } from '../data/useBuildPlanner';
import { useRoomWorkspace } from '../data/useRoomWorkspace';
import { tokens } from '../theme/tokens';

type Tab = 'cut' | 'materials' | 'effort' | 'blueprint';

export function BuildWorkspace() {
  const workspace = useRoomWorkspace();
  const [preview, setPreview] = useState<SpatialSnapshot | null>(null);
  const [tab, setTab] = useState<Tab>('cut');
  const compact = useWindowDimensions().width < 980;
  const planner = useBuildPlanner({
    projectId: workspace.project?.id,
    spaceId: workspace.space?.id,
    activeVersionId: workspace.activeVersionId,
    snapshot: workspace.workingSnapshot,
    previewSnapshot: preview,
    onPreviewChange: setPreview,
    onAccepted: workspace.refresh,
  });

  useEffect(() => setPreview(null), [workspace.activeVersionId]);

  const buildObjectId = useMemo(() => {
    if (!preview || !workspace.workingSnapshot) return undefined;
    return preview.objects.find((o) => !workspace.workingSnapshot?.objects.some((base) => base.id === o.id))?.id;
  }, [preview, workspace.workingSnapshot]);

  const plan = planner.currentPlan;
  const canvas = preview ?? workspace.workingSnapshot;

  return (
    <SafeAreaView style={s.page}>
      <View style={[s.shell, compact && s.stack]}>
        <Sidebar compact={compact} project={workspace.project?.name} room={workspace.space?.name} onBlueprint={() => setTab('blueprint')} />
        <ScrollView style={s.workspace} contentContainerStyle={s.content}>
          <View style={s.header}>
            <View>
              <Text style={s.h1}>Build Intelligence</Text>
              <Text style={s.sub}>Design a real object, fit it to the committed room, then generate an authoritative build package.</Text>
            </View>
            <View style={s.headerActions}>
              <Text style={s.pill}>{workspace.space?.name ?? 'Current room'} · {measurementLabel(workspace.measurementSummary)}</Text>
              <Pressable style={s.ghost} onPress={() => router.replace('/')}><Text style={s.ghostText}>Back to Studio</Text></Pressable>
            </View>
          </View>

          {workspace.loading ? <Loading /> : !workspace.workingSnapshot ? (
            <View style={s.empty}><Text style={s.h2}>Create room geometry first.</Text><Text style={s.body}>Build requires a committed spatial version.</Text></View>
          ) : (
            <>
              <View style={[s.grid, compact && s.stack]}>
                <Controls planner={planner} photoUrl={workspace.photoUrl} />
                <View style={s.canvasCard}>
                  <View style={s.cardHead}><Text style={s.kicker}>ROOM FIT</Text><Text style={s.badge}>{plan ? (plan.validation.valid ? 'Fit validated' : 'Needs adjustment') : 'Committed layout'}</Text></View>
                  {canvas ? <PlanCanvas snapshot={canvas} editable={!!buildObjectId && !planner.accepted} editableObjectIds={buildObjectId ? [buildObjectId] : undefined} onSnapshotChange={setPreview} /> : null}
                  <Text style={s.canvasHint}>{plan ? (planner.accepted ? 'Accepted placement is committed.' : 'Drag only the blue Build footprint. Existing room objects stay locked.') : 'Generate a plan to place it in the room.'}</Text>
                </View>
                <Summary planner={planner} plan={plan} measurement={workspace.measurementSummary} />
              </View>

              <View style={s.details}>
                <View style={s.tabs}>
                  {(['cut','materials','effort','blueprint'] as Tab[]).map((value) => (
                    <Pressable key={value} style={[s.tab, tab === value && s.tabActive]} onPress={() => setTab(value)}>
                      <Text style={[s.tabText, tab === value && s.tabTextActive]}>{tabLabel(value)}</Text>
                    </Pressable>
                  ))}
                  {tab === 'blueprint' && Platform.OS === 'web' ? <Pressable style={s.print} onPress={printPage}><Text style={s.printText}>Print / save PDF</Text></Pressable> : null}
                </View>
                {!plan ? <View style={s.emptySmall}><Text style={s.h2}>Build details will appear here.</Text></View>
                  : tab === 'cut' ? <BuildCutListTable plan={plan} />
                  : tab === 'materials' ? <Materials plan={plan} />
                  : tab === 'effort' ? <Effort plan={plan} />
                  : <BuildBlueprintPanel plan={plan} />}
              </View>
            </>
          )}
          <Text style={s.footer}>FormShift · deterministic geometry is authoritative · AI normalizes intent only</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Sidebar({ compact, project, room, onBlueprint }: { compact: boolean; project?: string; room?: string; onBlueprint: () => void }) {
  if (compact) return <View style={s.mobileNav}><View style={s.brandRow}><BrandMark size={34}/><View><Text style={s.brand}>FormShift</Text><Text style={s.kicker}>BUILD INTELLIGENCE</Text></View></View><Pressable style={s.ghost} onPress={() => router.replace('/')}><Text style={s.ghostText}>Studio</Text></Pressable></View>;
  return <View style={s.nav}><View><View style={s.brandRow}><BrandMark size={38}/><View><Text style={s.brand}>FormShift</Text><Text style={s.tagline}>Shape the space around you.</Text></View></View><View style={s.project}><Text style={s.projectTitle}>{project ?? 'My Project'}</Text><Text style={s.meta}>{room ?? 'Room'}</Text></View><View style={s.navList}><Nav label="Overview" onPress={() => router.replace('/')}/><Nav label="Organize" onPress={() => router.replace('/')}/><Nav label="Arrange" onPress={() => router.replace('/')}/><Nav label="Build" active/><Nav label="Blueprints" onPress={onBlueprint}/></View></View><Text style={s.navNote}>Planning output. Verify stock, site and as-built conditions before construction.</Text></View>;
}
function Nav({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) { return <Pressable onPress={onPress} style={[s.navItem, active && s.navItemActive]}><View style={[s.dot, active && s.dotActive]}/><Text style={[s.navText, active && s.navTextActive]}>{label}</Text></Pressable>; }

function Controls({ planner, photoUrl }: { planner: ReturnType<typeof useBuildPlanner>; photoUrl?: string | null }) {
  return <View style={s.panel}><Text style={s.kicker}>YOUR BUILD</Text><Text style={s.h2}>{planner.normalized?.label ?? 'Describe what the room needs.'}</Text><Text style={s.body}>AI reads the brief. FormShift computes the geometry, fit, materials and effort.</Text><TextInput value={planner.brief} onChangeText={planner.setBrief} multiline style={s.brief} editable={!planner.accepting}/><Pressable style={[s.primary, (planner.normalizing || planner.accepting) && s.disabled]} disabled={planner.normalizing || planner.accepting} onPress={() => void planner.normalizeBrief()}><Text style={s.primaryText}>{planner.normalizing ? 'Understanding request…' : planner.normalized ? 'Re-read request' : 'Start build plan'}</Text></Pressable>{planner.error ? <Text style={s.error}>{planner.error}</Text> : null}{planner.normalized && planner.supported ? <View style={s.form}><Text style={s.sectionTitle}>Dimensions</Text><Dim label="Width" value={planner.widthIn} set={planner.setWidthIn} disabled={planner.accepted}/><Dim label="Height" value={planner.heightIn} set={planner.setHeightIn} disabled={planner.accepted}/><Dim label="Depth" value={planner.depthIn} set={planner.setDepthIn} disabled={planner.accepted}/><Dim label="Interior shelves" value={planner.interiorShelves} set={planner.setInteriorShelves} disabled={planner.accepted} unit=""/><Text style={s.micro}>Nominal 3/4 in plywood · max 48 in clear unsupported span.</Text>{!planner.accepted ? <Pressable style={s.ghost} onPress={planner.generatePlan}><Text style={s.ghostText}>{planner.currentPlan ? 'Update plan' : 'Generate plan & preview'}</Text></Pressable> : null}</View> : null}{planner.normalized && !planner.supported ? <Text style={s.error}>{planner.unsupportedReason}</Text> : null}{photoUrl ? <View><Text style={s.kicker}>SOURCE ROOM PHOTO</Text><Image source={{uri: photoUrl}} style={s.photo}/><Text style={s.micro}>Visual evidence only · geometry remains authoritative.</Text></View> : null}</View>;
}
function Dim({label,value,set,disabled,unit='in'}:{label:string;value:string;set:(v:string)=>void;disabled:boolean;unit?:string}) { return <View style={s.dimRow}><Text style={s.meta}>{label}</Text><View style={s.dimWrap}><TextInput value={value} onChangeText={set} editable={!disabled} keyboardType="decimal-pad" style={s.dimInput}/>{unit ? <Text style={s.meta}>{unit}</Text> : null}</View></View>; }

function Summary({ planner, plan, measurement }: { planner: ReturnType<typeof useBuildPlanner>; plan: OpenShelvingPlanDraft | null; measurement: 'needs_dimensions'|'estimated'|'measured'|'mixed' }) {
  return <View style={s.summaryCol}><View style={s.panel}><Text style={s.kicker}>BUILD PLAN SUMMARY</Text><Text style={s.h2}>{plan?.object.label ?? 'No plan yet'}</Text>{plan ? <><Text style={s.sectionTitle}>Cost range · materials</Text><View style={s.costs}><Cost label="Low" value={plan.cost.lowAmount}/><Cost label="Expected" value={plan.cost.expectedAmount} blue/><Cost label="High" value={plan.cost.highAmount}/></View><Text style={s.sectionTitle}>Estimated effort</Text><Text style={s.metric}>{plan.effort.activeLowHours}–{plan.effort.activeHighHours} hours</Text><Text style={s.meta}>{capitalize(plan.effort.difficulty)} · {formatBuildInches(plan.geometry.widthMm)} × {formatBuildInches(plan.geometry.heightMm)} × {formatBuildInches(plan.geometry.depthMm)} in</Text></> : <Text style={s.body}>Generate a plan to see cost, effort and fit.</Text>}</View><View style={s.panel}><Text style={s.sectionTitle}>Materials</Text>{plan ? plan.materials.map(m => <View key={m.materialKey} style={s.matRow}><View style={s.matIcon}/><Text style={s.matName}>{m.description}</Text><Text style={s.meta}>{m.quantity} {m.unit}</Text></View>) : <Text style={s.body}>Materials appear after generation.</Text>}</View><View style={[s.acceptBox, plan?.validation.valid && s.acceptReady]}><Text style={s.h2}>{planner.accepted ? 'Build plan accepted' : plan?.validation.valid ? 'Ready to accept' : plan ? 'Needs adjustment' : 'Waiting for plan'}</Text><Text style={s.body}>{planner.accepted ? planner.savedMessage : plan?.validation.valid ? 'No collision, boundary, ceiling or span violations.' : plan?.validation.errors[0] ?? `Room geometry: ${measurementLabel(measurement)}.`}</Text>{planner.accepted ? <Pressable style={s.ghost} onPress={planner.startNewBuild}><Text style={s.ghostText}>Start another build</Text></Pressable> : <Pressable disabled={!plan?.validation.valid || planner.accepting} style={[s.primary, (!plan?.validation.valid || planner.accepting) && s.disabled]} onPress={() => void planner.acceptPlan()}><Text style={s.primaryText}>{planner.accepting ? 'Accepting plan…' : 'Accept build plan'}</Text></Pressable>}</View></View>;
}
function Cost({label,value,blue}:{label:string;value:number;blue?:boolean}) { return <View style={s.cost}><Text style={s.meta}>{label}</Text><Text style={[s.costValue, blue && {color: tokens.color.blue}]}>${value.toFixed(0)}</Text></View>; }

function Materials({plan}:{plan:OpenShelvingPlanDraft}) { return <View style={s.detailGrid}><View style={s.detailCard}><Text style={s.sectionTitle}>Materials</Text>{plan.materials.map(m=><View key={m.materialKey} style={s.line}><Text style={s.body}>{m.description}</Text><Text style={s.meta}>{m.quantity} {m.unit}</Text></View>)}</View><View style={s.detailCard}><Text style={s.sectionTitle}>Planning allowance</Text><Text style={s.big}>${plan.cost.expectedAmount.toFixed(0)}</Text><Text style={s.body}>Likely range ${plan.cost.lowAmount.toFixed(0)}–${plan.cost.highAmount.toFixed(0)} · {Math.round(plan.cost.wasteAssumption*100)}% waste allowance.</Text></View></View>; }
function Effort({plan}:{plan:OpenShelvingPlanDraft}) { return <View style={s.detailGrid}><View style={s.detailCard}><Text style={s.sectionTitle}>Effort range</Text><Text style={s.big}>{plan.effort.activeLowHours}–{plan.effort.activeHighHours} hrs</Text><Text style={s.body}>{capitalize(plan.effort.difficulty)} · {plan.effort.assumedSkillLevel} assumed skill</Text></View><View style={s.detailCard}><Text style={s.sectionTitle}>Tasks</Text>{plan.effort.taskBreakdown.map(t=><View key={t.task} style={s.line}><Text style={s.body}>{t.task}</Text><Text style={s.meta}>{t.lowHours}–{t.highHours} h</Text></View>)}</View><View style={s.detailCard}><Text style={s.sectionTitle}>Tools</Text><Text style={s.body}>{plan.effort.toolProfile.join(' · ')}</Text></View></View>; }
function Loading(){return <View style={s.empty}><ActivityIndicator color={tokens.color.blue}/><Text style={s.h2}>Loading Build workspace…</Text></View>;}
function tabLabel(t:Tab){return t==='cut'?'Cut list':t==='materials'?'Materials & cost':t==='effort'?'Effort':'Blueprint';}
function measurementLabel(v:'needs_dimensions'|'estimated'|'measured'|'mixed'){return v==='measured'?'Measured':v==='estimated'?'Estimated':v==='mixed'?'Mixed evidence':'Needs dimensions';}
function capitalize(v:string){return v.charAt(0).toUpperCase()+v.slice(1);}
function printPage(){if(Platform.OS==='web'&&typeof window!=='undefined')window.print();}

const s=StyleSheet.create({
  page:{flex:1,backgroundColor:'#F1EEE7'},shell:{flex:1,flexDirection:'row',padding:8,gap:6},stack:{flexDirection:'column'},workspace:{flex:1,borderRadius:24,backgroundColor:'rgba(250,249,246,.84)'},content:{padding:18,gap:14,minHeight:'100%'},nav:{width:205,padding:18,borderRadius:22,backgroundColor:'rgba(245,243,237,.96)',borderWidth:1,borderColor:tokens.color.line,justifyContent:'space-between'},mobileNav:{padding:10,borderRadius:18,backgroundColor:'rgba(245,243,237,.96)',borderWidth:1,borderColor:tokens.color.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brandRow:{flexDirection:'row',alignItems:'center',gap:9},brand:{fontSize:18,fontWeight:'800',color:tokens.color.text},tagline:{fontSize:8,color:tokens.color.peach},project:{marginTop:24,padding:10,borderRadius:11,backgroundColor:'rgba(255,255,255,.62)',borderWidth:1,borderColor:tokens.color.line},projectTitle:{fontSize:10,fontWeight:'800',color:tokens.color.text},navList:{marginTop:18,gap:4},navItem:{minHeight:40,paddingHorizontal:9,borderRadius:11,flexDirection:'row',alignItems:'center',gap:8},navItemActive:{backgroundColor:'rgba(207,229,236,.65)'},dot:{width:7,height:7,borderRadius:7,borderWidth:1,borderColor:'#9BA3A3'},dotActive:{backgroundColor:tokens.color.blue,borderColor:tokens.color.blue},navText:{fontSize:10,fontWeight:'700',color:tokens.color.muted},navTextActive:{color:tokens.color.blue,fontWeight:'800'},navNote:{fontSize:7,lineHeight:11,color:tokens.color.muted,borderTopWidth:1,borderTopColor:tokens.color.line,paddingTop:12},header:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:12},headerActions:{flexDirection:'row',flexWrap:'wrap',gap:7,alignItems:'center'},h1:{fontSize:24,fontWeight:'800',letterSpacing:-.5,color:tokens.color.text},h2:{fontSize:13,fontWeight:'800',color:tokens.color.text},sub:{marginTop:3,fontSize:10,lineHeight:15,color:tokens.color.muted,maxWidth:650},kicker:{fontSize:8,fontWeight:'800',letterSpacing:1.1,color:tokens.color.peach},body:{fontSize:8,lineHeight:13,color:tokens.color.muted},meta:{fontSize:8,color:tokens.color.muted},pill:{fontSize:8,fontWeight:'700',paddingHorizontal:10,paddingVertical:8,borderRadius:10,backgroundColor:'rgba(255,255,255,.68)',borderWidth:1,borderColor:tokens.color.line,color:tokens.color.text},ghost:{minHeight:36,paddingHorizontal:11,borderRadius:10,borderWidth:1,borderColor:tokens.color.line,backgroundColor:'rgba(255,255,255,.68)',alignItems:'center',justifyContent:'center'},ghostText:{fontSize:8,fontWeight:'800',color:tokens.color.text},primary:{minHeight:38,paddingHorizontal:11,borderRadius:10,backgroundColor:tokens.color.blue,alignItems:'center',justifyContent:'center'},primaryText:{fontSize:8,fontWeight:'800',color:'#fff'},disabled:{opacity:.42},grid:{flexDirection:'row',alignItems:'flex-start',gap:10},panel:{width:260,maxWidth:'100%',padding:13,borderRadius:15,backgroundColor:'rgba(255,255,255,.78)',borderWidth:1,borderColor:tokens.color.line,gap:8},brief:{minHeight:76,padding:9,borderRadius:10,backgroundColor:'rgba(250,250,248,.94)',borderWidth:1,borderColor:tokens.color.line,color:tokens.color.text,fontSize:9,textAlignVertical:'top'},error:{fontSize:8,lineHeight:12,color:'#A84C4C'},form:{borderTopWidth:1,borderTopColor:tokens.color.line,paddingTop:8,gap:5},sectionTitle:{fontSize:9,fontWeight:'800',color:tokens.color.text},dimRow:{minHeight:31,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},dimWrap:{flexDirection:'row',alignItems:'center',gap:3},dimInput:{minWidth:66,paddingHorizontal:7,paddingVertical:5,borderRadius:8,borderWidth:1,borderColor:tokens.color.line,backgroundColor:'rgba(246,246,243,.92)',fontSize:9,fontWeight:'700',color:tokens.color.text,textAlign:'right'},micro:{fontSize:7,lineHeight:10,color:tokens.color.muted},photo:{width:'100%',height:92,borderRadius:9,backgroundColor:'#E8E4DA',marginTop:4},canvasCard:{flex:1,minWidth:0,overflow:'hidden',borderRadius:16,backgroundColor:'rgba(255,255,255,.78)',borderWidth:1,borderColor:tokens.color.line},cardHead:{paddingHorizontal:12,paddingVertical:9,flexDirection:'row',justifyContent:'space-between',gap:8},badge:{fontSize:7,fontWeight:'800',color:tokens.color.blue,backgroundColor:'rgba(13,116,150,.07)',paddingHorizontal:7,paddingVertical:4,borderRadius:999},canvasHint:{paddingHorizontal:11,paddingVertical:7,fontSize:7,lineHeight:11,color:tokens.color.muted,borderTopWidth:1,borderTopColor:tokens.color.line},summaryCol:{width:240,maxWidth:'100%',gap:8},costs:{flexDirection:'row',gap:4},cost:{flex:1},costValue:{fontSize:15,fontWeight:'800',color:'#356D59'},metric:{fontSize:14,fontWeight:'800',color:tokens.color.text},matRow:{minHeight:30,flexDirection:'row',alignItems:'center',gap:7,borderTopWidth:1,borderTopColor:'rgba(42,61,66,.08)',paddingTop:6},matIcon:{width:12,height:12,borderRadius:3,backgroundColor:'#E9DCC4',borderWidth:1,borderColor:'#B8A17C'},matName:{flex:1,fontSize:7,lineHeight:10,color:tokens.color.text},acceptBox:{width:240,maxWidth:'100%',padding:12,borderRadius:14,borderWidth:1,borderColor:tokens.color.line,backgroundColor:'rgba(255,255,255,.7)',gap:7},acceptReady:{backgroundColor:'rgba(53,109,89,.07)',borderColor:'rgba(53,109,89,.18)'},details:{padding:12,borderRadius:16,backgroundColor:'rgba(255,255,255,.76)',borderWidth:1,borderColor:tokens.color.line,gap:10},tabs:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:4,borderBottomWidth:1,borderBottomColor:tokens.color.line,paddingBottom:5},tab:{paddingHorizontal:9,paddingVertical:7,borderRadius:8},tabActive:{backgroundColor:'rgba(13,116,150,.08)'},tabText:{fontSize:8,fontWeight:'700',color:tokens.color.muted},tabTextActive:{fontWeight:'800',color:tokens.color.blue},print:{marginLeft:'auto',paddingHorizontal:9,paddingVertical:7,borderRadius:8,backgroundColor:tokens.color.blue},printText:{fontSize:7,fontWeight:'800',color:'#fff'},empty:{minHeight:340,padding:28,alignItems:'center',justifyContent:'center',gap:7},emptySmall:{padding:24,alignItems:'center'},detailGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},detailCard:{flex:1,minWidth:220,padding:11,borderRadius:11,backgroundColor:'rgba(241,238,231,.55)',gap:6},line:{flexDirection:'row',justifyContent:'space-between',gap:8,borderTopWidth:1,borderTopColor:'rgba(42,61,66,.08)',paddingTop:6},big:{fontSize:22,fontWeight:'800',color:tokens.color.blue},footer:{fontSize:7,color:tokens.color.muted,textAlign:'right'},
});
