import {
  createOpenShelvingPlan,
  inchesToMm,
  mmToInches,
  previewOpenShelvingPlan,
  repositionOpenShelvingPlan,
  type OpenShelvingPlanDraft,
  type SpatialSnapshot,
} from '@formshift/domain';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { loadLatestSavedBuildPlan } from './loadSavedBuildPlan';

export type NormalizedBuildBrief = {
  label: string;
  archetype: 'shelving' | 'cabinet' | 'storage' | 'desk' | 'bench' | 'other';
  purpose: string;
  targetWidthMm: number | null;
  targetHeightMm: number | null;
  targetDepthMm: number | null;
  interiorShelfCount: number | null;
  installationType: 'freestanding' | 'wall_anchored' | 'built_in' | 'unknown';
  placementIntent: string;
  materialPreferences: string[];
  constraints: string[];
  missingCriticalInformation: string[];
};

type BriefResponse = {
  supported?: boolean;
  unsupportedReason?: string | null;
  normalizedBrief?: NormalizedBuildBrief;
  error?: string;
  message?: string;
};

type AcceptResponse = {
  status?: string;
  accepted?: {
    buildRequestId?: string;
    buildPlanId?: string;
    spatialVersionId?: string;
    buildObjectId?: string;
  };
  error?: string;
  message?: string;
  details?: string[];
};

