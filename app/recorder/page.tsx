"use client"

import { CollectionDetails } from "@/components/audio/recorder/collection-details"
import { Player } from "@/components/audio/player/player-section"
import { Recorder } from "@/components/audio/recorder/recorder-section"
import { useCollection } from "@/providers/collection-provider"
import { Recording, getRecordings } from "@/lib/db"
import { useTranslations } from "next-intl"
import { redirect } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

/**
 * CollectionRecorder component allows users to record audio for a specific collection of texts. It provides
 * recording controls and displays saved recordings for playback.
 */
export default function Page() {
  const t = useTranslations()
  const { selectedCollection } = useCollection()
  const [recordings, setRecordings] = useState<Recording[]>([])

  // Load the user's recordings when the component mounts
  useEffect(() => {
    // Load recordings and the current collection from the local database
    const loadRecordings = async () => {
      const collectionId = selectedCollection?.id

      if (!collectionId) {
        return
      }

      try {
        const recordings = await getRecordings(collectionId)
        setRecordings(recordings)
      } catch (error) {
        toast.error(t("errors.couldNotLoadRecordings", { message: (error as Error).message }))
      }
    }

    loadRecordings()
  }, [selectedCollection, t])

  if (!selectedCollection) {
    return redirect("/") // Redirect to the home page if no collection is selected
  }

  return (
    <main className="min-h-svh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <Recorder collection={selectedCollection} setRecordings={setRecordings} />
        <CollectionDetails collection={selectedCollection} />
        {/* Saved Recordings */}
        <Player recordings={recordings} collection={selectedCollection} setRecordings={setRecordings} />
      </div>
    </main>
  )
}
