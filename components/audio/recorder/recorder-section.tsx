"use client"

import { WordRecorder } from "@/components/audio/recorder/word-recorder"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Chunk, Collection, Recording, Timestamp, addRecording, getChunks } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface RecorderProps {
  collection: Collection
  setRecordings: Dispatch<SetStateAction<Recording[]>>
  onBack: (collection: Collection) => void
}

export function Recorder({ collection, setRecordings, onBack }: RecorderProps) {
  const t = useTranslations()
  const hasRecovered = useRef(false)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isLoadingChunks, setIsLoadingChunks] = useState(true)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)

  // Checks browser support for media devices and MediaRecorder API, and sets up cleanup on unmount
  const isSupported =
    typeof window !== "undefined" && "mediaDevices" in navigator && typeof window.MediaRecorder !== "undefined"

  useEffect(() => {
    if (hasRecovered.current) {
      return
    }

    hasRecovered.current = true

    async function saveRecordingFromChunks(chunks: Chunk[]) {
      const wordIds = collection.wordIds
      const indexByWordId = new Map(wordIds.map((wordId, index) => [wordId, index]))

      const byWordIdAndStartMs = (a: Timestamp, b: Timestamp) => {
        const indexA = indexByWordId.get(a.wordId)!
        const indexB = indexByWordId.get(b.wordId)!
        if (indexA !== indexB) {
          return indexA - indexB
        }
        return a.startMs - b.startMs
      }

      const blobParts = chunks.map(({ blob }) => blob)
      const timestamps = chunks.map(({ timestamps }) => timestamps).flat()

      const wordRecordedByIndex = new Map<number, boolean>()

      const blob = new Blob(blobParts, {
        type: localStorage.getItem("preferredMimeType") || "audio/webm",
      })

      if (blob.size === 0) {
        throw new Error(t("recorder.recordingEmpty"))
      }

      // Decode the audio data to get the duration of the recording
      const arrayBuffer = await blob.arrayBuffer()
      const audioContext = new AudioContext()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const durationMs = audioBuffer.duration * 1000

      // Preserve the same order as saving normally
      const sortedTimestamps = timestamps.sort(byWordIdAndStartMs)

      // Mark words as recorded based on the timestamps
      const recordedWords = collection.wordRecorded
      for (const timestamp of sortedTimestamps) {
        const index = indexByWordId.get(timestamp.wordId)!
        if (!wordRecordedByIndex.has(index)) {
          recordedWords[index] = true
        }
      }

      const newRecording = {
        id: crypto.randomUUID(),
        collectionId: collection.id,
        createdAt: chunks[chunks.length - 1].createdAt,
        durationMs,
        size: blob.size,
        mimeType: blob.type,
        blob,
        timestamps: sortedTimestamps,
      }

      const newCollection = {
        ...collection,
        wordRecorded: recordedWords,
      }

      await addRecording(newRecording, newCollection)
      setRecordings((prevRecordings) => [newRecording, ...prevRecordings])
      setChunks([])
    }

    const recoverRecording = async () => {
      try {
        const unsavedChunks = await getChunks(collection.id)
        setChunks(unsavedChunks)

        if (unsavedChunks.length > 0) {
          toast.promise(saveRecordingFromChunks(unsavedChunks), {
            loading: t("recorder.recoveringRecording"),
            success: t("recorder.recoveredRecording"),
            error: (error) =>
              t("recorder.recoveringRecordingError", {
                message: (error as Error).message,
              }),
          })
        }
      } finally {
        setIsLoadingChunks(false)
      }
    }

    recoverRecording()
  }, [collection, setRecordings, t])

  return (
    <div className="space-y-4">
      <header className="space-y-4">
        <Button
          variant="ghost"
          className="-ml-2 gap-2"
          onClick={() => {
            if (isRecording) {
              setShowConfirmationDialog(true)
            } else {
              onBack(collection)
            }
          }}
        >
          <ArrowLeft className="size-4" />
          {t("recordingSession.backToCollections")}
        </Button>
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {t("recordingSession.kicker")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{collection.name}</h1>
        </div>
      </header>

      {/* Recording Controls */}
      {isSupported ? (
        // Render the WordRecorder component if the browser supports media devices and MediaRecorder API
        <WordRecorder
          collection={collection}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          setRecordings={setRecordings}
          chunks={chunks}
          setChunks={setChunks}
          isLoadingChunks={isLoadingChunks}
        />
      ) : (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          {t("recordingSession.browserNotSupported")}
        </div>
      )}
      {/* Confirmation Dialog for Leaving the Recording Session */}
      <AlertDialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recordingSession.leaveRecordingSession")}</AlertDialogTitle>
            <AlertDialogDescription>{t("recordingSession.leaveDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onBack(collection)}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
