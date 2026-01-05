import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { showBanner, logError, logInfo, logSuccess } from "../ui";
import { resolveProjectRoot } from "../utils";

export const doctorCommand = new Command("doctor")
    .description("Check your NativeQL environment")
    .action(async () => {
        showBanner();
        console.log(chalk.bold("🩺 Doctor Check\n"));

        let allGood = true;

        const projectRoot = resolveProjectRoot();
        const relativeRoot = path.relative(process.cwd(), projectRoot);

        if (fs.existsSync(projectRoot)) {
            logSuccess(`Found project root at: ${chalk.cyan(relativeRoot || "./src")}`);
        } else {
            logInfo(`Project root not found (defaulting to ${relativeRoot}). Run 'init' to setup.`);
        }

        const entitiesPath = path.join(projectRoot, "entities");
        if (fs.existsSync(entitiesPath)) {
            logSuccess("Found 'entities' directory");
        } else {
            logInfo("No 'entities' directory found.");
        }

        const packageJsonPath = path.join(process.cwd(), "package.json");
        if (fs.existsSync(packageJsonPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
                const deps = { ...pkg.dependencies, ...pkg.devDependencies };

                if (deps["reflect-metadata"]) {
                    logSuccess("Found 'reflect-metadata'");
                } else {
                    logError("Missing 'reflect-metadata' dependency");
                    allGood = false;
                }

                if (deps["expo-sqlite"] || deps["react-native-sqlite-storage"]) {
                    logSuccess("Found SQLite driver");
                } else {
                    logInfo("No SQLite driver found (expo-sqlite or react-native-sqlite-storage recommended)");
                }

                if (deps["nativeql"]) {
                    logSuccess("NativeQL installed");
                }

            } catch (e) {
                logError("Could not parse package.json");
                allGood = false;
            }
        }

        console.log("\n" + "-".repeat(30) + "\n");
        if (allGood) {
            logSuccess("System Healthy! Ready to build.");
        } else {
            logError("Some issues were found. Please fix them above.");
        }
    });
