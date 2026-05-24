import axiosInstance from "../../api/axiosInstance";
import type { CoachSeverity, GrammarNote, GrammarNoteStatus } from "./types";

export type CreateGrammarNotePayload = {
  turnId?: string;
  sessionId?: string;
  original: string;
  corrected?: string;
  explanationVi?: string;
  tags?: string[];
  severity?: CoachSeverity;
  level?: string;
  aiReplyContext?: string;
  status?: GrammarNoteStatus;
};

export async function fetchGrammarNotes(): Promise<GrammarNote[]> {
  const { data } = await axiosInstance.get<{ success: boolean; notes: GrammarNote[] }>(
    "/speaking-notes",
  );
  return data.notes ?? [];
}

export async function createGrammarNote(
  payload: CreateGrammarNotePayload,
): Promise<GrammarNote> {
  const { data } = await axiosInstance.post<{ success: boolean; note: GrammarNote }>(
    "/speaking-notes",
    payload,
  );
  return data.note;
}

export async function updateGrammarNoteStatus(
  id: string,
  status: GrammarNoteStatus,
): Promise<GrammarNote> {
  const { data } = await axiosInstance.patch<{ success: boolean; note: GrammarNote }>(
    `/speaking-notes/${id}/status`,
    { status },
  );
  return data.note;
}

export async function deleteGrammarNote(id: string): Promise<void> {
  await axiosInstance.delete(`/speaking-notes/${id}`);
}
