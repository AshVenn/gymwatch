import assert from "node:assert"
import { describe, it } from "node:test"
import { formatExportCurrency, formatExportDate, resolveExportLocale } from "../lib/export-locale"

describe("export locale helpers", () => {
  it("normalizes known aliases and defaults to fr", () => {
    assert.strictEqual(resolveExportLocale("fr-FR"), "fr")
    assert.strictEqual(resolveExportLocale("EN"), "en")
    assert.strictEqual(resolveExportLocale("ar-ma"), "ar")
    assert.strictEqual(resolveExportLocale(undefined), "fr")
  })

  it("formats currency with the provided locale", () => {
    const fr = formatExportCurrency(199, "fr")
    const en = formatExportCurrency(199, "en")
    assert.notStrictEqual(fr, en)
    assert.ok(fr.includes("199"))
    assert.ok(en.includes("199"))
  })

  it("formats dates with locale aware labels", () => {
    const sample = new Date("2025-02-10T00:00:00.000Z")
    const fr = formatExportDate(sample, "fr")
    const en = formatExportDate(sample, "en")
    assert.notStrictEqual(fr, en)
  })
})
