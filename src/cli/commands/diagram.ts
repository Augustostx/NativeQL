import { Command } from "commander";
import { parseEntities } from "../parser";
import { resolveProjectRoot } from "../utils";
import { showBanner, logInfo, logError } from "../ui";
import boxen from "boxen";
import chalk from "chalk";

export const diagramCommand = new Command("diagram")
    .description("Generate Mermaid.js class diagram")
    .action(() => {
        showBanner();
        const root = resolveProjectRoot();
        const entities = parseEntities(root);

        if (entities.length === 0) {
            logError("No entities found to diagram.");
            return;
        }

        let mermaid = "classDiagram\n";

        for (const entity of entities) {
            mermaid += `    class ${entity.className} {\n`;
            for (const col of entity.columns) {
                mermaid += `        +${col.name}\n`;
            }
            mermaid += "    }\n";

            for (const rel of entity.relations) {
                
                let arrow = "--";
                if (rel.type === "OneToMany") arrow = "\"1\" -- \"*\"";
                if (rel.type === "ManyToOne") arrow = "\"*\" -- \"1\"";

                mermaid += `    ${entity.className} ${arrow} ${rel.target}\n`;
            }
        }

        console.log(boxen(mermaid, {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "magenta",
            title: "Mermaid Diagram",
            titleAlignment: "center"
        }));

        logInfo("Copy the above code to https://mermaid.live");
    });
