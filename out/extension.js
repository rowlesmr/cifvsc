"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const https = require("https");
let alreadyActivated = false;
class Tag {
    constructor(tagName, definition = "", filePath = "", lineNumber = 0) {
        this.m_name = tagName;
        this.m_definition = [definition]; // Store definition in an array
        this.m_location = [new vscode.Location(vscode.Uri.parse(filePath), new vscode.Position(lineNumber, 0))];
    }
    // Combine two tags with the same name
    combine(otherTag) {
        if (this.m_name === otherTag.m_name) {
            const combinedTag = new Tag(this.m_name); // Start with the first tag's name
            combinedTag.m_definition = [...this.m_definition, ...otherTag.m_definition];
            combinedTag.m_location = [...this.m_location, ...otherTag.m_location];
            return combinedTag;
        }
        throw new Error('Cannot combine tags with different names');
    }
    // Method to check equality based on name only
    equals(otherTag) {
        return this.m_name === otherTag.m_name; // Tags are equal if their names match
    }
    toString() {
        return `Tag[name: ${this.m_name}, Definitions: ${this.m_definition.length}, Locations: ${this.m_location.length}]`;
    }
    // Comparison method for sorting
    compareTo(otherTag) {
        return this.m_name.localeCompare(otherTag.m_name);
    }
    // Make the class iterable so you can use array destructuring. is can use a loop like: for (const [name, definitions, locations] of tags)
    *[Symbol.iterator]() {
        yield this.m_name;
        yield this.m_definition;
        yield this.m_location;
    }
    // Method to check if the tag is in the specified file path
    isInFilePath(filepath) {
        const uriToCheck = vscode.Uri.file(filepath); // Convert filepath string to vscode.Uri
        // Iterate through each location's URI and check if it matches
        for (let loc of this.m_location) {
            if (loc.uri.fsPath === uriToCheck.fsPath) { // Compare file system path
                return true;
            }
        }
        return false;
    }
    // Method to get the file paths as an array of strings
    getFilePaths() {
        return this.m_location.map(loc => loc.uri.fsPath); // Map each location to its fsPath and return as an array
    }
    addDefinition(newDefinition, newLocation) {
        this.m_definition.push(newDefinition);
        this.m_location.push(newLocation);
    }
}
class Tags {
    constructor(tags = []) {
        this.m_tags = new Map(tags.map(tag => [tag.m_name, tag])); // Map of tag names to tag objects
    }
    addTag(tag) {
        if (this.m_tags.has(tag.m_name)) {
            const existingTag = this.m_tags.get(tag.m_name);
            const combined = existingTag.combine(tag);
            this.m_tags.set(tag.m_name, combined);
        }
        else {
            this.m_tags.set(tag.m_name, tag);
        }
    }
    addTags(tags) {
        for (const tag of tags) {
            this.addTag(tag); // Leverages your existing logic
        }
    }
    getTags() {
        return Array.from(this.m_tags.values());
    }
    getTagNames() {
        return Array.from(this.m_tags.keys());
    }
    getTagDefinition(tag) {
        var _a;
        return (_a = this.m_tags.get(tag)) === null || _a === void 0 ? void 0 : _a.m_definition;
    }
    getTagLocation(tag) {
        var _a;
        return (_a = this.m_tags.get(tag)) === null || _a === void 0 ? void 0 : _a.m_location;
    }
    removeTagsFromFilePath(filePath) {
        const uriToRemove = vscode.Uri.file(filePath);
        // First pass: Iterate through the Map entries (key-value pairs)
        for (const [key, tag] of this.m_tags) {
            // Iterate over the locations in reverse order
            for (let i = tag.m_location.length - 1; i >= 0; i--) {
                if (tag.m_location[i].uri.fsPath === uriToRemove.fsPath) {
                    tag.m_location.splice(i, 1);
                    tag.m_definition.splice(i, 1);
                }
            }
            // If the tag has no definitions or locations left, remove it from the Map
            if (tag.m_definition.length === 0) {
                this.m_tags.delete(key);
            }
        }
    }
    //Maps iterate in insertion order, so redoing the map puts everything in order
    sort() {
        this.m_tags = new Map(Array.from(this.m_tags.entries()).sort(([nameA, tagA], [nameB, tagB]) => tagA.compareTo(tagB)));
    }
    toString() {
        return Array.from(this.m_tags.values()).map(tag => tag.toString()).join('\n');
    }
    // ✅ Iterable implementation
    [Symbol.iterator]() {
        return this.m_tags.values()[Symbol.iterator]();
    }
    clear() {
        this.m_tags.clear();
    }
}
let allTags = new Tags;
/**
 * Parses a single CIF DDL1 dictionary content into an array of Tags
 */
