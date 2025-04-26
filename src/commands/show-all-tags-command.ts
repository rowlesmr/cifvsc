import * as vscode from 'vscode';
import * as fs from 'fs';
import { Tags } from '@models';

/**
 * Command to show all tags and write them to a file.
 */
export function registerShowAllTagsCommand(tags: Tags): vscode.Disposable {
    return vscode.commands.registerCommand('cifTools.showAllTags', () => {
        vscode.window.showInformationMessage('Check console for all tags.');
        console.log('Tags written to file.');
        fs.writeFileSync('tag-output.txt', tags.toString());
    });
}
