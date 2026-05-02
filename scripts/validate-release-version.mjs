#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "";

const expectedProductName = "Madi";
const expectedPackageName = "madi";
const expectedLibName = "madi_lib";
const expectedBundleId = "com.seongmin.madi";
const expectedIcloudContainer = "iCloud.com.seongmin.madi";
const oldProductName = ["Min", "Note"].join("");
const oldProductLower = ["min", "note"].join("");
const forbiddenPatterns = [
  new RegExp(oldProductName, "g"),
  new RegExp(oldProductLower, "g"),
  new RegExp(oldProductLower.toUpperCase(), "g"),
  new RegExp(`${oldProductName.slice(0, 1)}${oldProductLower.slice(1)}`, "g"),
  new RegExp(`com\\.seongmin\\.${oldProductLower}`, "g"),
  new RegExp(`iCloud\\.com\\.seongmin\\.${oldProductLower}`, "g"),
  new RegExp(`${oldProductName}Zone`, "g"),
  new RegExp(`${oldProductLower}\\.sqlite3`, "g"),
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function tomlString(content, key) {
  const match = content.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"));
  return match?.[1] ?? "";
}

function cargoLockPackageVersion(content, packageName) {
  const packagePattern = new RegExp(
    String.raw`\[\[package\]\]\s+name = "${packageName}"\s+version = "([^"]+)"`,
    "m",
  );
  return content.match(packagePattern)?.[1] ?? "";
}

function shouldSkipDirectory(name) {
  return new Set([
    ".git",
    ".local-release",
    "dist",
    "node_modules",
    "target",
  ]).has(name);
}

function isBinary(buffer) {
  return buffer.subarray(0, 8000).includes(0);
}

function scanForbiddenTerms(directory) {
  const findings = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && shouldSkipDirectory(entry.name)) {
        continue;
      }

      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const buffer = fs.readFileSync(entryPath);
      if (isBinary(buffer)) {
        continue;
      }

      const content = buffer.toString("utf8");
      for (const pattern of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(content)) {
          findings.push(path.relative(rootDir, entryPath));
          break;
        }
      }
    }
  }

  walk(directory);
  return findings;
}

if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  fail(`Release tag must use vX.Y.Z format: ${tag || "(empty)"}`);
}

const version = tag.slice(1);
const packageJson = readJson("package.json");
const tauriConfig = readJson("src-tauri/tauri.conf.json");
const cargoToml = readText("src-tauri/Cargo.toml");
const cargoLock = readText("src-tauri/Cargo.lock");

assertEqual(packageJson.name, expectedPackageName, "package.json name");
assertEqual(packageJson.version, version, "package.json version");
assertEqual(tauriConfig.productName, expectedProductName, "tauri productName");
assertEqual(tauriConfig.version, version, "tauri version");
assertEqual(tauriConfig.identifier, expectedBundleId, "tauri identifier");
assertEqual(tomlString(cargoToml, "name"), expectedPackageName, "Cargo.toml package name");
assertEqual(tomlString(cargoToml, "version"), version, "Cargo.toml version");
assertEqual(tomlString(cargoToml, "name").trim(), expectedPackageName, "Cargo.toml name");
assertEqual(cargoLockPackageVersion(cargoLock, expectedPackageName), version, "Cargo.lock madi version");

if (!cargoToml.includes(`name = "${expectedLibName}"`)) {
  fail(`Cargo.toml lib name must be ${expectedLibName}`);
}

const endpoints = tauriConfig.plugins?.updater?.endpoints ?? [];
if (
  endpoints.length !== 1 ||
  endpoints[0] !== "https://github.com/ChoSeongmin1128/Madi/releases/latest/download/latest.json"
) {
  fail("Tauri updater endpoint must point to the Madi latest.json release asset");
}

const entitlements = [
  readText("src-tauri/Entitlements.plist"),
  readText("src-tauri/Entitlements.Helper.plist"),
].join("\n");
if (!entitlements.includes(expectedIcloudContainer)) {
  fail(`${expectedIcloudContainer} is required in app entitlements`);
}

const forbiddenFindings = scanForbiddenTerms(rootDir);
if (forbiddenFindings.length > 0) {
  fail(`Forbidden old app identity terms found:\n${forbiddenFindings.map((file) => `- ${file}`).join("\n")}`);
}

console.log(`Release identity validated for ${expectedProductName} ${version}`);
