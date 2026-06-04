import axios from "axios";

export function getAxiosErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
  }
  return fallback;
}
