"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
let tagToSaveframes = new Map();
let tagToLocations = new Map();
let tagToFiles = new Map();
/**
 * Parses a single CIF dictionary content into a map of tag -> saveframe
 */
function parseDictionary(content) {
    //console.log('Parsing dictionary...');
    const map = new Map();
    // Normalize all line endings to \n to simplify regex
    content = content.replace(/\r\n?/g, '\n');
    const saveframeRegex = /save(_\S+)\n([\s\S]*?)(?=\nsave_\S+|\n#|\n\s*$)/g;
    let match;
    while ((match = saveframeRegex.exec(content))) {
        const saveframeName = match[1];
        const saveframeBody = match[2];
        const fullSaveframe = `save${saveframeName}\n${saveframeBody.trim()}`;
        map.set(saveframeName, fullSaveframe);
    }
    //console.log("Finished parsing dictionary.");
    return map;
}
/**
 * Loads multiple dictionary files, merges their tag -> saveframe mappings
 */
function loadDictionaries(paths, reloadPath = "") {
    //a hack to reload a dictionary upon the file changing
    if (reloadPath == "") { //then it's a normal reload everything
        console.log("Loading dictionaries...");
        tagToSaveframes.clear();
        tagToLocations.clear();
        tagToFiles.clear();
    }
    else {
        console.log(`Reloading dictionary: ${reloadPath}`);
        //delete all existing references to the reloadPath
        for (const [tag, filePaths] of tagToFiles) {
            let deleteIndex = -1;
            for (const [index, file] of filePaths.entries()) {
                if (file == reloadPath) {
                    deleteIndex = index;
                }
            }
            if (deleteIndex == -1) {
                continue;
            }
            //deleteIndex is a valid index to a thing to delete
            if (filePaths.length == 1) { //there is only one thing to delete
                tagToSaveframes.delete(tag);
                tagToLocations.delete(tag);
                tagToFiles.delete(tag);
            }
            else { //there is more than one entry in the value array, and so it must be preserved
                let tmpSave = tagToSaveframes.get(tag);
                if (tmpSave) {
                    tmpSave.splice(deleteIndex, 1);
                }
                let tmpLoc = tagToLocations.get(tag);
                if (tmpLoc) {
                    tmpLoc.splice(deleteIndex, 1);
                }
                let tmpFile = tagToFiles.get(tag);
                if (tmpFile) {
                    tmpFile.splice(deleteIndex, 1);
                }
            }
        }
        paths = [reloadPath]; //so I don't need to change the remaining code
    }
    let remaining = paths.length;
    paths.forEach(dictPath => {
        fs.readFile(dictPath, 'utf8', (err, data) => {
            if (err) {
                vscode.window.showErrorMessage(`Failed to load CIF dictionary: ${dictPath}\n${err.message}.`);
                return;
            }
            console.log(`Dictionary loaded, parsing file: ${dictPath}.`);
            // Normalize EOLs for consistency
            data = data.replace(/\r\n?/g, '\n');
            const parsedMap = parseDictionary(data);
            console.log(`Parsed dictionary, found ${parsedMap.size} tags.`);
            // Split data into lines to find line numbers of tags
            const lines = data.split('\n');
            for (const [tag, saveframe] of parsedMap) {
                // Find the line number of the saveframe definition
                const saveLine = lines.findIndex(line => line.startsWith(`save${tag}`));
                if (saveLine !== -1) {
                    const uri = vscode.Uri.file(dictPath);
                    const position = new vscode.Position(saveLine, 0); // Position at the start of the saveframe
                    const location = new vscode.Location(uri, position);
                    // Add to arrays instead of setting single values
                    if (!tagToSaveframes.has(tag)) {
                        tagToSaveframes.set(tag, []);
                    }
                    tagToSaveframes.get(tag).push(saveframe);
                    if (!tagToLocations.has(tag)) {
                        tagToLocations.set(tag, []);
                    }
                    tagToLocations.get(tag).push(location);
                    if (!tagToFiles.has(tag)) {
                        tagToFiles.set(tag, []);
                    }
                    tagToFiles.get(tag).push(dictPath);
                }
            }
            console.log(`Loaded CIF dictionary: ${path.basename(dictPath)}`);
            remaining--;
            if (remaining == 0) {
                checkMultipleDefinitions();
            }
        });
    });
}
function checkMultipleDefinitions() {
    //console.log("Checking for multiple definitions...");
    for (const [tag, defs] of tagToSaveframes) {
        if (defs.length > 1) {
            console.log(`Tag "${tag}" has ${defs.length} definitions.`);
        }
    }
    for (const [tag, locs] of tagToLocations) {
        if (locs.length > 1) {
            console.log(`Tag "${tag}" has ${locs.length} definition locations.`);
        }
    }
}
/**
 * Watch specific CIF dictionary files for changes, using paths from settings.
 */
function watchDictionaryFiles() {
    const config = vscode.workspace.getConfiguration('cifTools');
    const dictPaths = config.get('dictionaryPaths') || [];
    dictPaths.forEach(dictPath => {
        const uri = vscode.Uri.file(dictPath);
        //const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath);
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path.dirname(dictPath), path.basename(dictPath)));
        watcher.onDidChange(() => {
            console.log(`Dictionary file changed: ${dictPath}`);
            loadDictionaries([], dictPath); // Reload just this file
        });
        watcher.onDidCreate(() => {
            console.log(`Dictionary file created: ${dictPath}`);
            loadDictionaries([], dictPath);
        });
        watcher.onDidDelete(() => {
            console.log(`Dictionary file deleted: ${dictPath}`);
            // Optionally remove data related to this file if needed
            loadDictionaries([], dictPath);
        });
        console.log(`Watching file: ${dictPath}`);
    });
}
/**
 * Activates the extension
 */
