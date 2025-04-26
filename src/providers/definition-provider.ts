import * as vscode from 'vscode';
import { Tags } from '@models'


export function provideDefinition(tags: Tags, document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.Location[] | undefined {
    const range = document.getWordRangeAtPosition(position, /_[\w\d.-]+/);
    if (!range) return;

    const tagName = document.getText(range);
    const locations = tags.getTagLocation(tagName);
    return locations && locations.length > 0 ? locations : undefined;
}


export function createDefinitionProvider(tags: Tags): vscode.DefinitionProvider {
    return {
        provideDefinition(document, position, token) {
            return provideDefinition(tags, document, position, token);
        },
    };
}
