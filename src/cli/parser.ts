import * as fs from "fs";
import * as path from "path";
import { globSync } from "glob";
import { resolveProjectRoot } from "./utils";

export interface ParsedColumn {
    name: string;
    type: string;
    isPrimary: boolean;
}

export interface ParsedRelation {
    type: "OneToOne" | "OneToMany" | "ManyToOne" | "ManyToMany";
    target: string;
    inverseSide?: string;
}

export interface ParsedEntity {
    className: string;
    tableName: string;
    columns: ParsedColumn[];
    relations: ParsedRelation[];
}

export const parseEntities = (projectRoot: string): ParsedEntity[] => {
    const results: ParsedEntity[] = [];
    const entitiesDir = path.join(projectRoot, "entities");

    if (!fs.existsSync(entitiesDir)) {
        return [];
    }

    const files = globSync("**/*.ts", { cwd: entitiesDir, absolute: true });

    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");

        // 1. Extract Class Name
        const classMatch = content.match(/export class (\w+)/);
        if (!classMatch) continue;
        const className = classMatch[1];

        // 2. Extract Table Name
        const tableMatch = content.match(/@Entity\("(\w+)"\)/);
        const tableName = tableMatch ? tableMatch[1] : className.toLowerCase();

        // 3. Extract Columns
        const columns: ParsedColumn[] = [];

        const columnRegex = /@Column\((.*?)\)\s+(?:(public|private|protected|readonly|declare)\s+)*(\w+)(\?|!)?\s*:/g;
        let colMatch;
        while ((colMatch = columnRegex.exec(content)) !== null) {
            columns.push({
                name: colMatch[3],
                type: "unknown",
                isPrimary: false
            });
        }

        const primaryRegex = /@PrimaryGeneratedColumn\((.*?)\)\s+(?:(public|private|protected|readonly|declare)\s+)*(\w+)(\?|!)?\s*:/g;
        let primMatch;
        while ((primMatch = primaryRegex.exec(content)) !== null) {
            columns.push({
                name: primMatch[3],
                type: "integer",
                isPrimary: true
            });
        }

        // 4. Extract Relations
        const relations: ParsedRelation[] = [];
        const relationTypes = ["OneToOne", "OneToMany", "ManyToOne", "ManyToMany"];

        for (const relType of relationTypes) {
            const regex = new RegExp(`@${relType}\\(.*?=>\\s*(\\w+)`, "g");
            let relMatch;
            while ((relMatch = regex.exec(content)) !== null) {
                relations.push({
                    type: relType as any,
                    target: relMatch[1]
                });
            }
        }

        results.push({
            className,
            tableName,
            columns,
            relations
        });
    }

    return results;
};
