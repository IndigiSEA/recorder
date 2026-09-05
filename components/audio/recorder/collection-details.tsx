import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collection } from "@/lib/db"
import { useTranslations } from "next-intl"

export function CollectionDetails({ collection }: { collection: Collection }) {
  const t = useTranslations()

  const formatList = (items?: string[]) => (items && items.length > 0 ? items.join(", ") : "—")

  return (
    <section className="space-y-4">
      {/* Header with Title and Type Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          {t("collectionDetails.sectionTitle")}
        </h2>
        <Badge variant={collection.translatedWords ? "default" : "secondary"}>
          {collection.translatedWords ? t("home.badgeAudioOnly") : t("home.badgeTranscript")}
        </Badge>
      </div>

      <Card>
        <CardContent className="py-2">
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("collectionDetails.wordCountLabel")}
              </dt>
              <dd className="text-base font-medium text-foreground">{collection.words.length}</dd>
            </div>

            <div className="space-y-1.5">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("collectionDetails.createdAtLabel")}
              </dt>
              <dd className="text-base font-medium text-foreground">
                {collection.createdAt
                  .toLocaleString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                  .toLocaleUpperCase()}
              </dd>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("collectionDetails.participantsLabel")}
              </dt>
              <dd className="text-sm leading-relaxed text-foreground">{formatList(collection.participants)}</dd>
            </div>

            <div className="space-y-1.5">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("collectionDetails.interviewersLabel")}
              </dt>
              <dd className="text-sm leading-relaxed text-foreground">{formatList(collection.interviewers)}</dd>
            </div>

            <div className="space-y-1.5">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("collectionDetails.assistantsLabel")}
              </dt>
              <dd className="text-sm leading-relaxed text-foreground">{formatList(collection.assistants)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </section>
  )
}
