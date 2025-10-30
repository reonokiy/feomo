import { HashIcon, TagsIcon } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { statusStore } from "@/store";
import memoFilterStore, { MemoFilter } from "@/store/memoFilter";
import { useTranslate } from "@/utils/i18n";

const TagsSection = observer(() => {
  const t = useTranslate();

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(statusStore.state.statusMapById).forEach((status) => {
      status?.tags?.forEach((tag) => {
        if (!tag?.name) {
          return;
        }
        const key = tag.name.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [statusStore.state.statusMapById]);

  const handleTagClick = (tag: string) => {
    const isActive = memoFilterStore.getFiltersByFactor("tagSearch").some((filter: MemoFilter) => filter.value === tag);
    if (isActive) {
      memoFilterStore.removeFilter((f: MemoFilter) => f.factor === "tagSearch" && f.value === tag);
    } else {
      memoFilterStore.addFilter({
        factor: "tagSearch",
        value: tag,
      });
    }
  };

  return (
    <div className="flex flex-col justify-start items-start w-full mt-3 px-1 h-auto shrink-0 flex-nowrap hide-scrollbar">
      <div className="flex flex-row justify-between items-center w-full gap-1 mb-1 text-sm leading-6 text-muted-foreground select-none">
        <span>{t("common.tags")}</span>
      </div>
      {tagCounts.length > 0 ? (
        <div className="w-full flex flex-row flex-wrap gap-x-2 gap-y-1">
          {tagCounts.map((tag) => {
            const isActive = memoFilterStore.getFiltersByFactor("tagSearch").some((filter) => filter.value === tag.name);
            return (
              <button
                key={tag.name}
                type="button"
                onClick={() => handleTagClick(tag.name)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/20 hover:text-primary",
                )}
              >
                <HashIcon className="h-4 w-4" />
                <span className="truncate max-w-24">{tag.name}</span>
                <span className="text-xs opacity-70">{tag.count}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-2 border border-dashed rounded-md flex flex-row justify-start items-start gap-1 text-muted-foreground">
          <TagsIcon className="h-4 w-4" />
          <p className="mt-0.5 text-sm leading-snug italic">No tags available yet.</p>
        </div>
      )}
    </div>
  );
});

export default TagsSection;
