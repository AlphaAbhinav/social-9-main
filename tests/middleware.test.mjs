import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { proxy } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("Framework proxy has no runtime package imports and forwards a fresh nonce", () => {
  assert.doesNotMatch(compiled, /(?:^|\n)\s*import\s/);
  const request = new Request("https://www.social9.io/", {
    headers: { "x-nonce": "untrusted-nonce", accept: "text/html" },
  });
  const first = proxy(request);
  const second = proxy(request);
  const nonce = first.headers.get("x-middleware-request-x-nonce");
  assert.ok(nonce);
  assert.notEqual(nonce, "untrusted-nonce");
  assert.notEqual(nonce, second.headers.get("x-middleware-request-x-nonce"));
  assert.equal(first.headers.get("x-middleware-next"), "1");
  const policy = first.headers.get("Content-Security-Policy");
  assert.ok(policy.includes(`'nonce-${nonce}'`));
  assert.equal(first.headers.get("x-middleware-request-content-security-policy"), policy);
  assert.equal(first.headers.get("x-middleware-request-accept"), "text/html");
  assert.match(first.headers.get("x-middleware-override-headers"), /x-nonce/);
  assert.match(first.headers.get("Cache-Control"), /no-store/);
});
