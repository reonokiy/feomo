import dayjs from "dayjs";
import type { mastodon } from "@/lib/gotosocial";
import type { MemoFilter } from "@/store/memoFilter";

const parser = typeof window !== "undefined" ? new DOMParser() : null;

const extractText = (html: string): string => {
  if (!parser) {
    return html;
  }

  try {
    const doc = parser.parseFromString(html, "text/html");
    return doc.body.textContent || "";
  } catch (error) {
    console.warn("Failed to parse status content", error);
    return html;
  }
};

const matchesFilter = (status: mastodon.v1.Status, filter: MemoFilter): boolean => {
  const content = status.content || "";

  switch (filter.factor) {
    case "tagSearch": {
      const tagName = filter.value.replace(/^#/, "").toLowerCase();
      return status.tags?.some((tag) => tag.name?.toLowerCase() === tagName) ?? false;
    }
    case "contentSearch": {
      const text = extractText(content).toLowerCase();
      return text.includes(filter.value.toLowerCase());
    }
    case "displayTime": {
      if (!status.createdAt) return false;
      return dayjs(status.createdAt).format("YYYY-MM-DD") === dayjs(filter.value).format("YYYY-MM-DD");
    }
    case "pinned":
      return Boolean(status.pinned);
    case "property.hasLink":
      return /<a\s/i.test(content);
    case "property.hasTaskList":
      return /type="checkbox"/i.test(content);
    case "property.hasCode":
      return /<code|<pre|```/.test(content);
    case "visibility":
      return status.visibility === filter.value;
    default:
      return true;
  }
};

export const filterStatuses = (statuses: mastodon.v1.Status[], filters: MemoFilter[]): mastodon.v1.Status[] => {
  if (!filters.length) {
    return statuses;
  }

  return statuses.filter((status) => filters.every((filter) => matchesFilter(status, filter)));
};
