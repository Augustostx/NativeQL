#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { generateCommand } from "./commands/generate";
import { doctorCommand } from "./commands/doctor";
import { infoCommand } from "./commands/info";
import { diagramCommand } from "./commands/diagram";
import { schemaCommand } from "./commands/schema";
import { validateCommand } from "./commands/validate";

const program = new Command();

program
    .name("nativeql")
    .description("CLI for NativeQL ORM")
    .version("1.0.0");

program.addCommand(initCommand);
program.addCommand(generateCommand);
program.addCommand(doctorCommand);
program.addCommand(infoCommand);
program.addCommand(diagramCommand);
program.addCommand(schemaCommand);
program.addCommand(validateCommand);

program.parse(process.argv);
