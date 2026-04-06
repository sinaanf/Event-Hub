import { format, parseISO } from "date-fns";

export function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function formatDateTime(dateStr: string) {
  if (!dateStr) return "";
  return format(parseISO(dateStr), "MMM d, yyyy h:mm a");
}

export function formatTime(dateStr: string) {
  if (!dateStr) return "";
  return format(parseISO(dateStr), "h:mm a");
}
