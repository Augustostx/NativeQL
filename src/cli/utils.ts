import * as fs from "fs";
import * as path from "path";
import { globSync } from "glob";

export const ensureDirectory = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

export const resolveProjectRoot = (): string => {
    const cwd = process.cwd();

    const matches = globSync("**/entities", {
        cwd,
        ignore: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.git/**",
            "**/build/**",
            "**/ios/**",
            "**/android/**",
            "**/.expo/**",
            "**/coverage/**"
        ],
        absolute: true
    });

    if (matches.length > 0) {
        matches.sort((a, b) => a.length - b.length);
        return path.dirname(matches[0]);
    }

    return path.join(cwd, "src");
};
