"use client"

import { CreateCollectionDialog } from "@/components/collection/create-collection-modal"
import { SettingsDropdown } from "@/components/settings-dropdown"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Collection, getCollections, removeCollection } from "@/lib/db"
import { useCollection } from "@/providers/collection-provider"
import { FolderOpen, Mic, Trash2, Upload } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

/**
 * Shows the card for a single collection with options to open or delete it.
 *
 * @param collection The collection to display in the card.
 * @param onOpen Callback function to open the collection.
 * @param onDelete Callback function to delete the collection.
 * @returns A JSX element representing the collection card.
 */
function CollectionCard({
  collection,
  onOpen,
  onDelete,
}: {
  collection: Collection
  onOpen: () => void
  onDelete: () => void
}) {
  const t = useTranslations()
  return (
    <Card key={collection.id} className="group relative gap-2">
      <CardHeader>
        <div className="flex justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FolderOpen className="size-6 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{collection.name}</CardTitle>
              <CardDescription className="text-xs">
                {new Date(collection.createdAt).toLocaleDateString("en-MY")}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="h-7 px-2.5">
            {collection.translatedWords ? t("home.badgeAudioOnly") : t("home.badgeTranscript")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="mb-1">
        <p>{t("home.collectionCardWordCount", { count: collection.words.length.toString() })}</p>
        <p className="line-clamp-2 truncate text-sm text-muted-foreground">
          {collection.words.slice(0, 3).join(", ")}
          {collection.words.length > 3 && "..."}
        </p>
      </CardContent>
      <CardFooter className="gap-2 border-t">
        <Button className="flex-1 gap-2" onClick={onOpen}>
          <Mic className="size-4" />
          {t("home.openAndRecord")}
        </Button>
        <Button variant="outline" className="text-destructive hover:bg-destructive hover:text-white" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

/**
 * Home page of the Single Page Application (SPA) which switches between views based on the state of the application.
 *
 * - The main view displays the user's collections with options to create new collections or delete existing ones.
 * - When a collection is selected, the view switches to the CollectionRecorder component to record words and manage
 * recordings for the selected collection.
 **/
export default function Page() {
  // Hook to show text, error, and success messages in the user's selected language
  const t = useTranslations()
  const { setSelectedCollection, collections, setCollections } = useCollection()
  const router = useRouter()
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null)

  // Deletes a collection from the local database and updates the user's collections
  const deleteCollection = async (id: string) => {
    try {
      await removeCollection(id)
      setCollections((prevCollections) => prevCollections.filter((collection) => collection.id !== id))
    } catch (error) {
      throw error
    }
  }

  // Load the user's collections from the local database when the component mounts
  useEffect(() => {
    // Loads the user's collections
    const loadCollections = async () => {
      try {
        const collections = await getCollections()
        setCollections(collections)
      } catch (error) {
        toast.error(t("errors.couldNotLoadCollections", { message: (error as Error).message }))
      }
    }
    loadCollections()
  }, [setCollections, t])

  // Show the main view with the user's collections and options to create or delete collections
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 bg-background px-4 py-8">
      <header className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {t("home.headerKicker")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("home.headerTitle")}</h1>
          </div>
          {/* Settings Dropdown for switching languages and themes */}
          <SettingsDropdown />
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("home.headerDescription")}</p>
      </header>
      <CreateCollectionDialog setCollections={setCollections} />
      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          {t("home.collectionsSectionTitle")}
        </h2>

        {collections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="mb-4 size-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t("home.emptyCollections")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onOpen={() => {
                  setSelectedCollection(collection)
                  router.push(`/recorder/`)
                }}
                onDelete={() => setCollectionToDelete(collection)}
              />
            ))}
          </div>
        )}
      </section>
      <AlertDialog open={collectionToDelete !== null} onOpenChange={(open) => !open && setCollectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteCollectionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("home.deleteCollectionDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (collectionToDelete) {
                  toast.promise(deleteCollection(collectionToDelete.id), {
                    loading: t("loading.collectionDeleting"),
                    success: t("success.collectionDeleted"),
                    error: (error) => t("errors.couldNotDeleteCollection", { message: (error as Error).message }),
                  })
                }
                setCollectionToDelete(null)
              }}
              variant="destructive"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
