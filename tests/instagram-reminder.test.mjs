import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/features/create-post/instagram-reminder.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { instagramReminder } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const base = {when:new Date("2026-11-10T14:00:00+05:30"),now:new Date("2026-11-09T08:00:00Z"),uid:"fixture",song:"Song",caption:"Caption",filenames:["photo.jpg"]};

test("Instagram reminder preserves the chosen instant across time zones and includes an alarm", () => {
  const calendar = instagramReminder(base);
  assert.match(calendar, /DTSTART:20261110T083000Z\r\n/);
  assert.match(calendar, /DTEND:20261110T084500Z\r\n/);
  assert.match(calendar, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT5M/);
  assert.match(calendar.replace(/\r\n /g,""), /add this song: Song/);
  assert.throws(() => instagramReminder({...base,when:base.now}), /future/);
  assert.throws(() => instagramReminder({...base,when:new Date("invalid")}), /future/);
});

test("Song notes and captions cannot inject calendar fields; Unicode folds remain valid UTF-8", () => {
  const calendar = instagramReminder({...base,song:"संगीत 🎵 ".repeat(30),caption:"Hello; there, friend\\\r\nBEGIN:VEVENT\r\nATTENDEE:someone@example.test"});
  assert.equal(calendar.match(/\r\nBEGIN:VEVENT\r\n/g)?.length,1);
  assert.doesNotMatch(calendar, /\r\nATTENDEE:/);
  assert.ok(calendar.split("\r\n").every(line => Buffer.byteLength(line,"utf8") <= 75));
  const unfolded = calendar.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("संगीत 🎵 ".repeat(30)));
  assert.ok(unfolded.includes("Hello\\; there\\, friend\\\\\\nBEGIN:VEVENT\\nATTENDEE:someone@example.test"));
});
