import dayjs from "dayjs";
import { useMemo } from "react";
import { statusStore } from "@/store";
import { UserStats_MemoTypeStats } from "@/types/proto/api/v1/user_service";
import type { StatisticsData } from "@/types/statistics";

export const useStatisticsData = (): StatisticsData => {
  return useMemo(() => {
    const memoTypeStats = UserStats_MemoTypeStats.fromPartial({
      codeCount: 0,
      linkCount: 0,
      todoCount: 0,
      undoCount: 0,
    });
    const activityStats: Record<string, number> = {};

    const statuses = Object.values(statusStore.state.statusMapById);

    const parser = typeof window !== "undefined" ? new DOMParser() : null;

    for (const status of statuses) {
      if (!status) continue;

      const createdAt = status.createdAt ? dayjs(status.createdAt) : null;
      if (createdAt?.isValid()) {
        const key = createdAt.format("YYYY-MM-DD");
        activityStats[key] = (activityStats[key] || 0) + 1;
      }

      const htmlContent = status.content || "";
      if (htmlContent.includes("<a ")) {
        memoTypeStats.linkCount += 1;
      }

      if (htmlContent.includes("<code") || htmlContent.includes("<pre")) {
        memoTypeStats.codeCount += 1;
      }

      const checkboxMatches = htmlContent.match(/type="checkbox"/g) || [];
      if (checkboxMatches.length > 0) {
        memoTypeStats.todoCount += checkboxMatches.length;
        const completedMatches = htmlContent.match(/type="checkbox"[^>]*checked/gi) || [];
        memoTypeStats.undoCount += completedMatches.length;
      }

      if (parser) {
        try {
          const doc = parser.parseFromString(htmlContent, "text/html");
          const text = doc.body.textContent || "";
          if (/```/.test(text)) {
            memoTypeStats.codeCount += 1;
          }
        } catch (error) {
          console.warn("Failed to parse status content", error);
        }
      }
    }

    return { memoTypeStats, activityStats };
  }, [statusStore.state.statusMapById]);
};
