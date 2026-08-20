import { applyActions, validateOrganizeActions, type LayoutAction, type SpatialSnapshot } from '@formshift/domain';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { tokens } from '../theme/tokens';

type Proposal = {
  id: string;
  title: string;
  rationale: string;
  expectedBenefits: string[];
  assumptions: string[];
  actions: LayoutAction[];
  geometryValidation: { valid: boolean; errors: string[] };
};

type OrganizeResponse = {
  basisSpatialVersionId?: string;
  proposals?: Proposal[];
  error?: string;
  message?: string;
};

export function OrganizeIntelligenceCard({
  projectId,
  spaceId,
  activeVersionId,
  snapshot,
  previewSnapshot,
  busy,
  onAccept,
  onPreviewChange,
}: {
  projectId?: string;
  spaceId?: string;
  activeVersionId?: string | null;
  snapshot?: SpatialSnapshot | null;
  previewSnapshot?: SpatialSnapshot | null;
  busy: boolean;
  onAccept: (basisVersionId: string, actions: LayoutAction[]) => Promise<void>;
  onPreviewChange: (snapshot: SpatialSnapshot | null) => void;
}) {
  const auth = useAuth();
  const [goal, setGoal] = useState('Improve circulation, access, grouping, and practical storage.');
  const [requesting, setRequesting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basisVersionId, setBasisVersionId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showingProposal, setShowingProposal] = useState(false);
  const [hiddenDraft, setHiddenDraft] = useState<SpatialSnapshot | null>(null);
  const [draftProposalId, setDraftProposalId] = useState<string | null>(null);

  const selected = useMemo(
    () => proposals.find((proposal) => proposal.id === selectedId) ?? null,
    [proposals, selectedId],
  );

  const effectiveDraft = useMemo(() => {
    if (!selected || draftProposalId !== selected.id) return null;
    return previewSnapshot ?? hiddenDraft;
  }, [draftProposalId, hiddenDraft, previewSnapshot, selected]);

  const actionsToAccept = useMemo(() => {
    if (!snapshot || !selected) return [] as LayoutAction[];
    return effectiveDraft ? moveActionsBetween(snapshot, effectiveDraft) : selected.actions;
  }, [effectiveDraft, selected, snapshot]);

  const draftValidationErrors = useMemo(() => {
    if (!snapshot || !selected || !selected.geometryValidation.valid) return [] as string[];
    return validateOrganizeActions(snapshot, actionsToAccept);
  }, [actionsToAccept, selected, snapshot]);

  useEffect(() => {
    setBasisVersionId(null);
    setProposals([]);
    setSelectedId(null);
    setShowingProposal(false);
    setHiddenDraft(null);
    setDraftProposalId(null);
    setError(null);
    onPreviewChange(null);
  }, [activeVersionId, onPreviewChange]);

  const showDraft = (proposal: Proposal) => {
    setError(null);
    if (!snapshot || !proposal.geometryValidation.valid) return;
    try {
      const next = draftProposalId === proposal.id && hiddenDraft
        ? hiddenDraft
        : applyActions(snapshot, proposal.actions);
      setSelectedId(proposal.id);
      setDraftProposalId(proposal.id);
      setHiddenDraft(next);
      setShowingProposal(true);
      onPreviewChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The proposal could not be previewed.');
      setShowingProposal(false);
      onPreviewChange(null);
    }
  };

  const showCurrent = () => {
    if (previewSnapshot) setHiddenDraft(previewSnapshot);
    setShowingProposal(false);
    onPreviewChange(null);
  };

  const generate = async () => {
    setError(null);
    if (!projectId || !spaceId || !activeVersionId || !snapshot) {
      setError('A committed room version is required before Organize can run.');
      return;
    }
    if (snapshot.objects.length === 0) {
      setError('Add the furniture or storage you want FormShift to organize first.');
      return;
    }
    if (!auth.session?.access_token) {
      setError('Your FormShift session is not available.');
      return;
    }

    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    if (!apiBase) {
      setError('FormShift AI API is not configured for this client.');
      return;
    }

    setRequesting(true);
    setProposals([]);
    setSelectedId(null);
    setBasisVersionId(null);
    setShowingProposal(false);
    setHiddenDraft(null);
    setDraftProposalId(null);
    onPreviewChange(null);

    try {
      const response = await fetch(`${apiBase}/api/ai/organize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          spaceId,
          spatialVersionId: activeVersionId,
          roomContext: goal.trim() || undefined,
        }),
      });

      const data = await response.json() as OrganizeResponse;
      if (!response.ok) {
        if (response.status === 409 || data.error === 'stale_spatial_version') {
          throw new Error('The room changed while Organize was starting. Refresh and generate suggestions again.');
        }
        throw new Error(data.message || humanizeError(data.error) || `Organize request failed (${response.status}).`);
      }

      const next = data.proposals ?? [];
      setBasisVersionId(data.basisSpatialVersionId ?? activeVersionId);
      setProposals(next);
      const firstValid = next.find((proposal) => proposal.geometryValidation.valid) ?? next[0] ?? null;
      setSelectedId(firstValid?.id ?? null);
      if (!firstValid) {
        setError('Organize returned no proposals. Try a more specific goal.');
      } else if (!firstValid.geometryValidation.valid) {
        setError('Organize returned proposals, but deterministic geometry validation blocked all of them.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Organize could not generate suggestions.');
    } finally {
      setRequesting(false);
    }
  };

  const accept = async () => {
    if (!selected || !basisVersionId || !selected.geometryValidation.valid || !snapshot) return;

    const validationErrors = validateOrganizeActions(snapshot, actionsToAccept);
    if (validationErrors.length > 0) {
      setError(`Adjust the draft before accepting: ${validationErrors[0]}`);
      return;
    }

    setAccepting(true);
    setError(null);
    try {
      await onAccept(basisVersionId, actionsToAccept);
      setProposals([]);
      setSelectedId(null);
      setBasisVersionId(null);
      setShowingProposal(false);
      setHiddenDraft(null);
      setDraftProposalId(null);
      onPreviewChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The proposal could not be accepted.');
    } finally {
      setAccepting(false);
    }
  };

  const selectProposal = (proposal: Proposal) => {
    setSelectedId(proposal.id);
    setShowingProposal(false);
    setHiddenDraft(null);
    setDraftProposalId(null);
    setError(null);
    onPreviewChange(null);
  };

  const reject = () => {
    setSelectedId(null);
    setShowingProposal(false);
    setHiddenDraft(null);
    setDraftProposalId(null);
    setError(null);
    onPreviewChange(null);
  };

  if (!snapshot) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ORGANIZE INTELLIGENCE</Text>
        <Text style={styles.title}>Measure the room first.</Text>
        <Text style={styles.body}>Organize works from committed room geometry, not a guessed photo scale.</Text>
      </View>
    );
  }

  if (snapshot.objects.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ORGANIZE INTELLIGENCE</Text>
        <Text style={styles.title}>Add the objects you want to organize.</Text>
        <Text style={styles.body}>Use Arrange to add real furniture and storage. FormShift will reason over those exact footprints.</Text>
      </View>
    );
  }

  const draftIsValid = draftValidationErrors.length === 0;
  const hasDraft = !!effectiveDraft;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>ORGANIZE INTELLIGENCE</Text>
      <Text style={styles.title}>Generate validated layouts.</Text>
      <Text style={styles.body}>AI proposes moves against the exact committed room version. Preview a validated proposal, then drag its boxes to fine-tune the draft before accepting it.</Text>

      <TextInput
        value={goal}
        onChangeText={setGoal}
        multiline
        placeholder="What should FormShift optimize?"
        style={styles.goal}
      />

      <Pressable
        disabled={requesting || busy || accepting}
        onPress={() => void generate()}
        style={[styles.primary, (requesting || busy || accepting) && styles.disabled]}
      >
        <Text style={styles.primaryText}>{requesting ? 'Analyzing room…' : proposals.length ? 'Generate new options' : 'Generate options'}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {proposals.map((proposal) => {
        const active = proposal.id === selectedId;
        return (
          <Pressable
            key={proposal.id}
            onPress={() => selectProposal(proposal)}
            style={[styles.proposal, active && styles.proposalActive]}
          >
            <View style={styles.proposalTop}>
              <Text style={styles.proposalTitle}>{proposal.title}</Text>
              <Text style={[styles.validation, proposal.geometryValidation.valid ? styles.valid : styles.invalid]}>
                {proposal.geometryValidation.valid ? 'Validated' : 'Blocked'}
              </Text>
            </View>
            <Text style={styles.rationale}>{proposal.rationale}</Text>
            {proposal.expectedBenefits.slice(0, 3).map((benefit) => <Text key={benefit} style={styles.bullet}>• {benefit}</Text>)}
            {!proposal.geometryValidation.valid
              ? proposal.geometryValidation.errors.slice(0, 2).map((message) => <Text key={message} style={styles.validationError}>{message}</Text>)
              : null}
          </Pressable>
        );
      })}

      {selected?.geometryValidation.valid ? (
        <>
          {hasDraft ? (
            <View style={[styles.draftStatus, draftIsValid ? styles.draftStatusValid : styles.draftStatusInvalid]}>
              <Text style={[styles.draftStatusText, !draftIsValid && styles.draftStatusTextInvalid]}>
                {draftIsValid ? 'Editable draft · geometry valid' : 'Editable draft · needs adjustment'}
              </Text>
              {showingProposal ? <Text style={styles.editHint}>Drag boxes directly in the room plan. Your changes remain local until you accept the layout.</Text> : <Text style={styles.editHint}>Current layout is shown. Your edited proposal is preserved and can be resumed.</Text>}
              {!draftIsValid ? draftValidationErrors.slice(0, 2).map((message) => <Text key={message} style={styles.validationError}>{message}</Text>) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={() => showingProposal ? showCurrent() : showDraft(selected)}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>{showingProposal ? 'Show current' : hasDraft ? 'Resume editing' : 'Preview & edit'}</Text>
            </Pressable>
            <Pressable
              disabled={accepting || busy || !draftIsValid}
              onPress={() => void accept()}
              style={[styles.accept, (accepting || busy || !draftIsValid) && styles.disabled]}
            >
              <Text style={styles.acceptText}>{accepting ? 'Accepting…' : hasDraft ? 'Accept edited layout' : 'Accept layout'}</Text>
            </Pressable>
            <Pressable onPress={reject} style={styles.reject}>
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {basisVersionId ? <Text style={styles.basis}>Bound to spatial version {basisVersionId.slice(0, 8)}…</Text> : null}
    </View>
  );
}

function moveActionsBetween(base: SpatialSnapshot, draft: SpatialSnapshot): LayoutAction[] {
  const actions: LayoutAction[] = [];
  for (const before of base.objects) {
    const after = draft.objects.find((candidate) => candidate.id === before.id);
    if (!after) continue;
    const a = before.transform.translation;
    const b = after.transform.translation;
    if (Math.abs(a.x - b.x) > 0.001 || Math.abs(a.y - b.y) > 0.001 || Math.abs(a.z - b.z) > 0.001) {
      actions.push({ type: 'move', objectId: before.id, to: { ...b } });
    }
  }
  return actions;
}

function humanizeError(value?: string) {
  if (!value) return null;
  if (value === 'objects_required_for_organize') return 'Add at least one object before running Organize.';
  if (value === 'ai_run_not_authorized') return 'Your account cannot create an Organize run for this room.';
  if (value === 'organize_failed') return 'The AI service could not complete this Organize run.';
  return value.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 22, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,.78)', shadowColor: tokens.color.shadow, shadowOpacity: .08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: tokens.color.peach },
  title: { marginTop: 7, fontSize: 16, fontWeight: '700', color: tokens.color.text },
  body: { marginTop: 6, fontSize: 10, lineHeight: 15, color: tokens.color.muted },
  goal: { marginTop: 12, minHeight: 62, borderWidth: 1, borderColor: tokens.color.line, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.72)', paddingHorizontal: 11, paddingVertical: 9, color: tokens.color.text, fontSize: 10, lineHeight: 15 },
  primary: { marginTop: 10, backgroundColor: tokens.color.blue, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  disabled: { opacity: .5 },
  error: { marginTop: 9, fontSize: 9, lineHeight: 14, color: '#A84545' },
  proposal: { marginTop: 10, padding: 11, borderRadius: 14, borderWidth: 1, borderColor: tokens.color.line, backgroundColor: 'rgba(255,255,255,.52)' },
  proposalActive: { borderColor: tokens.color.blue, backgroundColor: 'rgba(207,229,236,.35)' },
  proposalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  proposalTitle: { flex: 1, fontSize: 11, fontWeight: '800', color: tokens.color.text },
  validation: { fontSize: 8, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  valid: { color: tokens.color.success, backgroundColor: 'rgba(53,109,89,.10)' },
  invalid: { color: '#A84545', backgroundColor: 'rgba(168,69,69,.08)' },
  rationale: { marginTop: 5, fontSize: 9, lineHeight: 14, color: tokens.color.muted },
  bullet: { marginTop: 3, fontSize: 9, lineHeight: 13, color: tokens.color.text },
  validationError: { marginTop: 4, fontSize: 8, lineHeight: 12, color: '#A84545' },
  draftStatus: { marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
  draftStatusValid: { borderColor: 'rgba(53,109,89,.18)', backgroundColor: 'rgba(53,109,89,.06)' },
  draftStatusInvalid: { borderColor: 'rgba(168,69,69,.18)', backgroundColor: 'rgba(168,69,69,.06)' },
  draftStatusText: { fontSize: 9, fontWeight: '800', color: tokens.color.success },
  draftStatusTextInvalid: { color: '#A84545' },
  editHint: { marginTop: 4, fontSize: 8, lineHeight: 12, color: tokens.color.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  secondary: { paddingVertical: 8, paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderColor: tokens.color.line, backgroundColor: 'rgba(255,255,255,.72)' },
  secondaryText: { fontSize: 9, fontWeight: '800', color: tokens.color.blue },
  accept: { paddingVertical: 8, paddingHorizontal: 9, borderRadius: 10, backgroundColor: tokens.color.blue },
  acceptText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  reject: { paddingVertical: 8, paddingHorizontal: 9, borderRadius: 10 },
  rejectText: { fontSize: 9, fontWeight: '800', color: tokens.color.muted },
  basis: { marginTop: 9, fontSize: 8, color: tokens.color.peach },
});
