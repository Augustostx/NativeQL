import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { ensureDirectory, resolveProjectRoot } from "../utils";
import {
    tsEntityTemplate,
    tsMigrationTemplate,
    tsSubscriberTemplate,
    tsRepositoryTemplate,
    tsSeederTemplate
} from "../scaffold";
import { logError, logSuccess, withSpinner } from "../ui";

export const generateCommand = new Command("generate")
    .alias("g")
    .description("Generate a new NativeQL artifact")
    .argument("<type>", "Type: entity, migration, subscriber, repository, seeder")
    .argument("<name>", "Name of the artifact")
    .action(async (type: string, name: string) => {
        const artifactType = type.toLowerCase();

        // Map aliases
        const typeAliases: Record<string, string> = {
            "repo": "repository",
            "seeds": "seeder",
            "seed": "seeder",
            "migration": "migration",
            "entity": "entity",
            "subscriber": "subscriber",
            "repository": "repository",
            "seeder": "seeder"
        };

        const resolvedType = typeAliases[artifactType];
        const supportedTypes = ["entity", "migration", "subscriber", "repository", "seeder"];

        if (!resolvedType || !supportedTypes.includes(resolvedType)) {
            logError(`Error: Supported types are: ${supportedTypes.join(", ")}`);
            process.exit(1);
        }

        const projectRoot = resolveProjectRoot();

        // Helper for generating files
        const generateFile = async (
            subDir: string,
            fileName: string,
            content: string,
            msg: string
        ) => {
            const targetDir = path.join(projectRoot, subDir);
            ensureDirectory(targetDir);
            const filePath = path.join(targetDir, fileName);

            if (fs.existsSync(filePath)) {
                logError(`Error: File already exists at ${filePath}`);
                process.exit(1);
            }

            await withSpinner(msg, async () => {
                fs.writeFileSync(filePath, content);
            });

            // Make path relative for nicer logging
            const relativePath = path.relative(process.cwd(), filePath);
            logSuccess(`Generated: ${relativePath}`);
        };

        // Handle Entity Generation
        if (resolvedType === "entity") {
            const entityName = name.charAt(0).toUpperCase() + name.slice(1);
            let content = tsEntityTemplate;
            content = content.replace(/class User/g, `class ${entityName}`);
            content = content.replace(/@Entity\("users"\)/g, `@Entity("${entityName.toLowerCase()}")`);

            await generateFile(
                "entities",
                `${entityName}.ts`,
                content,
                `Generating Entity ${entityName}...`
            );
        }

        // Handle Migration Generation
        if (resolvedType === "migration") {
            const timestamp = new Date().getTime();
            const migrationName = `${timestamp}-${name}`;

            let content = tsMigrationTemplate.replace(/\${NAME}/g, `${name}${timestamp}`);

            await generateFile(
                "migrations",
                `${migrationName}.ts`,
                content,
                `Creating Migration ${name}...`
            );
        }

        // Handle Subscriber Generation
        if (resolvedType === "subscriber") {
            const subscriberName = name.charAt(0).toUpperCase() + name.slice(1);
            let content = tsSubscriberTemplate.replace(/\${NAME}/g, subscriberName);

            await generateFile(
                "subscribers",
                `${subscriberName}.ts`,
                content,
                `Creating Subscriber ${subscriberName}...`
            );
        }

        // Handle Repository Generation
        if (resolvedType === "repository") {
            const repoName = name.charAt(0).toUpperCase() + name.slice(1);
            let content = tsRepositoryTemplate.replace(/\${NAME}/g, repoName);

            await generateFile(
                "repositories",
                `${repoName}.ts`,
                content,
                `Creating Repository ${repoName}...`
            );
        }

        // Handle Seeder Generation
        if (resolvedType === "seeder") {
            const seederName = name.charAt(0).toUpperCase() + name.slice(1);
            let content = tsSeederTemplate.replace(/\${NAME}/g, seederName);

            await generateFile(
                "seeders",
                `${seederName}.ts`,
                content,
                `Creating Seeder ${seederName}...`
            );
        }
    });
