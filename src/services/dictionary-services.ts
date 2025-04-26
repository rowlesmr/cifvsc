import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { parseDictionary } from '@parsers';
import { Tags } from '@models';

/**
 * Loads multiple dictionary files, merges their tag -> saveframe mappings
 */
export async function loadDictionaries(tags: Tags, paths: string[], reloadPath: string = ""): Promise<void> {
    if (reloadPath == "") { //then it's a normal reload everything
        console.log("Loading dictionaries...");
        tags.clear();
    } else {
        console.log(`Reloading dictionary: ${reloadPath}`);
        tags.removeTagsFromFilePath(reloadPath);
        paths = [reloadPath] //so I don't need to change the remaining code
    }

    let dictPatherr: String = "";

    try {
        const promises = paths.map(async (dictPath) => {
            console.log(`Reading file: ${dictPath}`);
            dictPatherr = dictPath;
            let data = await fs.promises.readFile(dictPath, 'utf8');

            // Normalize all line endings to \n to simplify regex
            data = data.replace(/\r\n?/g, '\n');

            console.log(`Parsing file: ${dictPath}`);
            const newTags = parseDictionary(data, dictPath);
            console.log(`Parsed dictionary, found ${newTags.length} tags.`);

            tags.addTags(newTags);
        });

        await Promise.all(promises); // Wait for all files to be processed
    } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to load CIF dictionary (${dictPatherr}): ${err.message}`);
    }

    tags.sort();
    console.log(`Loaded all dictionaries.`);
}


/**
 * Returns an array of full paths to CIF dictionary files.
 * - If the user has specified "cifTools.dictionaryPaths" in settings, those are returned.
 * - Otherwise, it returns all `.dic` and `.cif` files from the bundled "dictionaries" folder.
 */
export function getDictionaryPaths(context: vscode.ExtensionContext): string[] {
    const config = vscode.workspace.getConfiguration('cifTools');
    const userPaths: string[] = config.get('dictionaryPaths', []);

    if (userPaths && userPaths.length > 0) {
        return userPaths;
    }

    const bundledDir = path.join(context.extensionPath, 'dictionaries');
    try {
        const files = fs.readdirSync(bundledDir);
        const dictionaryFiles = files
            .filter(file => file.endsWith('.dic') || file.endsWith('.cif'))
            .map(file => path.join(bundledDir, file));
        return dictionaryFiles;
    } catch (err) {
        const message = (err instanceof Error) ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to read bundled dictionaries: ${message}`);
        return [];
    }
}


// Call this to get dictionary paths
export function loadConfiguredOrDefaultDictionaries(context: vscode.ExtensionContext): string[] {
    const config = vscode.workspace.getConfiguration('cifTools');
    const userPaths: string[] = config.get('dictionaryPaths', []);

    let dictionaryPaths: string[];

    if (!userPaths || userPaths.length === 0) {
        // Load from the extension's bundled "dictionaries" directory
        const dictionariesDir = path.join(context.extensionPath, 'dictionaries');
        dictionaryPaths = fs.readdirSync(dictionariesDir)
            .filter(file => file.endsWith('.dic') || file.endsWith('.cif'))
            .map(file => path.join(dictionariesDir, file));

        vscode.window.showInformationMessage('Loaded default CIF dictionaries from extension bundle.');
    } else {
        dictionaryPaths = userPaths;
        vscode.window.showInformationMessage('Loaded user-specified CIF dictionaries.');
    }

    // Now load the dictionaries using your existing logic
    return dictionaryPaths
}
