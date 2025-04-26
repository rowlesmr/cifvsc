import * as vscode from 'vscode';
import { Tags } from '@models';


export function provideCompletionItems(tags: Tags, document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.CompletionItem[] {
    // Get the current word at the cursor
    const currentWord = document.getText(document.getWordRangeAtPosition(position));

    // Create an array to store completion items
    let completionItems: vscode.CompletionItem[] = [];

    // Loop over the prebuilt list of tags instead of the map
    tags.getTagNames().forEach((tag) => {
        // If the current word is empty or matches the start of a tag, suggest that tag
        if (!currentWord || tag.startsWith(currentWord)) {
            const completionItem = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Keyword);
            completionItem.documentation = new vscode.MarkdownString(`This is the ${tag} tag.`);
            completionItem.insertText = tag; // What gets inserted when the user selects the suggestion
            completionItems.push(completionItem);
        }
    });

    return completionItems;
}


export function createCompletionProvider(tags: Tags): vscode.CompletionItemProvider {
    return {
        provideCompletionItems(document, position, token) {
            return provideCompletionItems(tags, document, position, token);
        },
    };
}
