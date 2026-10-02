export { cn } from "cn";

export function parseLocalInTimezone(localIso: string, ianaZone: string): Date {
  const [date, time] = localIso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [H, M] = time.split(":").map(Number);

  let guess = new Date(Date.UTC(y, m - 1, d, H, M, 0));
  
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(guess);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  const tzYear = Number(p.year);
  const tzMonth = Number(p.month);
  const tzDay = Number(p.day);
  const tzHour = Number(p.hour);
  const tzMinute = Number(p.minute);

  const tzGuess = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0));
  
  const offsetMs = tzGuess.getTime() - guess.getTime();
  const trueUtc = new Date(Date.UTC(y, m - 1, d, H, M, 0) - offsetMs);
  return trueUtc;
}

export function formatUtcToLocal(utcDate: Date, ianaZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(utcDate);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  let hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
}
