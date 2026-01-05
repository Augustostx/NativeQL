import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { select } from "@inquirer/prompts";
import {
    tsDataSourceExpoTemplate,
    tsDataSourceRNCliTemplate,
    tsEntityTemplate,
} from "../scaffold";
import { ensureDirectory } from "../utils";
import { showBanner, withSpinner, logSuccess, logInfo } from "../ui";

export const initCommand = new Command("init")
    .description("Initialize a new NativeQL project (TypeScript)")
    .action(async () => {
        showBanner();

        const driver = await select({
            message: "Which SQLite driver are you using?",
            choices: [
                { name: "Expo SQLite (expo-sqlite)", value: "expo" },
                { name: "React Native SQLite Storage (react-native-sqlite-storage)", value: "rn" },
            ],
        });

        const srcDir = path.join(process.cwd(), "src");
        const entitiesDir = path.join(srcDir, "entities");
        const migrationsDir = path.join(srcDir, "migrations");
        const subscribersDir = path.join(srcDir, "subscribers");

        await withSpinner("Scaffolding directory structure...", async () => {
            ensureDirectory(srcDir);
            ensureDirectory(entitiesDir);
            ensureDirectory(migrationsDir);
            ensureDirectory(subscribersDir);
        });

        // Create Example Entity
        const userEntityPath = path.join(entitiesDir, "User.ts");
        if (!fs.existsSync(userEntityPath)) {
            await withSpinner("Generating example User entity...", async () => {
                fs.writeFileSync(userEntityPath, tsEntityTemplate);
            });
            logSuccess("Created: src/entities/User.ts");
        } else {
            logInfo("Skipped: src/entities/User.ts (exists)");
        }

        // Create DataSource
        const dbPath = path.join(srcDir, "database.ts");
        if (!fs.existsSync(dbPath)) {
            await withSpinner("Configuring DataSource...", async () => {
                const template = driver === "expo" ? tsDataSourceExpoTemplate : tsDataSourceRNCliTemplate;
                fs.writeFileSync(dbPath, template);
            });
            logSuccess("Created: src/database.ts");
        } else {
            logInfo("Skipped: src/database.ts (exists)");
        }

        console.log("");
        logSuccess("NativeQL setup complete! ready to build.");
    });
