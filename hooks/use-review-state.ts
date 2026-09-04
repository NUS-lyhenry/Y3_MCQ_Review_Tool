"use client";

import { useCallback, useEffect, useState } from "react";

import {
  REVIEW_STATE_EVENT,
  emptyReviewState,
  loadReviewState,
  saveReviewState,
  type ReviewState,
} from "@/lib/review-store";

export function useReviewState() {
  const [state, setState] = useState<ReviewState>(emptyReviewState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setState(loadReviewState());
      setHydrated(true);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(REVIEW_STATE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(REVIEW_STATE_EVENT, refresh);
    };
  }, []);

  const update = useCallback((updater: (current: ReviewState) => ReviewState) => {
    const next = updater(loadReviewState());
    saveReviewState(next);
    setState(next);
    return next;
  }, []);

  return { state, update, hydrated };
}
