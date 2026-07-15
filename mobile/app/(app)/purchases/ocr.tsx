import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import {
  CardRow,
  EmptyState,
  LoadingState,
  Screen,
} from '@/components/screen'
import { Pressable, Text, View } from '@/tw'
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
      <View className="flex-row gap-3">
        <Pressable
          className="flex-1 items-center rounded-xl bg-indigo-600 px-4 py-3"
          onPress={() => void handleCapture('camera')}
        >
          <Text className="font-semibold text-white">Camera</Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center rounded-xl border border-gray-200 bg-white px-4 py-3"
          onPress={() => void handleCapture('library')}
        >
          <Text className="font-semibold text-gray-900">Gallery</Text>
        </Pressable>
      </View>
      {status ? <Text className="text-gray-500">{status}</Text> : null}
      {uploadMutation.isPending ? <LoadingState /> : null}
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
    </Screen>
  )
}
