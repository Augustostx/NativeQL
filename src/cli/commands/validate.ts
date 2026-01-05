import { Command } from "commander";
import { parseEntities } from "../parser";
import { resolveProjectRoot } from "../utils";
import { showBanner, logError, logSuccess, logInfo } from "../ui";
import chalk from "chalk";

export const validateCommand = new Command("validate")
    .description("Validate entity definitions statically")
    .action(() => {
        showBanner();
        const root = resolveProjectRoot();
        const entities = parseEntities(root);

        if (entities.length === 0) {
            logError("No entities found to validate.");
            return;
        }

        let errorCount = 0;
        let warningCount = 0;

        console.log(chalk.bold("\n🔍 Validating Entities...\n"));

        for (const entity of entities) {
            const issues: string[] = [];

            // Check 1: Table Name
            if (!entity.tableName) {
                issues.push(chalk.red("✖ Missing Table Name (use @Entity('name'))"));
                errorCount++;
            }

            // Check 2: Primary Key
            const hasPrimaryKey = entity.columns.some(col => col.isPrimary);
            if (!hasPrimaryKey) {
                issues.push(chalk.red("✖ Missing Primary Key (use @PrimaryGeneratedColumn)"));
                errorCount++;
            }

            // Check 3: Columns exist
            if (entity.columns.length === 0) {
                issues.push(chalk.yellow("⚠ No columns defined"));
                warningCount++;
            }

            if (issues.length > 0) {
                console.log(chalk.bold.white(`${entity.className} (${entity.tableName})`));
                issues.forEach(issue => console.log(`  ${issue}`));
                console.log("");
            }
        }

        if (errorCount === 0 && warningCount === 0) {
            logSuccess("All entities look good! ✨");
        } else {
            console.log("-".repeat(30));
            if (errorCount > 0) logError(`Found ${errorCount} errors.`);
            if (warningCount > 0) logInfo(`Found ${warningCount} warnings.`);
        }
    });
