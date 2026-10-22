import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { can } from "../src/features/auth/permissions";
import {
  emailSchema,
  loginSchema,
  createAdminSchema,
  resetPasswordSchema,
} from "../src/features/auth/validators";
import {
  formatTunisDateTime,
  parseTunisDateTime,
} from "../src/features/content/dates";
import { localizedValue } from "../src/features/content/localized";

test("login accepts a valid normalized email and present password", () => {
  assert.deepEqual(
    loginSchema.parse({ email: "  USER@example.com ", password: "old-password" }),
    { email: "user@example.com", password: "old-password" },
  );
});

test("email and password-reset inputs reject invalid values", () => {
  assert.equal(emailSchema.safeParse("not-an-email").success, false);
  assert.equal(
    resetPasswordSchema.safeParse({
      token: "a".repeat(20),
      password: "Short1",
      confirm: "Short1",
    }).success,
    false,
  );
  assert.equal(
    resetPasswordSchema.safeParse({
      token: "a".repeat(20),
      password: "SecurePassword123",
      confirm: "DifferentPassword123",
    }).success,
    false,
  );
});

test("password reset accepts matching policy-compliant values", () => {
  assert.equal(
    resetPasswordSchema.safeParse({
      token: "a".repeat(20),
      password: "SecurePassword123",
      confirm: "SecurePassword123",
    }).success,
    true,
  );
});

test("admin creation validates and normalizes account details", () => {
  assert.deepEqual(
    createAdminSchema.parse({
      name: "  New Admin ",
      email: " ADMIN@example.com ",
      password: "SecurePassword123",
      confirm: "SecurePassword123",
    }),
    {
      name: "New Admin",
      email: "admin@example.com",
      password: "SecurePassword123",
      confirm: "SecurePassword123",
    },
  );
  assert.equal(createAdminSchema.safeParse({
    name: " ", email: "admin@example.com", password: "SecurePassword123", confirm: "SecurePassword123",
  }).success, false);
  assert.equal(createAdminSchema.safeParse({
    name: "Admin", email: "not-an-email", password: "SecurePassword123", confirm: "SecurePassword123",
  }).success, false);
  assert.equal(createAdminSchema.safeParse({
    name: "Admin", email: "admin@example.com", password: "short", confirm: "short",
  }).success, false);
  assert.equal(createAdminSchema.safeParse({
    name: "Admin", email: "admin@example.com", password: "SecurePassword123", confirm: "DifferentPassword456",
  }).success, false);
});

test("role permissions grant only the intended actions", () => {
  assert.equal(can("EDITOR", "content:edit"), true);
  assert.equal(can("EDITOR", "content:publish"), false);
  assert.equal(can("ADMIN", "org:manage"), true);
  assert.equal(can("ADMIN", "users:manage"), false);
  assert.equal(can("SUPER_ADMIN", "users:manage"), true);
  assert.equal(can("SUPER_ADMIN", "audit:view"), true);
  assert.equal(can(undefined, "content:edit"), false);
});

test("Tunisian event datetime parsing validates wall-clock input", () => {
  const parsed = parseTunisDateTime("2026-06-15T12:30");
  assert.equal(parsed?.toISOString(), "2026-06-15T11:30:00.000Z");
  assert.equal(parseTunisDateTime("2026-02-30T12:30"), undefined);
  assert.equal(parseTunisDateTime("2026-06-15 12:30"), undefined);
});

test("Tunisian event datetime formatting round-trips", () => {
  const parsed = parseTunisDateTime("2026-06-15T12:30");
  assert.ok(parsed);
  assert.equal(formatTunisDateTime(parsed), "2026-06-15T12:30");
  assert.equal(formatTunisDateTime(null), "");
});

test("localized public content selects the requested translation", () => {
  const title = { fr: "Événement", en: "Event" };
  assert.equal(localizedValue(title, "fr"), "Événement");
  assert.equal(localizedValue(title, "en"), "Event");
  assert.equal(localizedValue({ fr: 42 }, "fr"), "");
  assert.equal(localizedValue(null, "en"), "");
});

test("English and French message catalogs have matching keys and shapes", async () => {
  const [english, french] = await Promise.all([
    readFile(new URL("../src/i18n/messages/en.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../src/i18n/messages/fr.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  const compareShape = (left: unknown, right: unknown, path: string) => {
    assert.equal(typeof left, typeof right, `Translation type mismatch at ${path}`);
    if (Array.isArray(left) || Array.isArray(right)) {
      assert.ok(Array.isArray(left) && Array.isArray(right), `Translation array mismatch at ${path}`);
      assert.equal(left.length, right.length, `Translation array length mismatch at ${path}`);
      left.forEach((value, index) => compareShape(value, right[index], `${path}[${index}]`));
      return;
    }
    if (left && right && typeof left === "object" && typeof right === "object") {
      const leftRecord = left as Record<string, unknown>;
      const rightRecord = right as Record<string, unknown>;
      assert.deepEqual(
        Object.keys(leftRecord).sort(),
        Object.keys(rightRecord).sort(),
        `Translation keys mismatch at ${path}`,
      );
      for (const key of Object.keys(leftRecord)) {
        compareShape(leftRecord[key], rightRecord[key], `${path}.${key}`);
      }
    }
  };

  compareShape(english, french, "messages");
});
