const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "..", "site", "app.js"), "utf8");

assert.match(appSource, /label:\s*"Treasury Reserve"/);
assert.doesNotMatch(appSource, /label:\s*"Reserve Deposit"/);
assert.doesNotMatch(appSource, /label:\s*"Reserve Drawdown"/);
assert.doesNotMatch(appSource, /label:\s*"Projected Reserve"/);
