import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const source = await readFile(new URL("../app/lib/chart-scale.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { chartScale } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("counts keep a true zero baseline and never clip the largest value", () => {
  const scale = chartScale([0, 3, 19, 612]);
  assert.equal(scale.position(0), 100);
  assert.ok(scale.high >= 612);
  assert.ok(scale.position(612) >= 0);
  assert.ok(scale.position(3) > scale.position(19));
  assert.equal(scale.low, 0);
});

test("missing and zero data produce a finite, readable integer scale", () => {
  for (const values of [[], [null, null], [0, 0], [1, null]]) {
    const scale = chartScale(values);
    assert.ok(scale.high > scale.low);
    assert.ok(Number.isFinite(scale.position(0)));
    assert.ok(scale.ticks.every(Number.isInteger));
  }
});

test("net losses render below zero while positive values render above", () => {
  const scale = chartScale([-30, null, 0, 70]);
  assert.ok(scale.low <= -30 && scale.high >= 70);
  assert.ok(scale.position(-30) > scale.zero);
  assert.ok(scale.position(70) < scale.zero);
  assert.ok(scale.zero > 0 && scale.zero < 100);
});
