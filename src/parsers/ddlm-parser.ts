import { Tag } from "@models";
import { lineNumberFromIndex, stringToLineLengths } from "@utils";


export function parseDDLmDictionary(content: string, filePath: string): Tag[] {
    let tags: Tag[] = []
    let lineLengths = stringToLineLengths(content);

    const saveframeRegex = /(?<=^|\s)save(_\S+)([\s\S]*?)save_(?=\s|$)/g;
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
