import { Tag } from "../models";
import { parseDDL1Dictionary } from "./ddl1-parser";
import { parseDDL2Dictionary } from "./ddl2-parser";
import { parseDDLmDictionary } from "./ddlm-parser";
import { detectDDLFormat } from "./parser-chooser";


/**
 * Parses a single CIF dictionary content into a map of tag -> saveframe
 */
export function parseDictionary(content: string, filePath: string): Tag[] {
    const format = detectDDLFormat(content)

    console.log(`Detected DDL format: ${format}`);

    switch (format) {
        case "1":
            return parseDDL1Dictionary(content, filePath);
        case "2":
            return parseDDL2Dictionary(content, filePath)
        case "m":
            return parseDDLmDictionary(content, filePath);
        default:
            console.log("Unknown format.");
            return [];
    }
}

// Barrel export for individual parsers
export { parseDDL1Dictionary } from "./ddl1-parser";
export { parseDDL2Dictionary } from "./ddl2-parser";
export { parseDDLmDictionary } from "./ddlm-parser";
