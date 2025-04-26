import { Tag } from "@models";
import { lineNumberFromIndex, stringToLineLengths } from "@utils";


/**
 * Parses a single CIF DDL1 dictionary content into an array of Tags
 */
export function parseDDL1Dictionary(content: string, filePath: string): Tag[] {
    let tags: Tag[] = []
    let lineLengths = stringToLineLengths(content);

    const blockRegex = /(?<=^|\s)(data_([a-zA-Z0-9_.-]+)\s[\s\S]*?)(?=\sdata_[a-zA-Z0-9_.-]+|$)/g;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(content))) {
        const blockBody = match[1];
        const index = match.index;
        const lineNumber = lineNumberFromIndex(index, lineLengths);

        // Check for looped _name values
        const loopNameMatch = blockBody.match(/(?<=^|\s)loop_\s+(_name)\s+([\sa-zA-Z0-9_'"-]*?)(?=\s+_[a-zA-Z0-9.-])/);
        if (loopNameMatch && loopNameMatch[1] == ('_name')) {
            // We're in a loop_ with _name lines
            let nameLines = loopNameMatch[2].replace(/\s+/g, '\n').replace(/['"]/g, '').split('\n');

            nameLines.forEach(tag => {
                tags.push(new Tag(tag, blockBody, filePath, lineNumber));
            });
        } else {
            // Try to find a single _name outside of loop_
            const singleNameMatch = blockBody.match(/(?<=^|\s)_name\s+([\sa-zA-Z0-9_'"-]*?)(?=\s+_[a-zA-Z0-9.-])/);
            if (singleNameMatch) {
                tags.push(new Tag(singleNameMatch[1].replace(/['"]/g, ''), blockBody, filePath, lineNumber));
            }
        }
    }

    return tags;
}
