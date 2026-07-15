import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { SectionHeader } from '@/components/section-header'
import {
  CardRow,
  EmptyState,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/screen'
import { Text, View } from '@/tw'
import { useModuleList } from '@/features/use-module-list'
import { createOcrDraftFromCapture } from '@/lib/ocr-upload'
import { useWorkspace } from '@/lib/workspace'

export default function OcrReviewScreen() {
  const { companyId } = useWorkspace()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<string | null>(null)
  const draftsQuery = useModuleList('ocr')

  const uploadMutation = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      if (!companyId) throw new Error('Company required')
      return createOcrDraftFromCapture(companyId, asset)
    },
    onSuccess: async () => {
      setStatus('Draft created. Review fields before confirming to bill.')
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'ocr'] })
    },
    onError: () =>
      setStatus('Upload failed. Check API connection and try again.'),
  })

  async function handleCapture(source: 'camera' | 'library') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        setStatus('Camera permission is required.')
        return
      }
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })

    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate(result.assets[0])
    }
  }

  return (
    <Screen title="OCR review" subtitle="Capture bills and review drafts">
      <View className="gap-section-header">
        <SectionHeader title="Capture bill" compact icon="camera-outline" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <PrimaryButton
              label="Camera"
              onPress={() => void handleCapture('camera')}
            />
          </View>
          <View className="flex-1">
            <SecondaryButton
              label="Gallery"
              onPress={() => void handleCapture('library')}
            />
          </View>
        </View>
      </View>
      {status ? <Text className="text-muted-foreground">{status}</Text> : null}
      {uploadMutation.isPending ? <LoadingState /> : null}
      <View className="gap-section-header">
        <SectionHeader title="Drafts" compact icon="document-outline" />
        {draftsQuery.isLoading ? <LoadingState /> : null}
        {draftsQuery.data?.map((draft, index) => (
          <CardRow
            key={String(draft.id ?? index)}
            title={String(draft.fields?.supplierName?.value ?? 'OCR draft')}
            subtitle={String(draft.fields?.billNumber?.value ?? 'Needs review')}
            badge={String(draft.status ?? 'draft')}
          />
        ))}
        {!draftsQuery.isLoading && draftsQuery.data?.length === 0 ? (
          <EmptyState message="No OCR drafts yet. Capture a bill to start review." />
        ) : null}
      </View>
    </Screen>
  )
}