function activate(context) {
    vscode.window.showInformationMessage('CIF Extension activated');
    const config = vscode.workspace.getConfiguration('cifTools');
    const dictPaths = config.get('dictionaryPaths') || [];
    if (dictPaths.length > 0) {
        loadDictionaries(dictPaths);
        watchDictionaryFiles();
    }
    else {
        vscode.window.showWarningMessage('No CIF dictionary paths configured. Tag definitions will not be available.');
    }
    //to allow hover text to work
    const hoverProvider = vscode.languages.registerHoverProvider('cif', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position, /_[\w\d.]+/);
            if (!range)
                return;
            const word = document.getText(range);
            const saveframes = tagToSaveframes.get(word);
            const files = tagToFiles.get(word);
            if (!saveframes || saveframes.length === 0)
                return;
            if (!files || files.length === 0)
                return;
            // Start building the hover content
            let hoverText = "";
            if (saveframes.length > 1) {
                saveframes.forEach((definition, index) => {
                    const file = files[index]; // Access the second array using the same index
                    hoverText += `${file}\n${definition}\n\n---\n\n`;
                });
            }
            else {
                hoverText += saveframes[0];
            }
            return new vscode.Hover({
                language: 'cif',
                value: hoverText
            });
        }
    });
    context.subscriptions.push(hoverProvider);
    //to allow jump-to-definition to work
    const definitionProvider = vscode.languages.registerDefinitionProvider('cif', {
        provideDefinition(document, position, token) {
            const range = document.getWordRangeAtPosition(position, /_[\w\d.]+/);
            if (!range)
                return;
            const word = document.getText(range);
            const locations = tagToLocations.get(word);
            return locations && locations.length > 0 ? locations : undefined;
        }
    });
    context.subscriptions.push(definitionProvider);
}
/**
 * Optional: clean up when extension deactivates
 */
function deactivate() {
    tagToSaveframes.clear();
    tagToLocations.clear();
    tagToFiles.clear();
}
//# sourceMappingURL=extension.js.map