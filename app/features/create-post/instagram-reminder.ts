function calendarText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// RFC 5545 folds at 75 UTF-8 octets, preserving non-ASCII song titles/captions.
function fold(line: string) {
  const encoder = new TextEncoder();
  let bytes = 0;
  let result = "";
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) { result += "\r\n "; bytes = 1; }
    result += character;
    bytes += length;
  }
  return result;
}

export function instagramReminder({ when, song, caption, filenames, uid, now = new Date() }: {
  when: Date; song: string; caption: string; filenames: string[]; uid: string; now?: Date;
}) {
  if (!Number.isFinite(when.getTime()) || when <= now) throw new Error("Choose a future reminder time.");
  const description = `Open Instagram, upload your saved media, add this song: ${song}. Finish publishing in Instagram.\nFiles: ${filenames.join(", ")}\nCaption: ${caption}`;
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Social9//Instagram reminder//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${calendarText(uid)}@social9.io`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(when)}`,
    `DTEND:${stamp(new Date(when.getTime() + 15 * 60_000))}`, "SUMMARY:Publish on Instagram with music",
    `DESCRIPTION:${calendarText(description)}`, "URL:https://www.instagram.com/", "BEGIN:VALARM", "ACTION:DISPLAY",
    "TRIGGER:-PT5M", "DESCRIPTION:Add your music and publish on Instagram", "END:VALARM", "END:VEVENT", "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";
}

export function downloadFile(contents: Blob, name: string) {
  const url = URL.createObjectURL(contents);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
