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
import { Collection, Recording } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dispatch, SetStateAction, useState } from "react"

interface RecorderProps {
  collection: Collection
  setRecordings: Dispatch<SetStateAction<Recording[]>>
  onBack: (collection: Collection) => void
}

export function Recorder({ collection, setRecordings, onBack }: RecorderProps) {
  const t = useTranslations()
  const [isRecording, setIsRecording] = useState(false)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)

  // Checks browser support for media devices and MediaRecorder API, and sets up cleanup on unmount
  const isSupported =
    typeof window !== "undefined" && "mediaDevices" in navigator && typeof window.MediaRecorder !== "undefined"

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
