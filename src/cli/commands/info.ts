import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import boxen from "boxen";
import { showBanner, logError } from "../ui";
import { resolveProjectRoot } from "../utils";

export const infoCommand = new Command("info")
    .description("Show project details and statistics")
    .action(async () => {
        showBanner();

        const projectRoot = resolveProjectRoot();
        const relativeRoot = path.relative(process.cwd(), projectRoot);

        if (!fs.existsSync(projectRoot)) {
            logError(`No project structure found (looked for 'entities' or default 'src').`);
            return;
        }

        const countFiles = (subdir: string) => {
            const dir = path.join(projectRoot, subdir);
            if (!fs.existsSync(dir)) return 0;
            return fs.readdirSync(dir).filter(f => f.endsWith(".ts")).length;
        };

        const entityCount = countFiles("entities");
        const migrationCount = countFiles("migrations");
        const subscriberCount = countFiles("subscribers");
        const repositoryCount = countFiles("repositories");
        const seederCount = countFiles("seeders");

        const stats = [
            chalk.white.bold(`Project Root: ${chalk.underline(relativeRoot || ".")}`),
            "",
            `Entities:      ${chalk.cyan(entityCount)}`,
            `Migrations:    ${chalk.yellow(migrationCount)}`,
            `Subscribers:   ${chalk.magenta(subscriberCount)}`,
            `Repositories:  ${chalk.green(repositoryCount)}`,
            `Seeders:       ${chalk.blue(seederCount)}`
        ].join("\n");

        console.log(boxen(stats, {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "white",
            title: "Dashbord",
            titleAlignment: "center"
        }));
    });
