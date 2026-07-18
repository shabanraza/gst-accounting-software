import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { Text, View } from '@/tw'
import { useModuleList } from '@/features/use-module-list'
import { createOcrDraftFromCapture } from '@/lib/ocr-upload'
import { useWorkspace } from '@/lib/workspace'

function ocrFieldValue(
  fields: unknown,
  key: 'supplierName' | 'billNumber',
  fallback: string,
) {
  if (!fields || typeof fields !== 'object') {
    return fallback
  }

  const value = (fields as Record<string, { value?: unknown }>)[key]?.value
  return typeof value === 'string' && value.trim() ? value : fallback
}

export default function OcrReviewScreen() {
  const router = useRouter()
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
            title={ocrFieldValue(draft.fields, 'supplierName', 'OCR draft')}
            subtitle={ocrFieldValue(draft.fields, 'billNumber', 'Needs review')}
            badge={String(draft.status ?? 'draft')}
            onPress={
              draft.id
                ? () =>
                    router.push(`/(app)/purchases/ocr/${String(draft.id)}` as never)
                : undefined
            }
          />
        ))}
        {!draftsQuery.isLoading && draftsQuery.data?.length === 0 ? (
          <EmptyState message="No OCR drafts yet. Capture a bill to start review." />
        ) : null}
      </View>
    </Screen>
  )
}
