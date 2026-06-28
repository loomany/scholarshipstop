import assert from "node:assert/strict";
import test from "node:test";

import { markdownToHtml } from "./html.js";

const malicious = [
  "<xmp><img src=x onerror=alert(1)></xmp>",
  "<script>alert(1)</script>",
  '<a href="javascript:alert(1)" onclick="alert(2)">unsafe</a>'
].join("");

test("content-hub sanitizer rejects raw-text and attribute XSS", async () => {
  const html = await markdownToHtml(malicious);
  assert.doesNotMatch(html, /<xmp|<script|onerror|onclick|javascript:/i);
});
