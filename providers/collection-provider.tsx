"use client"

import { Collection } from "@/lib/db"
import { createContext, Dispatch, SetStateAction, useContext, useState } from "react"

interface CollectionContextType {
  collections: Collection[]
  selectedCollection: Collection | null
  setCollections: Dispatch<SetStateAction<Collection[]>>
  setSelectedCollection: Dispatch<SetStateAction<Collection | null>>
}

const CollectionContext = createContext<CollectionContextType | null>(null)

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])

  return (
    <CollectionContext.Provider value={{ selectedCollection, setSelectedCollection, collections, setCollections }}>
      {children}
    </CollectionContext.Provider>
  )
}

export function useCollection() {
  const context = useContext(CollectionContext)
  if (!context) {
    throw new Error("useCollection must be used within a CollectionProvider")
  }
  return context
}
