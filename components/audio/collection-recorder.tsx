"use client"

import { Player } from "@/components/audio/player/player-section"
import { CollectionDetails } from "@/components/audio/recorder/collection-details"
import { Recorder } from "@/components/audio/recorder/recorder-section"
import { Collection, Recording, getRecordings } from "@/lib/db"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { toast } from "sonner"

/**
 * CollectionRecorder component allows users to record audio for a specific collection of texts. It provides
 * recording controls and displays saved recordings for playback.
 */
export default function CollectionRecorder({
  collection,
  onBack,
}: {
  collection: Collection
  onBack: (collection: Collection) => void
}) {
  const t = useTranslations()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [collectionState, setCollectionState] = useState<Collection>(collection)

  // Load the user's recordings when the component mounts
  useEffect(() => {
    // Load recordings and the current collection from the local database
    const loadRecordings = async () => {
      const collectionId = collection.id

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
  }, [collection, t])

  return (
    <main className="min-h-svh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <Recorder collection={collectionState} setRecordings={setRecordings} onBack={onBack} />
        <CollectionDetails collection={collectionState} />
        <Player
          recordings={recordings}
          collection={collectionState}
          setRecordings={setRecordings}
          setCollectionState={setCollectionState}
        />
      </div>
    </main>
  )
}
