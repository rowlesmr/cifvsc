import { Tag } from "../models";
import { lineNumberFromIndex, stringToLineLengths } from "../utils";

/**
 * Parses a single CIF DDL2 dictionary content into an array of Tags
 */
export function parseDDL2Dictionary(content: string, filePath: string): Tag[] {
    let tags: Tag[] = []
    let lineLengths = stringToLineLengths(content);

    const saveframeRegex = /(?<=^|\s)save_?(_\S+)([\s\S]*?)save_(?=\s|$)/g;
    let match: RegExpExecArray | null;

    while ((match = saveframeRegex.exec(content))) {
        const fullSaveframe = match[0];
        const saveframeName = match[1];
        const index = match.index;
        const lineNumber = lineNumberFromIndex(index, lineLengths);

        tags.push(new Tag(saveframeName, fullSaveframe, filePath, lineNumber))
    }

    return tags;
}
