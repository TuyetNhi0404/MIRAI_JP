import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createGrammarNote,
  deleteGrammarNote,
  fetchGrammarNotes,
  updateGrammarNoteStatus,
  type CreateGrammarNotePayload,
} from "./grammarNotesApi";
import type { GrammarNote, GrammarNoteStatus } from "./types";

export function useGrammarNotes(enabled: boolean) {
  const [notes, setNotes] = useState<GrammarNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchGrammarNotes();
      setNotes(list);
    } catch {
      setError("Không tải được sổ lỗi.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const savedTurnIds = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      if (n.turnId) set.add(n.turnId);
    }
    return set;
  }, [notes]);

  const issueCount = useMemo(
    () =>
      notes.filter(
        (n) => n.corrected && n.corrected.trim() !== n.original.trim(),
      ).length,
    [notes],
  );

  const newCount = useMemo(
    () =>
      notes.filter(
        (n) =>
          n.status === "new" &&
          n.corrected &&
          n.corrected.trim() !== n.original.trim(),
      ).length,
    [notes],
  );

  const saveNote = useCallback(async (payload: CreateGrammarNotePayload) => {
    const note = await createGrammarNote(payload);
    setNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const setStatus = useCallback(async (id: string, status: GrammarNoteStatus) => {
    const updated = await updateGrammarNoteStatus(id, status);
    setNotes((prev) => prev.map((n) => (n._id === id ? updated : n)));
    return updated;
  }, []);

  const removeNote = useCallback(async (id: string) => {
    await deleteGrammarNote(id);
    setNotes((prev) => prev.filter((n) => n._id !== id));
  }, []);

  const hasNoteForTurn = useCallback(
    (turnId: string) => savedTurnIds.has(turnId),
    [savedTurnIds],
  );

  return {
    notes,
    loading,
    error,
    newCount,
    issueCount,
    savedTurnIds,
    reload,
    saveNote,
    setStatus,
    removeNote,
    hasNoteForTurn,
  };
}
