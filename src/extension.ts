import * as vscode from 'vscode';

import { Tags } from '@models';
import { loadDictionaries, watchDictionaryFiles, loadConfiguredOrDefaultDictionaries } from '@services';
import { registerProviders } from '@providers';
import { registerCommands } from '@commands';

let alreadyActivated = false;
let allTags = new Tags;


/**
 * Activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
    if (alreadyActivated) {
        return;
    }
    alreadyActivated = true;

    vscode.window.showInformationMessage('CIF Extension activated.');

    const dictPaths = loadConfiguredOrDefaultDictionaries(context);

    loadDictionaries(allTags, dictPaths);
    watchDictionaryFiles(allTags, dictPaths);

    registerProviders(context, allTags);
    registerCommands(context, allTags);

    console.log("End of activation.");
}


export function deactivate() {
    allTags.clear();
}
