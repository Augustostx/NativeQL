import { Command } from "commander";
import { parseEntities } from "../parser";
import { resolveProjectRoot } from "../utils";
import { showBanner, logError } from "../ui";
import boxen from "boxen";
import chalk from "chalk";

export const schemaCommand = new Command("schema:log")
    .description("Log the SQL schema based on entities")
    .action(() => {
        showBanner();
        const root = resolveProjectRoot();
        const entities = parseEntities(root);

        if (entities.length === 0) {
            logError("No entities found to generate schema.");
            return;
        }

        let sql = "";

        for (const entity of entities) {
            sql += `CREATE TABLE ${entity.tableName} (\n`;
            const lines: string[] = [];

            for (const col of entity.columns) {
                let line = `  ${col.name}`;
                if (col.isPrimary) {
                    line += " INTEGER PRIMARY KEY AUTOINCREMENT";
                } else {
                    line += " TEXT";
                }
                lines.push(line);
            }

            sql += lines.join(",\n");
            sql += "\n);\n\n";
        }

        console.log(boxen(chalk.green(sql), {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "green",
            title: "SQL Schema Preview",
            titleAlignment: "center"
        }));
    });
