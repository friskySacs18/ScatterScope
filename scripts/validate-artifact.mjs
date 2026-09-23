import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Script } from "node:vm";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

const response = await workerModule.default.fetch(
  new Request("https://artifact.local/"),
  {},
  {},
);
assert.equal(response.status, 200, "Root route must render successfully");
const html = await response.text();
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const inlineScript = inlineScripts.at(-1)?.[1];
assert.ok(inlineScript, "Rendered page must contain its client script");
new Script(inlineScript, { filename: "rendered-client.js" });
assert.ok(html.includes('id="callerForm"'), 'Callout setup must be the home page');
assert.ok(!html.includes('__OPTICAL_ASSET__'), 'No unresolved image assets');
const legacy = await workerModule.default.fetch(new Request('https://artifact.local/launch-research'), {}, {});
assert.equal(legacy.status, 200);
const legacyHtml = await legacy.text();
assert.ok(legacyHtml.includes('id="chamberCanvas"'), 'Launch research must retain the 3D canvas');
assert.ok(legacyHtml.includes('precision highp float'), 'Production shader must be embedded');
const account = await workerModule.default.fetch(new Request('https://artifact.local/account'), {}, {});
assert.equal(account.status, 200);
assert.ok((await account.text()).includes('id="accountRoot"'), 'Trading account route must render');
const accountScript = await workerModule.default.fetch(new Request('https://artifact.local/account.js'), {}, {});
assert.equal(accountScript.status, 200);
assert.ok((await accountScript.text()).includes('cmuejmq9g00eg0cla13182nah'), 'Privy app must be configured');
const missingWallet = await workerModule.default.fetch(new Request('https://artifact.local/api/account/balance'), {}, {});
assert.equal(missingWallet.status, 400, 'Invalid account balance query must fail closed');

console.log("Artifact is valid ESM and the rendered client script parses");
