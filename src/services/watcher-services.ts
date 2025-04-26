import * as vscode from 'vscode';
import * as path from 'path';

import { loadDictionaries } from './dictionary-services';
import { Tags } from '@models';

/**
 * Watch specific CIF dictionary files for changes, using paths from settings.
 */
export function watchDictionaryFiles(tags: Tags, dictPaths: string[]) {
    dictPaths.forEach(dictPath => {
        const uri = vscode.Uri.file(dictPath);
        //const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath);
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(path.dirname(dictPath), path.basename(dictPath))
        );
        watcher.onDidChange(() => {
            //console.log(`Dictionary file changed: ${dictPath}`);
            loadDictionaries(tags, [], dictPath); // Reload just this file
        });

        watcher.onDidCreate(() => {
            //console.log(`Dictionary file created: ${dictPath}`);
            loadDictionaries(tags, [], dictPath);
        });

        watcher.onDidDelete(() => {
            //console.log(`Dictionary file deleted: ${dictPath}`);
            // Optionally remove data related to this file if needed
            loadDictionaries(tags, [], dictPath);
        });

        //console.log(`Watching file: ${dictPath}`);
    });
}
