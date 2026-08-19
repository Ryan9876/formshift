import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { supabase, useAuth } from '../auth/AuthProvider';
import { tokens } from '../theme/tokens';

type SavedCapture = {
  uri: string;
  projectId: string;
  spaceId: string;
};

export function CaptureSpace({
  lidarAvailable,
  onSaved
}: {
  lidarAvailable: boolean;
  onSaved?: (capture: SavedCapture) => void;
}) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAsset(null);
    setSaved(false);
    setError(null);
  };

  const close = () => {
    if (saving) return;
    setOpen(false);
    reset();
  };

  const takePhoto = async () => {
    setError(null);

    try {
      // Web launch must happen directly from the button interaction.
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          setError('Camera permission is required to photograph a room.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.back,
        quality: 0.9,
        exif: false
      });

      if (!result.canceled && result.assets[0]) {
        setAsset(result.assets[0]);
        setSaved(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera could not be opened.');
    }
  };

  const choosePhoto = async () => {
    setError(null);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        exif: false
      });

      if (!result.canceled && result.assets[0]) {
        setAsset(result.assets[0]);
        setSaved(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo could not be selected.');
    }
  };

  const savePhoto = async () => {
    if (!asset || !supabase || !auth.session) return;

    setSaving(true);
    setError(null);

    try {
      const userId = auth.session.user.id;

      let { data: project, error: projectLookupError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (projectLookupError) throw projectLookupError;

      if (!project) {
        const created = await supabase
          .from('projects')
          .insert({
            owner_user_id: userId,
            name: 'My Home'
          });

        if (created.error) throw created.error;

        const createdProject = await supabase
          .from('projects')
          .select('id, name')
          .eq('owner_user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (createdProject.error) throw createdProject.error;
        project = createdProject.data;
      }

      let { data: space, error: spaceLookupError } = await supabase
        .from('spaces')
        .select('id, name')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (spaceLookupError) throw spaceLookupError;

      if (!space) {
        const created = await supabase
          .from('spaces')
          .insert({
            project_id: project.id,
            name: 'Room 1',
            space_type: 'room'
          })
          .select('id, name')
          .single();

        if (created.error) throw created.error;
        space = created.data;
      }

      const extension =
        asset.fileName?.split('.').pop()?.toLowerCase() ||
        (asset.mimeType === 'image/png' ? 'png' : 'jpg');

      const storagePath =
        `${project.id}/${space.id}/capture-${Date.now()}.${extension}`;

      let body: File | ArrayBuffer;

      if (Platform.OS === 'web' && asset.file) {
        body = asset.file;
      } else {
        const response = await fetch(asset.uri);
        body = await response.arrayBuffer();
      }

      const upload = await supabase.storage
        .from('formshift-private')
        .upload(storagePath, body, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: false
        });

      if (upload.error) throw upload.error;

      const assetInsert = await supabase
        .from('assets')
        .insert({
          project_id: project.id,
          space_id: space.id,
          kind: 'room_photo',
          storage_bucket: 'formshift-private',
          storage_path: storagePath,
          mime_type: asset.mimeType ?? 'image/jpeg',
          byte_size: asset.fileSize ?? null,
          created_by: userId
        })
        .select('id')
        .single();

      if (assetInsert.error) {
        await supabase.storage
          .from('formshift-private')
          .remove([storagePath]);

        throw assetInsert.error;
      }

      const captureInsert = await supabase
        .from('captures')
        .insert({
          space_id: space.id,
          capture_type: 'photo',
          status: 'captured',
          source_asset_ids: [assetInsert.data.id],
          device_context: {
            platform: Platform.OS,
            width: asset.width,
            height: asset.height
          },
          capability_context: {
            roomPlanAvailable: lidarAvailable
          },
          created_by: userId
        });

      if (captureInsert.error) {
        await supabase.storage
          .from('formshift-private')
          .remove([storagePath]);

        await supabase
          .from('assets')
          .delete()
          .eq('id', assetInsert.data.id);

        throw captureInsert.error;
      }

      setSaved(true);

      onSaved?.({
        uri: asset.uri,
        projectId: project.id,
        spaceId: space.id
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'The room photo could not be saved.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={styles.captureButton}
      >
        <Text style={styles.captureButtonText}>Capture Space</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.eyebrow}>ROOM CAPTURE</Text>
            <Text style={styles.title}>
              {saved ? 'Room photo saved.' : asset ? 'Review this photo.' : 'Capture the space.'}
            </Text>

            {!asset && !saved && (
              <>
                <Text style={styles.body}>
                  Photograph the room now or choose an existing image.
                  FormShift keeps the original image private to authorized project members.
                </Text>

                <Pressable style={styles.primary} onPress={takePhoto}>
                  <Text style={styles.primaryText}>Take Photo</Text>
                </Pressable>

                <Pressable style={styles.secondary} onPress={choosePhoto}>
                  <Text style={styles.secondaryText}>Choose Photo</Text>
                </Pressable>

                {lidarAvailable && (
                  <View style={styles.lidarNote}>
                    <Text style={styles.lidarTitle}>LiDAR available</Text>
                    <Text style={styles.lidarBody}>
                      RoomPlan scanning will use this same Capture Space entry point in the native iOS build.
                    </Text>
                  </View>
                )}
              </>
            )}

            {asset && !saved && (
              <>
                <Image
                  source={{ uri: asset.uri }}
                  resizeMode="cover"
                  style={styles.preview}
                />

                <Text style={styles.meta}>
                  {asset.width} × {asset.height}px
                </Text>

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  disabled={saving}
                  style={[styles.primary, saving && styles.disabled]}
                  onPress={savePhoto}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryText}>Save to Room</Text>}
                </Pressable>

                <View style={styles.row}>
                  <Pressable disabled={saving} style={styles.smallButton} onPress={takePhoto}>
                    <Text style={styles.secondaryText}>Retake</Text>
                  </Pressable>

                  <Pressable disabled={saving} style={styles.smallButton} onPress={choosePhoto}>
                    <Text style={styles.secondaryText}>Choose Another</Text>
                  </Pressable>
                </View>
              </>
            )}

            {saved && (
              <>
                <Text style={styles.body}>
                  The image is now stored in FormShift's private room data and can be used by the spatial-analysis pipeline.
                </Text>

                <Pressable style={styles.primary} onPress={close}>
                  <Text style={styles.primaryText}>Done</Text>
                </Pressable>
              </>
            )}

            {error && !asset && <Text style={styles.error}>{error}</Text>}

            {!saved && (
              <Pressable disabled={saving} onPress={close} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  captureButton: {
    backgroundColor: tokens.color.blue,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center'
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800'
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(29,36,38,.32)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    padding: 26,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.84)'
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: tokens.color.peach
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '700',
    color: tokens.color.text
  },
  body: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 19,
    color: tokens.color.muted
  },
  primary: {
    marginTop: 18,
    backgroundColor: tokens.color.blue,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center'
  },
  primaryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800'
  },
  secondary: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.color.line,
    backgroundColor: 'rgba(255,255,255,.72)'
  },
  secondaryText: {
    color: tokens.color.text,
    fontSize: 11,
    fontWeight: '700'
  },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: 18,
    marginTop: 18,
    backgroundColor: '#E9E6DD'
  },
  meta: {
    marginTop: 8,
    fontSize: 10,
    color: tokens.color.muted
  },
  row: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10
  },
  smallButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: tokens.color.line,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center'
  },
  lidarNote: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(207,229,236,.55)'
  },
  lidarTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: tokens.color.blue
  },
  lidarBody: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: tokens.color.muted
  },
  error: {
    marginTop: 12,
    color: '#A84545',
    fontSize: 11,
    lineHeight: 16
  },
  cancel: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8
  },
  cancelText: {
    fontSize: 11,
    color: tokens.color.muted
  },
  disabled: {
    opacity: 0.55
  }
});
