import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(file) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { contentTemplates, templateDraft } = await load("../app/lib/content-templates.ts");
const { recommendTemplates, personalizeTemplate, brandIndustry, templateSupportedChannels } = await load("../app/lib/brand-templates.ts");
const bakery = { id: 1, name: "Neighbourhood Bakery", channels: ["instagram"], profile: { description: "Fresh sourdough and cakes", audience: "Local families", voice: "Warm", goal: "More comments and engagement", industry: "Restaurant" } };

test("brand recommendations include its industry and general ideas on connected channels only", () => {
  const rows = recommendTemplates(contentTemplates, bakery);
  assert.ok(rows.length > 0);
  assert.ok(rows.some(row => row.template.id === "dish-spotlight"));
  assert.ok(rows.every(row => ["Restaurant", "Any business"].includes(row.template.industry)));
  assert.ok(rows.every(row => row.channels.join() === "instagram"));
  assert.equal(rows[0].template.goal, "Engagement");
});

test("Facebook-only brands get adaptable templates without Instagram or LinkedIn selections", () => {
  const rows = recommendTemplates(contentTemplates, { ...bakery, channels: ["facebook"] });
  assert.ok(rows.some(row => row.template.id === "community-question"));
  assert.ok(rows.every(row => row.channels.join() === "facebook"));
  assert.equal(rows.some(row => row.template.platform === "instagram"), false);
  assert.equal(recommendTemplates(contentTemplates, { ...bakery, channels: [] }).length, 0);
});

test("Pinterest and YouTube connections receive their own publishable templates", () => {
  const rows = recommendTemplates(contentTemplates, { ...bakery, channels: ["pinterest", "youtube"] });
  assert.ok(rows.some(row => row.template.id === "pinterest-how-to" && row.channels.join() === "pinterest"));
  assert.ok(rows.some(row => row.template.id === "youtube-explainer" && row.channels.join() === "youtube"));
  assert.ok(rows.every(row => ["pinterest", "youtube"].includes(row.channels[0])));
  assert.ok(rows.every(row => row.channels.length === 1));
});

test("every supported channel has relevant ideas within its text limit", () => {
  for (const channel of templateSupportedChannels) {
    const rows = recommendTemplates(contentTemplates, { ...bakery, channels: [channel] });
    assert.ok(rows.length > 0, `${channel} should have templates`);
    assert.ok(rows.every(row => row.channels.join() === channel));
    if (channel === "twitter" || channel === "threads" || channel === "pinterest") {
      const limit = channel === "twitter" ? 280 : channel === "threads" ? 500 : 800;
      assert.ok(rows.every(row => templateDraft(row.template).length <= limit), `${channel} draft should fit ${limit} characters`);
    }
    if (channel === "youtube") assert.ok(rows.every(row => row.template.format === "Video"));
    if (channel === "pinterest") assert.ok(rows.every(row => row.template.format === "Pin"));
  }
});

test("business offering and audience personalize supported channel ideas", () => {
  const rows = recommendTemplates(contentTemplates, { ...bakery, channels: ["youtube", "pinterest"] });
  assert.match(rows.find(row => row.template.id === "youtube-introduction").template.caption, /Fresh sourdough and cakes/);
  assert.match(rows.find(row => row.template.id === "youtube-questions").template.caption, /Local families/);
});

test("template drafts use the selected brand without changing catalog or inventing details", () => {
  const original = contentTemplates.find(row => row.id === "behind-scenes");
  const first = personalizeTemplate(original, bakery);
  const second = personalizeTemplate(original, { ...bakery, id: 2, name: "Second Brand" });
  assert.match(templateDraft(first), /Neighbourhood Bakery/);
  assert.match(templateDraft(second), /Second Brand/);
  assert.equal(templateDraft(second).includes("Neighbourhood Bakery"), false);
  assert.ok(original.caption.includes("[business name]"));
  assert.ok(first.caption.includes("[product/service]"));
});

test("unknown industries use general ideas and explicit other business is respected", () => {
  const other = { ...bakery, profile: { ...bakery.profile, industry: "Any business" } };
  assert.equal(brandIndustry(other), null);
  assert.ok(recommendTemplates(contentTemplates, other).every(row => row.template.industry === "Any business"));
});
