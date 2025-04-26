import * as vscode from 'vscode';
import { Tags } from '@models';


export function provideHover(tags: Tags, document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.Hover | undefined {
    const range = document.getWordRangeAtPosition(position, /_[\w\d.-]+/);
    if (!range) return;

    const tagName = document.getText(range);
    const saveframes = tags.getTagDefinition(tagName);
    const locations = tags.getTagLocation(tagName);
    if (!saveframes || saveframes.length === 0) return;
    if (!locations || locations.length === 0) return;

    // Start building the hover content
    let hoverText = "";
    if (saveframes.length > 1) { //multiple saveframes
        saveframes.forEach((definition, index) => {
            const file = locations[index].uri.fsPath; // Access the second array using the same index
            hoverText += `${file}\n${definition}`;
            if (index < locations.length - 1) {
                hoverText += "\n\n---\n\n";
            }
        });
    } else { //single saveframe
        hoverText += saveframes[0];
    }

    return new vscode.Hover({
        language: 'cif',
        value: hoverText,
    });
}


export function createHoverProvider(allTags: Tags): vscode.HoverProvider {
    return {
        provideHover(document, position, token) {
            return provideHover(allTags, document, position, token);
        },
    };
}