function parseDDL1Dictionary(content, filePath) {
    let tags = [];
    let lineLengths = stringToLineLengths(content);
    const blockRegex = /(?<=^|\s)(data_([a-zA-Z0-9_.]+)\s[\s\S]*?)(?=\sdata_[a-zA-Z0-9_.]+|$)/g;
    let match;
    while ((match = blockRegex.exec(content))) {
        const blockBody = match[1];
        const index = match.index;
        const lineNumber = lineNumberFromIndex(index, lineLengths);
        // Check for looped _name values
        const loopNameMatch = blockBody.match(/(?<=^|\s)loop_\s+(_name)\s+([\sa-zA-Z0-9_'"]*?)(?=\s+_[a-zA-Z0-9.])/);
        if (loopNameMatch && loopNameMatch[1] == ('_name')) {
            // We're in a loop_ with _name lines
            let nameLines = loopNameMatch[2].replace(/\s+/g, '\n').replace(/['"]/g, '').split('\n');
            nameLines.forEach(tag => {
                tags.push(new Tag(tag, blockBody, filePath, lineNumber));
            });
        }
        else {
            // Try to find a single _name outside of loop_
            const singleNameMatch = blockBody.match(/(?<=^|\s)_name\s+([\sa-zA-Z0-9_'"]*?)(?=\s+_[a-zA-Z0-9.])/);
            if (singleNameMatch) {
                tags.push(new Tag(singleNameMatch[1].replace(/['"]/g, ''), blockBody, filePath, lineNumber));
            }
        }
    }
    return tags;
}
function parseDDL2Dictionary(content, filePath) {
    let tags = [];
    let lineLengths = stringToLineLengths(content);
    const saveframeRegex = /(?<=^|\s)save(_\S+)([\s\S]*?)save_(?=\s|$)/g;
    let match;
    while ((match = saveframeRegex.exec(content))) {
        const fullSaveframe = match[0];
        const saveframeName = match[1];
        const index = match.index;
        const lineNumber = lineNumberFromIndex(index, lineLengths);
        tags.push(new Tag(saveframeName, fullSaveframe, filePath, lineNumber));
    }
    return tags;
}
function stringToLineLengths(content) {
    const lines = content.split('\n');
    const cumulative = [];
    let total = 0;
    lines.forEach(line => {
        total += line.length + 1; // +1 for '\n'
        cumulative.push(total);
    });
    return cumulative;
}
function lineNumberFromIndex(index, lineLengths) {
    let left = 0;
    let right = lineLengths.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (lineLengths[mid] > index) {
            // If the middle element is greater, check if it's the first one or if there's an earlier match
            if (mid === 0 || lineLengths[mid - 1] <= index) {
                return mid;
            }
            // Otherwise, continue searching in the left half
            right = mid - 1;
        }
        else {
            // If the middle element is not greater, search the right half
            left = mid + 1;
        }
    }
    return -1; // No element greater than the comparison found}
}
/**
 * Parses a single CIF dictionary content into a map of tag -> saveframe
 */
function parseDictionary(content, filePath) {
    const isDDL2 = content.trimStart().startsWith('#\\#CIF_2.0');
    return isDDL2 ? parseDDL2Dictionary(content, filePath) : parseDDL1Dictionary(content, filePath);
}
/**
 * Loads multiple dictionary files, merges their tag -> saveframe mappings
 */
function loadDictionaries(paths, reloadPath = "") {
    //a hack to reload a dictionary upon the file changing
    if (reloadPath == "") { //then it's a normal reload everything
        console.log("Loading dictionaries...");
        allTags.clear();
    }
    else {
        console.log(`Reloading dictionary: ${reloadPath}`);
        allTags.removeTagsFromFilePath(reloadPath);
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
            // Normalize all line endings to \n to simplify regex
            data = data.replace(/\r\n?/g, '\n');
            let newTags = parseDictionary(data, dictPath);
            console.log(`Parsed dictionary, found ${newTags.length} tags.`);
            allTags.addTags(newTags);
            console.log(`Loaded CIF dictionary: ${path.basename(dictPath)}`);
            remaining--;
            if (remaining == 0) {
                allTags.sort();
            }
        });
    });
    console.log(`Loaded all dictionaries.`);
}
function consolidateDuplicates(alltags) {
    alltags.sort((tag1, tag2) => tag1.compareTo(tag2));
    // Array to hold the consolidated tags
    const consolidatedTags = [];
    // Iterate through the sorted tags and combine duplicates
    for (let i = 0; i < alltags.length; i++) {
        const currentTag = alltags[i];
        // If the last tag in the consolidatedTags array has the same name, combine them
        if (consolidatedTags.length > 0 && consolidatedTags[consolidatedTags.length - 1].equals(currentTag)) {
            consolidatedTags[consolidatedTags.length - 1] = consolidatedTags[consolidatedTags.length - 1].combine(currentTag);
        }
        else {
            // If no match, just add the tag to the array
            consolidatedTags.push(currentTag);
        }
    }
    return consolidatedTags;
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
 * Provides auto-suggestions for CIF tags
 */
function provideCifCompletionItems(document, position, token) {
    // Get the current word at the cursor
    const currentWord = document.getText(document.getWordRangeAtPosition(position));
    // Create an array to store completion items
    let completionItems = [];
    // Loop over the prebuilt list of tags instead of the map
    allTags.getTagNames().forEach(tag => {
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
function downloadAndSaveDictionaries(context) {
    // URLs of the raw files on GitHub
    const urls = [
        'https://github.com/COMCIFS/cif_core/raw/refs/heads/master/cif_core.dic',
        'https://github.com/COMCIFS/cif_core/raw/refs/heads/master/ddl.dic',
        'https://github.com/COMCIFS/cif_core/raw/refs/heads/master/templ_attr.cif',
        'https://github.com/COMCIFS/cif_core/raw/refs/heads/master/templ_enum.cif',
        'https://github.com/COMCIFS/Powder_Dictionary/raw/refs/heads/master/cif_pow.dic',
        'https://github.com/COMCIFS/MultiBlock_Dictionary/raw/refs/heads/main/multi_block_core.dic'
    ];
    const downloadDir = path.join(context.extensionPath, 'dictionaries'); // Save in a folder under extension's path
    // Create the directory if it doesn't exist
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
    }
    // Download all files and save them locally
    Promise.all(urls.map((url, index) => downloadFile(url, downloadDir, `file${index + 1}.cif`)))
        .then(() => {
        vscode.window.showInformationMessage(`Default dictionaries downloaded successfully to ${downloadDir}.`);
        const newDictPaths = urls.map(url => path.join(downloadDir, `file${urls.indexOf(url) + 1}.cif`));
        vscode.workspace.getConfiguration('cifTools').update('dictionaryPaths', newDictPaths, vscode.ConfigurationTarget.Global);
    })
        .catch(err => {
        vscode.window.showErrorMessage('Error downloading dictionaries: ' + err);
    });
}
function downloadFile(url, directory, filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(directory, filename);
        // Make a GET request to the URL
        https.get(url, (response) => {
            // Handle non-2xx HTTP status codes
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download file: HTTP ${response.statusCode}`));
            }
            // Create a writable stream to save the file
            const fileStream = fs.createWriteStream(filePath);
            // Pipe the response data to the file
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded and saved ${filename} to ${filePath}`);
                resolve();
            });
            fileStream.on('error', (err) => {
                fs.unlink(filePath, () => { }); // Delete the file if error occurs during writing
                reject(new Error(`Error writing file: ${err.message}`));
            });
        })
            .on('error', (err) => {
            reject(new Error(`Error downloading file: ${err.message}`));
        });
    });
}
/**
 * Activates the extension
 */
function activate(context) {
    if (alreadyActivated) {
        return;
    }
    alreadyActivated = true;
    vscode.window.showInformationMessage('CIF Extension activated. DEV');
    const config = vscode.workspace.getConfiguration('cifTools');
    const dictPaths = config.get('dictionaryPaths') || [];
    if (dictPaths.length > 0) {
        loadDictionaries(dictPaths);
        watchDictionaryFiles();
    }
    else {
        //vscode.window.showWarningMessage('No CIF dictionary paths configured. Tag definitions will not be available.');
        vscode.window.showWarningMessage('No CIF dictionaries configured. Would you like to add them from a single directory now? If you have many directories, edit your settings.json manually; see the readme.md.', 'Select Files', 'Open Settings', 'Download default files').then(selection => {
            if (selection === 'Select Files') {
                vscode.window.showOpenDialog({
                    canSelectMany: true,
                    openLabel: 'Select CIF Dictionary Files',
                    filters: {
                        'CIF Files': ['dic', 'cif'],
                        'All Files': ['*']
                    }
                }).then(files => {
                    if (files && files.length > 0) {
                        const paths = files.map(f => f.fsPath);
                        vscode.workspace.getConfiguration().update('cifTools.dictionaryPaths', paths, vscode.ConfigurationTarget.Global).then(() => {
                            vscode.window.showInformationMessage(`CIF dictionary paths saved.`);
                            loadDictionaries(paths);
                            watchDictionaryFiles();
                        });
                    }
                });
            }
            else if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettingsJson');
            }
            else if (selection === 'Download default files') {
                downloadAndSaveDictionaries(context);
            }
        });
    }
    //to allow hover text to work
    const hoverProvider = vscode.languages.registerHoverProvider('cif', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position, /_[\w\d.]+/);
            if (!range)
                return;
            const tagName = document.getText(range);
            const saveframes = allTags.getTagDefinition(tagName);
            const locations = allTags.getTagLocation(tagName);
            if (!saveframes || saveframes.length === 0)
                return;
            if (!locations || locations.length === 0)
                return;
            // Start building the hover content
            let hoverText = "";
            if (saveframes.length > 1) {
                saveframes.forEach((definition, index) => {
                    const file = locations[index].uri.fsPath; // Access the second array using the same index
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
            const tagName = document.getText(range);
            const locations = allTags.getTagLocation(tagName);
            return locations && locations.length > 0 ? locations : undefined;
        }
    });
    context.subscriptions.push(definitionProvider);
    //-------------
    // Register the completion item provider for the CIF language
    //-------------
    const completionProvider = vscode.languages.registerCompletionItemProvider('cif', {
        provideCompletionItems: provideCifCompletionItems
    }, '_'); // Trigger on '_' character, adjust this as needed
    // Add to subscriptions to handle cleanup on deactivation
    context.subscriptions.push(completionProvider);
    console.log("End of activation.");
}
/**
 * Optional: clean up when extension deactivates
 */
function deactivate() {
    allTags.clear();
}
//# sourceMappingURL=extension.js.map