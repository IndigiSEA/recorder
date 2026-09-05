"use client"

import WordModal from "@/components/audio/recorder/word-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { addRecording, Collection, Recording, Timestamp, updateCollection } from "@/lib/db"
import { formatDuration } from "@/lib/utils"
import { Check, Mic, Play, Square } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

// Preferred MIME types for audio recording in order of preference. The first supported type is used for MediaRecorder.
const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]

// Flush encoded audio every 30s instead of buffering the whole session until stop() because long recordings on iOS
// can hit WebKit's memory limits and cause the page to be killed/reloaded.
const RECORDING_TIMESLICE_MS = 30_000

interface WordRecorderProps {
  collection: Collection
  isRecording: boolean
  setIsRecording: (isRecording: boolean) => void
  setRecordings: Dispatch<SetStateAction<Recording[]>>
}

/**
 * Recorder component allows users to record audio for a specific collection of texts. It provides recording controls
 * to marking timestamps for individual texts within the collection, and saves the recordings along with their
 * timestamps.
 */
export function WordRecorder({ collection, isRecording, setIsRecording, setRecordings }: WordRecorderProps) {
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordingStartRef = useRef<number>(0)
  const timestampsRef = useRef<Map<number, Timestamp[]>>(new Map())

  const t = useTranslations()
  const [isSaving, setIsSaving] = useState(false)
  const [activeDurationMs, setActiveDurationMs] = useState(0)
  const [timestamps, setTimestamps] = useState<Map<number, Timestamp[]>>(new Map())
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null)
  const [currentWordStartMs, setCurrentWordStartMs] = useState<number | null>(null)
  const [recordedWord, setRecordedWord] = useState<string>("")
  const [wordEndMarked, setWordEndMarked] = useState(false)

  // Cleanup function to stop all tracks of the media stream and reset the stream reference
  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  // Set to default state when recording stops or is cancelled (when the user navigates back)
  const resetRecordingState = () => {
    chunksRef.current = []
    timestampsRef.current = new Map()
    setSelectedWordIndex(null)
    setTimestamps(new Map())
  }

  // Saves the recorded audio and timestamps to the local database, and updates the collection's wordRecorded state.
  const saveRecording = async () => {
    setIsSaving(true)
    try {
      const durationMs = Date.now() - recordingStartRef.current

      const blob = new Blob(chunksRef.current, {
        type: mediaRecorderRef.current!.mimeType || "audio/webm",
      })

      if (blob.size === 0) {
        throw new Error(t("recorder.recordingEmpty"))
      }

      // Sort timestamps by id and flatten the timestamps of each text into a single array.
      const timestampsArray = Array.from(timestampsRef.current.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([_, timestamp]) => timestamp)
        .flat()

      // Update the collection's wordRecorded boolean array to mark words that have been recorded.
      const recordedWords = collection.wordRecorded
      for (const index of timestampsRef.current.keys()) {
        recordedWords[index] = true
      }

      const newRecording = {
        id: crypto.randomUUID(),
        collectionId: collection.id,
        createdAt: new Date(),
        durationMs,
        size: blob.size,
        mimeType: blob.type,
        blob,
        timestamps: timestampsArray,
      }

      const newCollection = {
        ...collection,
        wordRecorded: recordedWords,
      }
      await Promise.all([addRecording(newRecording), updateCollection(newCollection)])
      setRecordings((prev) => [newRecording, ...prev])
    } catch (error) {
      throw error
    } finally {
      setIsSaving(false)
      cleanupStream()
    }
  }

  // Starts recording audio from the user's microphone with the MediaRecorder API
  const startRecording = async () => {
    if (isRecording || isSaving) return

    try {
      // Request microphone access and start the MediaRecorder with the preferred MIME type supported by the browser.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = preferredTypes.find((candidate) => MediaRecorder.isTypeSupported(candidate))
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      resetRecordingState()

      // Collect the recorded audio data in chunks as it becomes available.
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Save the recording when the user stops it
      mediaRecorder.onstop = () => {
        toast.promise(saveRecording, {
          loading: t("loading.recordingSaving"),
          success: t("success.recordingSaved"),
          error: (error) => t("errors.couldNotSaveRecording", { message: (error as Error).message }),
        })
      }

      // Start recording and note the start time to calculate timestamps for marked words.
      recordingStartRef.current = Date.now()
      mediaRecorder.start(RECORDING_TIMESLICE_MS)
      setIsRecording(true)
    } catch (error) {
      cleanupStream()
      toast.error(t("errors.micDeniedOrUnavailable", { message: (error as Error).message }))
    }
  }

  // Stops and saves the recording
  const stopRecording = () => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || mediaRecorder.state !== "recording") return
    setIsRecording(false)
    mediaRecorder.stop()
  }

  // Selects a text from the collection to mark timestamps for.
  const selectWord = (index: number) => {
    if (!isRecording) return

    if (currentWordStartMs !== null && selectedWordIndex !== null) {
      // End the current text if one is active before selecting a new text to mark.
      markEnd()
      if (recordedWord.trim() !== "") {
        setSelectedWordIndex(index)
        setCurrentWordStartMs(null)
        setRecordedWord("")
        setWordEndMarked(false)
      }
    } else {
      setSelectedWordIndex(index)
      setCurrentWordStartMs(null)
      setRecordedWord("")
      setWordEndMarked(false)

      if (timestamps.has(index)) {
        // Use the last recorded word for the selected text if it has been marked before, to allow the user to edit it.
        const timestamp = timestamps.get(index)!
        setRecordedWord(timestamp[timestamp.length - 1].recordedWord)
      }
    }
  }

  // Marks the start time for the currently selected text, allowing the user to mark the end time later.
  const markStart = () => {
    if (!isRecording || selectedWordIndex === null) return
    const startMs = Date.now() - recordingStartRef.current
    setWordEndMarked(false)
    setCurrentWordStartMs(startMs)
  }

  // Marks the end time for the currently selected text
  const markEnd = () => {
    if (!isRecording || selectedWordIndex === null || currentWordStartMs === null) return

    if (recordedWord.trim() === "" && !collection.translatedWords) {
      toast.error(t("validation.enterWordBeforeEndTime"))
      return
    }

    const endMs = Date.now() - recordingStartRef.current
    const word = collection.words[selectedWordIndex]
    const wordId = collection.wordIds[selectedWordIndex]

    // Use the translated word for audio collections, and user input for transcript collections
    const timestamp = {
      word,
      wordId,
      startMs: currentWordStartMs,
      endMs,
      recordedWord: collection.translatedWords ? collection.translatedWords[selectedWordIndex] : recordedWord.trim(),
    }

    setTimestamps((prev) => {
      // Update the timestamps map with the new timestamp for the selected text, keeping previously marked timestamps
      const next = new Map(prev)
      const pastTimestamps = next.get(selectedWordIndex)

      if (pastTimestamps === undefined) {
        next.set(selectedWordIndex, [timestamp])
      } else {
        next.set(selectedWordIndex, [...pastTimestamps, timestamp])
      }

      timestampsRef.current = next
      return next
    })
    setCurrentWordStartMs(null)
    setWordEndMarked(true)
  }

  // Detects when the user navigates away from the page and save the recording to prevent accidental loss of data.
  useEffect(() => {
    if (!isRecording) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = true // Included for legacy support, e.g. Chrome/Edge < 119
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      cleanupStream() // Stop the media stream when the component unmounts or recording stops
      mediaRecorderRef.current?.stop()
    }
  }, [isRecording])

  // Updates the active recording duration every 50ms while recording, and resets it when recording stops.
  useEffect(() => {
    if (!isRecording) {
      setActiveDurationMs(0)
      return
    }

    const interval = window.setInterval(() => {
      setActiveDurationMs(Date.now() - recordingStartRef.current)
    }, 50)

    return () => {
      window.clearInterval(interval)
    }
  }, [isRecording])

  const markedCount = timestamps.size
  const progress = isRecording ? (markedCount / collection.words.length) * 100 : 0

  // Displays the input field for transcript collections, or the translated word for audio collections based on the
  // selected text index.
  const recorderWordInput = (selectedWordIndex: number) => {
    if (collection.translatedWords) {
      // Audio types will use the translated word
      const originalTranslation = collection.translatedWords[selectedWordIndex]
      return (
        <>
          <p className="mb-2 text-sm text-muted-foreground">{t("recorder.translatedWordLabel")}</p>
          <p className="text-3xl font-bold text-foreground">{originalTranslation}</p>
        </>
      )
    }

    // Only allow input for transcript collections
    return (
      <>
        <Label htmlFor="translation" className="text-sm">
          {t("recorder.translationLabel")}
        </Label>
        <Input
          id="translation"
          placeholder={t("recorder.translationPlaceholder")}
          value={recordedWord}
          onChange={(e) => setRecordedWord(e.target.value)}
          disabled={wordEndMarked}
        />
      </>
    )
  }

  const WordRecordingStatus = ({ wordIndex }: { wordIndex: number }) => {
    if (timestamps.has(wordIndex) && currentWordStartMs === null) {
      // Displays the recorded duration for the word if it has been marked and the user is not currently marking it.
      const pastTimestamps = timestamps.get(wordIndex)!
      const lastTimestamp = pastTimestamps[pastTimestamps.length - 1]

      return (
        <div className="flex items-center justify-center gap-2 text-center text-sm text-primary">
          <Check className="size-4" />
          {t("recorder.recordedRange", {
            start: formatDuration(lastTimestamp.startMs),
            end: formatDuration(lastTimestamp.endMs),
          })}
        </div>
      )
    } else if (currentWordStartMs !== null) {
      // Displays the current start time for the word if it is being marked and the end time has not been marked yet.
      return (
        <div className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Mic className="size-4" />
          {t("recorder.startedAt", {
            time: formatDuration(currentWordStartMs),
          })}
        </div>
      )
    } else {
      // Displays a hint to the user on how to mark the start and end times for the word if it has not been marked yet.
      return (
        <div className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          {t("recorder.markDescription")}
        </div>
      )
    }
  }

  // Displays the recording interface, including progress, current text controls, and the word selection modal.
  const recording = (
    <>
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("common.progress")}</span>
          <span className="font-medium">
            {t("recorder.progressCount", { marked: markedCount.toString(), total: collection.words.length.toString() })}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Current Word Controls */}
      {selectedWordIndex !== null && (
        <div className="space-y-4 rounded-lg border bg-muted/50 p-6">
          <div className="text-center">
            <p className="mb-2 text-sm text-muted-foreground">{t("recorder.selectedWordLabel")}</p>
            <p className="text-3xl font-bold text-foreground">{collection.words[selectedWordIndex]}</p>
          </div>
          <div className="justify-center space-y-2 text-center">{recorderWordInput(selectedWordIndex)}</div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={currentWordStartMs === null ? markStart : markEnd}
              className="min-w-[160px] gap-2"
            >
              <Play className="size-5" />
              {currentWordStartMs === null ? t("recorder.markStart") : t("recorder.markEnd")}
            </Button>
          </div>
          <WordRecordingStatus wordIndex={selectedWordIndex} />
        </div>
      )}

      {/* Hint and Word Selection Modal */}
      {selectedWordIndex === null ? (
        <div className="space-y-4 rounded-lg border border-dashed bg-muted/30 p-6 text-center">
          <p className="text-muted-foreground">{t("recorder.selectWordToStart")}</p>
          <WordModal
            collection={collection}
            timestamps={timestamps}
            selectedWordIndex={selectedWordIndex}
            selectWord={selectWord}
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <WordModal
            collection={collection}
            timestamps={timestamps}
            selectedWordIndex={selectedWordIndex}
            selectWord={selectWord}
          />
        </div>
      )}
    </>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="size-5" />
          {t("recorder.cardTitle")}
        </CardTitle>
        <CardDescription>{t("recorder.cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Start/Stop Recording */}
        <div className="flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <Button size="lg" onClick={startRecording} disabled={isSaving} className="gap-2">
              <Mic className="size-5" />
              {t("recorder.startRecording")}
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 font-mono text-lg">
                <span className="inline-flex size-3 animate-pulse rounded-full bg-destructive" />
                {formatDuration(activeDurationMs)}
              </div>
              <Button size="lg" variant="destructive" onClick={stopRecording} className="gap-2">
                <Square className="size-5" />
                {t("recorder.stopAndSave")}
              </Button>
            </>
          )}
        </div>
        {/* Show recording controls only when recording */}
        {isRecording && recording}
      </CardContent>
    </Card>
  )
}
