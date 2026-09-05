"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Item, ItemContent, ItemDescription } from "@/components/ui/item"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addCollection, Collection } from "@/lib/db"
import { collectionTypes, CollectionTypeValue, parseCSVFile, Word } from "@/lib/parse-csv"
import { zodResolver } from "@hookform/resolvers/zod"
import { CirclePlus, FileSpreadsheet, Plus, Trash2, Upload, XIcon } from "lucide-react"
import { Dispatch, SetStateAction, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

/**
 * Dialog for creating a new collection. The user inputs a collection name, enters the name of participants,
 * interviewers and assistants, selects a collection type (transcript or audio-only), and uploads a CSV file containing
 * words/sentences for the collection.
 * @param setCollections Function to update the list of collections after a new collection is created.
 * @returns A JSX element representing the create collection dialog.
 */
export function CreateCollectionDialog({ setCollections }: { setCollections: Dispatch<SetStateAction<Collection[]>> }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const t = useTranslations()

  // Define the form schema using Zod for validation of the collection creation form.
  const formSchema = z.object({
    name: z.string().min(1, { message: t("validation.enterCollectionName") }),
    collectionType: z.enum(
      collectionTypes.map((item) => item.value),
      { message: t("validation.selectCollectionType") }
    ),
    participants: z.array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, { message: t("validation.enterParticipantName") }),
      })
    ),
    interviewers: z.array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, { message: t("validation.enterInterviewerName") }),
      })
    ),
    assistants: z.array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, { message: t("validation.enterAssistantName") }),
      })
    ),
  })

  // Initialise the form using react-hook-form with Zod resolver for validation and default values for the fields.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      collectionType: collectionTypes[0].value,
      participants: [{ name: "" }],
      interviewers: [{ name: "" }],
      assistants: [],
    },
  })

  // useFieldArray to manage dynamic fields for participants, interviewers, and assistants
  const {
    fields: participantFields,
    append: appendParticipant,
    remove: removeParticipant,
  } = useFieldArray({
    control: form.control,
    name: "participants",
  })

  const {
    fields: interviewerFields,
    append: appendInterviewer,
    remove: removeInterviewer,
  } = useFieldArray({
    control: form.control,
    name: "interviewers",
  })

  const {
    fields: assistantFields,
    append: appendAssistant,
    remove: removeAssistant,
  } = useFieldArray({
    control: form.control,
    name: "assistants",
  })

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const selectedFile = e.dataTransfer?.files[0]
    if (selectedFile) {
      handleFileUpload(selectedFile)
    }
  }

  const removeFile = () => {
    setFile(null)
    setWords([])
    // Reset file input value manually so the same file can be selected again if needed
    const fileInput = document.getElementById("csv-upload-hidden") as HTMLInputElement
    if (fileInput) fileInput.value = ""
  }

  // Toggles the dialog and clearing the uploaded words, selected file and form errors while retaining the form state.
  const resetDialogState = (value: boolean) => {
    setIsCreateDialogOpen(value)
    removeFile()
    form.clearErrors()
  }

  const handleFileUpload = (selectedFile: File) => {
    setWords([])
    if (!selectedFile) {
      removeFile()
      return
    }

    setFile(selectedFile)
    parseCSVFile(selectedFile, form.getValues("collectionType"), setWords, t)
  }

  const setCollectionType = (value: CollectionTypeValue) => {
    form.setValue("collectionType", value)
    setWords([])
    if (file) {
      parseCSVFile(file, value, setWords, t)
    }
  }

  const saveCollection = async (data: z.infer<typeof formSchema>) => {
    if (words.length === 0) {
      throw new Error(t("validation.uploadCsvFirst"))
    }

    try {
      const newCollection: Collection = {
        id: crypto.randomUUID(),
        name: data.name.trim(),
        wordIds: words.map(({ id }) => id),
        words: words.map(({ word }) => word),
        wordRecorded: words.map(() => false),
        createdAt: new Date(),
        translatedWords: data.collectionType === "audio" ? words.map(({ translatedWord }) => translatedWord!) : null,
        participants: data.participants.map(({ name }) => name.trim()),
        interviewers: data.interviewers.map(({ name }) => name.trim()),
        assistants: data.assistants.map(({ name }) => name.trim()),
      }

      await addCollection(newCollection)
      setCollections((prevCollections) => [newCollection, ...prevCollections])

      form.reset()
      resetDialogState(false)
    } catch (error) {
      throw error
    }
  }
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    return await toast.promise(saveCollection(data), {
      loading: t("loading.collectionSaving"),
      success: t("success.collectionCreated"),
      error: (error) => t("errors.couldNotCreateCollection", { message: (error as Error).message }),
    }).unwrap()
  }
  

  const formatPreview = (words: Word[]) => {
    const previewWords = words.slice(0, 3).map(({ word }) => word)
    const previewSentences = previewWords.map((sentence) => {
      const sentenceWords = sentence.split(" ")
      return sentenceWords.length > 3 ? sentenceWords.slice(0, 3).join(" ") + "..." : sentence
    })
    const preview = previewSentences.join(", ") + (words.length > 3 ? ", ..." : "")
    return t("home.previewWordsLoaded", { count: words.length.toString(), preview })
  }

  const isSubmitDisabled = words.length === 0 || form.formState.isSubmitting

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={resetDialogState}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-10 w-full gap-2 p-4 md:w-fit">
          <Plus className="size-4" />
          {t("home.createCollectionButton")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("home.createDialogTitle")}</DialogTitle>
          <DialogDescription>{t("home.createDialogDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="-mx-6 no-scrollbar max-h-[60vh] overflow-y-auto px-6">
            <FieldGroup className="gap-6">
              {/* 1. Collection Name */}
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="collection-name">
                      <span>
                        {t("home.collectionNameLabel")} <span className="text-destructive">*</span>
                      </span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id="collection-name"
                      aria-invalid={fieldState.invalid}
                      placeholder={t("home.collectionNamePlaceholder")}
                      className={fieldState.invalid ? "border-destructive" : ""}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <FieldSeparator />

              {/* 2. People Section */}
              <FieldSet className="gap-4">
                <FieldLegend variant="label">
                  {t("home.collectionParticipantsLabel")} <span className="text-destructive">*</span>
                </FieldLegend>
                <FieldGroup>
                  {participantFields.map((field, index) => (
                    <Controller
                      key={field.id}
                      name={`participants.${index}.name`}
                      control={form.control}
                      render={({ field: controllerField, fieldState }) => (
                        <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                          <FieldContent className="flex-1">
                            <InputGroup>
                              <InputGroupInput
                                {...controllerField}
                                aria-invalid={fieldState.invalid}
                                placeholder={t("home.collectionParticipantsPlaceholder")}
                                className={fieldState.invalid ? "border-destructive" : ""}
                              />
                              {participantFields.length > 1 && (
                                <InputGroupAddon align="inline-end">
                                  <InputGroupButton
                                    type="button"
                                    variant="ghost"
                                    onClick={() => removeParticipant(index)}
                                    aria-label={`Remove Participant ${index + 1}`}
                                  >
                                    <XIcon className="size-4 text-muted-foreground" />
                                  </InputGroupButton>
                                </InputGroupAddon>
                              )}
                            </InputGroup>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </FieldContent>
                        </Field>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => appendParticipant({ name: "" })}
                  >
                    <CirclePlus className="mr-2 size-4" />
                    {t("home.collectionAddParticipantLabel")}
                  </Button>
                </FieldGroup>
              </FieldSet>

              <FieldSet className="gap-4">
                <FieldLegend variant="label">
                  {t("home.collectionInterviewersLabel")} <span className="text-destructive">*</span>
                </FieldLegend>
                <FieldGroup>
                  {interviewerFields.map((field, index) => (
                    <Controller
                      key={field.id}
                      name={`interviewers.${index}.name`}
                      control={form.control}
                      render={({ field: controllerField, fieldState }) => (
                        <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                          <FieldContent className="flex-1">
                            <InputGroup>
                              <InputGroupInput
                                {...controllerField}
                                aria-invalid={fieldState.invalid}
                                placeholder={t("home.collectionInterviewersPlaceholder")}
                                className={fieldState.invalid ? "border-destructive" : ""}
                              />
                              {interviewerFields.length > 1 && (
                                <InputGroupAddon align="inline-end">
                                  <InputGroupButton
                                    type="button"
                                    variant="ghost"
                                    onClick={() => removeInterviewer(index)}
                                    aria-label={`Remove Interviewer ${index + 1}`}
                                  >
                                    <XIcon className="size-4 text-muted-foreground" />
                                  </InputGroupButton>
                                </InputGroupAddon>
                              )}
                            </InputGroup>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </FieldContent>
                        </Field>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => appendInterviewer({ name: "" })}
                  >
                    <CirclePlus className="mr-2 size-4" />
                    {t("home.collectionAddInterviewerLabel")}
                  </Button>
                </FieldGroup>
              </FieldSet>

              <FieldSet className="gap-4">
                <FieldLegend variant="label">
                  <span>
                    {t("home.collectionAssistantsLabel")}{" "}
                    <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </span>
                </FieldLegend>
                <FieldGroup>
                  {assistantFields.map((field, index) => (
                    <Controller
                      key={field.id}
                      name={`assistants.${index}.name`}
                      control={form.control}
                      render={({ field: controllerField, fieldState }) => (
                        <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                          <FieldContent className="flex-1">
                            <InputGroup>
                              <InputGroupInput
                                {...controllerField}
                                aria-invalid={fieldState.invalid}
                                placeholder={t("home.collectionAssistantsPlaceholder")}
                                className={fieldState.invalid ? "border-destructive" : ""}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  type="button"
                                  variant="ghost"
                                  onClick={() => removeAssistant(index)}
                                  aria-label={`Remove Assistant ${index + 1}`}
                                >
                                  <XIcon className="size-4 text-muted-foreground" />
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </FieldContent>
                        </Field>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => appendAssistant({ name: "" })}
                  >
                    <CirclePlus className="mr-2 size-4" />
                    {t("home.collectionAddAssistantLabel")}
                  </Button>
                </FieldGroup>
              </FieldSet>

              <FieldSeparator />

              {/* 3. Collection Type & File Upload */}
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="collection-type">
                    <span>
                      {t("home.collectionTypeLabel")} <span className="text-destructive">*</span>
                    </span>
                  </FieldLabel>
                  <Controller
                    name="collectionType"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={setCollectionType} value={field.value}>
                        <SelectTrigger id="collection-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {collectionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {t(type.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field className="mb-2">
                  <FieldLabel>
                    <span>
                      {t("home.uploadWordListLabel")} <span className="text-destructive">*</span>
                    </span>
                  </FieldLabel>
                  {/* Hidden native input */}
                  <input
                    id="csv-upload-hidden"
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(file)
                      }
                    }}
                    className="hidden"
                  />

                  {/* Custom Styled Dropzone */}
                  <label htmlFor="csv-upload-hidden">
                    {file ? (
                      <Empty
                        className="cursor-pointer border border-dashed border-primary bg-primary/5"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <EmptyHeader>
                          <EmptyMedia variant="default" className="size-12">
                            <FileSpreadsheet className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle>{file.name}</EmptyTitle>
                          <EmptyDescription>{(file.size / 1024).toFixed(2)} KB</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <Button
                            variant="destructive"
                            onClick={(e) => {
                              e.preventDefault()
                              removeFile()
                            }}
                          >
                            <Trash2 /> Remove file
                          </Button>
                        </EmptyContent>
                      </Empty>
                    ) : (
                      <Empty
                        className="cursor-pointer border border-dashed"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <EmptyHeader>
                          <EmptyMedia variant="icon" className="size-12">
                            <Upload className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle>{t("csv.upload")}</EmptyTitle>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </label>
                  <Item variant="muted" className="border-border">
                    <ItemContent>
                      <ItemDescription>
                        {file && words.length > 0 ? formatPreview(words) : t("home.uploadWordListHelperEmpty")}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                </Field>
              </FieldGroup>
            </FieldGroup>
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={form.formState.isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {t("home.createCollectionButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