export function useBuildPlanner({
  projectId,
  spaceId,
  activeVersionId,
  snapshot,
  previewSnapshot,
  onPreviewChange,
  onAccepted,
}: {
  projectId?: string;
  spaceId?: string;
  activeVersionId?: string | null;
  snapshot?: SpatialSnapshot | null;
  previewSnapshot: SpatialSnapshot | null;
  onPreviewChange: (snapshot: SpatialSnapshot | null) => void;
  onAccepted: () => Promise<void>;
}) {
  const auth = useAuth();
  const [brief, setBrief] = useState('Build a freestanding open shelving unit for storage.');
  const [normalized, setNormalized] = useState<NormalizedBuildBrief | null>(null);
  const [supported, setSupported] = useState(true);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);
  const [widthIn, setWidthIn] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [depthIn, setDepthIn] = useState('');
  const [interiorShelves, setInteriorShelves] = useState('3');
  const [objectId, setObjectId] = useState(() => newBuildObjectId());
  const [plan, setPlan] = useState<OpenShelvingPlanDraft | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<AcceptResponse['accepted'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const restoredSpaceKey = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || !spaceId || !snapshot) return;
    const key = `${projectId}:${spaceId}`;
    if (restoredSpaceKey.current === key) return;
    restoredSpaceKey.current = key;
    let cancelled = false;
    setRestoring(true);

    void loadLatestSavedBuildPlan({ projectId, spaceId, snapshot })
      .then((restored) => {
        if (cancelled || !restored) return;
        setBrief(restored.brief);
        setNormalized(restored.normalized);
        setSupported(true);
        setUnsupportedReason(null);
        setWidthIn(formatBuildInches(restored.plan.geometry.widthMm));
        setHeightIn(formatBuildInches(restored.plan.geometry.heightMm));
        setDepthIn(formatBuildInches(restored.plan.geometry.depthMm));
        setInteriorShelves(String(restored.plan.geometry.interiorShelves));
        setObjectId(restored.plan.input.objectId);
        setPlan(restored.plan);
        setAccepted(true);
        setAcceptedIds({
          buildRequestId: restored.buildRequestId,
          buildPlanId: restored.buildPlanId,
          buildObjectId: restored.buildObjectId,
        });
        setSavedMessage('Saved Build plan restored.');
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError('The saved Build plan could not be restored. You can still start a new plan.');
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => { cancelled = true; };
  }, [projectId, spaceId, snapshot]);

  const currentPlan = useMemo(() => {
    if (!plan || !snapshot) return plan;
    const previewObject = previewSnapshot?.objects.find((object) => object.id === plan.object.id);
    if (!previewObject) return plan;
    return repositionOpenShelvingPlan(snapshot, plan, {
      x: previewObject.transform.translation.x,
      z: previewObject.transform.translation.z,
    });
  }, [plan, previewSnapshot, snapshot]);

  const normalizeBrief = async () => {
    setError(null);
    setSavedMessage(null);
    setAccepted(false);
    setAcceptedIds(null);
    if (!projectId || !spaceId || !activeVersionId || !snapshot) {
      setError('A committed room version is required before Build can start.');
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

    setNormalizing(true);
    setPlan(null);
    onPreviewChange(null);
    try {
      const response = await fetch(`${apiBase}/api/ai/build-brief`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          spaceId,
          spatialVersionId: activeVersionId,
          brief: brief.trim(),
        }),
      });
      const data = await response.json() as BriefResponse;
      if (!response.ok) {
        if (response.status === 409 || data.error === 'stale_spatial_version') {
          throw new Error('The room changed while Build was starting. Refresh and try again.');
        }
        throw new Error(data.message || humanizeError(data.error) || `Build request failed (${response.status}).`);
      }
      const next = data.normalizedBrief;
      if (!next) throw new Error('Build returned no normalized brief.');
      setNormalized(next);
      setSupported(data.supported !== false);
      setUnsupportedReason(data.unsupportedReason ?? null);
      setWidthIn(next.targetWidthMm ? formatBuildInches(next.targetWidthMm) : '');
      setHeightIn(next.targetHeightMm ? formatBuildInches(next.targetHeightMm) : '');
      setDepthIn(next.targetDepthMm ? formatBuildInches(next.targetDepthMm) : '');
      setInteriorShelves(String(next.interiorShelfCount ?? 3));
      setObjectId(newBuildObjectId());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Build could not understand this request.');
    } finally {
      setNormalizing(false);
    }
  };

  const generatePlan = () => {
    setError(null);
    setSavedMessage(null);
    setAccepted(false);
    setAcceptedIds(null);
    if (!snapshot || !normalized) return;
    try {
      const width = parsePositiveInches(widthIn, 'Width');
      const height = parsePositiveInches(heightIn, 'Height');
      const depth = parsePositiveInches(depthIn, 'Depth');
      const shelfCount = Number(interiorShelves);
      if (!Number.isInteger(shelfCount) || shelfCount < 0 || shelfCount > 12) {
        throw new Error('Interior shelves must be a whole number from 0 to 12.');
      }
      const previousObject = previewSnapshot?.objects.find((object) => object.id === objectId);
      const nextPlan = createOpenShelvingPlan(
        snapshot,
        {
          objectId,
          label: normalized.label.trim() || 'Open shelving',
          widthMm: inchesToMm(width),
          heightMm: inchesToMm(height),
          depthMm: inchesToMm(depth),
          interiorShelves: shelfCount,
        },
        previousObject
          ? {
              x: previousObject.transform.translation.x,
              z: previousObject.transform.translation.z,
            }
          : undefined,
      );
      setPlan(nextPlan);
      onPreviewChange(previewOpenShelvingPlan(snapshot, nextPlan));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The shelving plan could not be generated.');
    }
  };

  const acceptPlan = async () => {
    if (
      accepted ||
      !currentPlan ||
      !currentPlan.validation.valid ||
      !normalized ||
      !projectId ||
      !spaceId ||
      !activeVersionId ||
      !auth.session?.access_token
    ) return;
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    if (!apiBase) return;

    setAccepting(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/build/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          spaceId,
          spatialVersionId: activeVersionId,
          briefText: brief.trim(),
          normalizedBrief: normalized,
          design: currentPlan.input,
          placement: {
            x: currentPlan.object.transform.translation.x,
            z: currentPlan.object.transform.translation.z,
          },
        }),
      });
      const data = await response.json() as AcceptResponse;
      if (!response.ok) {
        if (response.status === 409 || data.error === 'stale_spatial_version') {
          throw new Error('The room changed before this plan was accepted. Refresh and regenerate the Build plan.');
        }
        throw new Error(
          data.details?.[0] ||
          data.message ||
          humanizeError(data.error) ||
          `Build acceptance failed (${response.status}).`,
        );
      }
      setAccepted(true);
      setAcceptedIds(data.accepted ?? null);
      setSavedMessage('Build plan saved and placed in the room.');
      onPreviewChange(null);
      await onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The Build plan could not be accepted.');
    } finally {
      setAccepting(false);
    }
  };

  const startNewBuild = () => {
    setNormalized(null);
    setSupported(true);
    setUnsupportedReason(null);
    setWidthIn('');
    setHeightIn('');
    setDepthIn('');
    setInteriorShelves('3');
    setObjectId(newBuildObjectId());
    setPlan(null);
    setAccepted(false);
    setAcceptedIds(null);
    setError(null);
    setSavedMessage(null);
    onPreviewChange(null);
  };

  return {
    brief,
    setBrief,
    normalized,
    supported,
    unsupportedReason,
    widthIn,
    setWidthIn,
    heightIn,
    setHeightIn,
    depthIn,
    setDepthIn,
    interiorShelves,
    setInteriorShelves,
    currentPlan,
    normalizing,
    restoring,
    accepting,
    accepted,
    acceptedIds,
    error,
    savedMessage,
    normalizeBrief,
    generatePlan,
    acceptPlan,
    startNewBuild,
  };
}

export function formatBuildInches(mm: number) {
  return (Math.round(mmToInches(mm) * 10) / 10).toString();
}

export function formatBuildPanel(lengthMm: number, widthMm: number) {
  return `${formatBuildInches(lengthMm)} × ${formatBuildInches(widthMm)} in`;
}

function parsePositiveInches(value: string, label: string) {
  const number = Number(value.trim());
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be a positive number of inches.`);
  }
  return number;
}

function newBuildObjectId() {
  return `build-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function humanizeError(value?: string) {
  if (!value) return null;
  if (value === 'build_brief_failed') return 'FormShift could not understand the Build request.';
  if (value === 'invalid_build_plan') return 'The Build plan failed deterministic validation.';
  if (value === 'build_accept_failed') return 'The Build plan could not be saved.';
  return value.replace(/_/g, ' ');
}
