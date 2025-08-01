#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Dependencias principales que usamos
const mainDependencies = [
  "puppeteer",
  "puppeteer-extra",
  "puppeteer-extra-plugin-stealth",
  "puppeteer-extra-plugin-user-data-dir",
  "puppeteer-extra-plugin-user-preferences",
  "fs-extra",
  "graceful-fs",
  "universalify",
  "jsonfile",
];

// Función para obtener todas las dependencias transitivas
function getTransitiveDependencies(packageName) {
  try {
    const result = execSync(`npm ls ${packageName} --json`, { encoding: "utf8" });
    const data = JSON.parse(result);
    return extractDependencies(data);
  } catch (error) {
    console.log(`Error getting dependencies for ${packageName}:`, error.message);
    return [];
  }
}

// Función recursiva para extraer todas las dependencias
function extractDependencies(node, deps = new Set()) {
  if (node.dependencies) {
    Object.keys(node.dependencies).forEach((dep) => {
      deps.add(dep);
      extractDependencies(node.dependencies[dep], deps);
    });
  }
  return Array.from(deps);
}

// Función para verificar si una dependencia está en package.json
function isInPackageJson(dep) {
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    return packageJson.dependencies && packageJson.dependencies[dep];
  } catch (error) {
    return false;
  }
}

// Función para verificar si una dependencia está en next.config.ts
function isInNextConfig(dep) {
  try {
    const nextConfig = fs.readFileSync("next.config.ts", "utf8");
    return nextConfig.includes(`"${dep}"`) || nextConfig.includes(`'${dep}'`);
  } catch (error) {
    return false;
  }
}

console.log("🔍 Analizando dependencias transitivas...\n");

const allTransitiveDeps = new Set();

// Obtener todas las dependencias transitivas
mainDependencies.forEach((dep) => {
  console.log(`📦 Analizando ${dep}...`);
  const transitiveDeps = getTransitiveDependencies(dep);
  transitiveDeps.forEach((td) => allTransitiveDeps.add(td));
});

console.log("\n📋 Dependencias transitivas encontradas:");
const sortedDeps = Array.from(allTransitiveDeps).sort();

const missingInPackageJson = [];
const missingInNextConfig = [];

sortedDeps.forEach((dep) => {
  const inPackageJson = isInPackageJson(dep);
  const inNextConfig = isInNextConfig(dep);

  console.log(`  ${dep}:`);
  console.log(`    📦 package.json: ${inPackageJson ? "✅" : "❌"}`);
  console.log(`    ⚙️  next.config.ts: ${inNextConfig ? "✅" : "❌"}`);

  if (!inPackageJson) missingInPackageJson.push(dep);
  if (!inNextConfig) missingInNextConfig.push(dep);
});

if (missingInPackageJson.length > 0) {
  console.log("\n⚠️  Dependencias faltantes en package.json:");
  missingInPackageJson.forEach((dep) => console.log(`  - ${dep}`));
}

if (missingInNextConfig.length > 0) {
  console.log("\n⚠️  Dependencias faltantes en next.config.ts:");
  missingInNextConfig.forEach((dep) => console.log(`  - ${dep}`));
}

if (missingInPackageJson.length === 0 && missingInNextConfig.length === 0) {
  console.log("\n✅ ¡Todas las dependencias están correctamente configuradas!");
} else {
  console.log(
    "\n💡 Recomendación: Agrega las dependencias faltantes para evitar problemas en Vercel.",
  );
}
