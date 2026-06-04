export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type GrammarJobName = "ocr" | "embed" | "extract";

export interface GrammarOcrJobData {
  documentId: string;
  filePath: string;
  centerId: string;
  level: JLPTLevel;
}

export interface GrammarEmbedJobData {
  documentId: string;
  centerId: string;
  level: JLPTLevel;
}

export interface GrammarExtractJobData {
  documentId: string;
  centerId: string;
  level: JLPTLevel;
}

export type GrammarJobData = GrammarOcrJobData | GrammarEmbedJobData | GrammarExtractJobData;
