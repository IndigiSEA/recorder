"use client"

import { CollectionDetails } from "@/components/audio/collection-details"
import { Player } from "@/components/audio/player"
import { Recorder } from "@/components/audio/recorder"
import { useAppLanguage } from "@/components/language-provider"
import { Collection, Recording, getRecordings } from "@/lib/db"
import { useEffect, useState } from "react"

interface CollectionRecorderProps {
  collection: Collection
  setSelectedCollection: (collection: Collection) => void
  onBack: () => void
}

/**
 * CollectionRecorder component allows users to record audio for a specific collection of texts. It provides
 * recording controls and displays saved recordings for playback.
 */
export function CollectionRecorder({ collection, setSelectedCollection, onBack }: CollectionRecorderProps) {
  const { onError } = useAppLanguage()
  const [recordings, setRecordings] = useState<Recording[]>([])

  // Load recordings for the current collection from the local database
  const loadRecordings = async () => {
    try {
      const recordings = await getRecordings(collection.id)
      setRecordings(recordings)
    } catch (error) {
      onError("errors.couldNotLoadRecordings", { message: (error as Error).message })
    }
  }

  // Load the user's recordings when the component mounts
  useEffect(() => {
    loadRecordings()
  }, [])

  return (
    <main className="min-h-svh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <Recorder collection={collection} setRecordings={setRecordings} onBack={onBack} />
        <CollectionDetails collection={collection} />
        {/* Saved Recordings */}
        <Player
          recordings={recordings}
          collection={collection}
          setRecordings={setRecordings}
          setSelectedCollection={setSelectedCollection}
        />
      </div>
    </main>
  )
}
