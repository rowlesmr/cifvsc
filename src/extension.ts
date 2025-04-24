import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

let alreadyActivated = false;


function canonicalLowerCase(str: string): string {
  return str.normalize('NFD').toLocaleLowerCase().normalize('NFD');
}


class Tag {
  private m_name: string;
  private m_definition: string[];
  private m_location: vscode.Location[];

  constructor(tagName: string, definition: string, filePath: string, lineNumber: number)
  {
    this.m_name = canonicalLowerCase(tagName);
    this.m_definition = [definition];  // Store definition in an array
    this.m_location = [new vscode.Location(vscode.Uri.file(filePath), new vscode.Position(lineNumber, 0))];
  }

  // Combine two tags with the same name
  combine(otherTag: Tag): Tag {
    if (this.m_name !== otherTag.m_name) {
      throw new Error('Cannot combine tags with different names');
    }

    const combinedTag = Tag.createEmpty(this.m_name);

    const seen = new Set<string>(); // Use a Set to track unique definition-location pairs

    // Helper to add unique pairs
    const addUnique = (definitions: string[], locations: vscode.Location[]) => {
      for (let i = 0; i < definitions.length; i++) {
        const key = definitions[i] + '::' + locations[i].uri.fsPath + ':' + locations[i].range.start.line;

        if (!seen.has(key)) {
          seen.add(key);
          combinedTag.m_definition.push(definitions[i]);
          combinedTag.m_location.push(locations[i]);
        }
      }
    };

    // Add from both tags
    addUnique(this.m_definition, this.m_location);
    addUnique(otherTag.m_definition, otherTag.m_location);

    return combinedTag;
  }

  private static createEmpty(name: string): Tag {
    const tag = Object.create(Tag.prototype) as Tag;
    tag.m_name = name;
    tag.m_definition = [];
    tag.m_location = [];
    return tag;
  }

  // Method to check equality based on name only
  equals(otherTag: Tag): boolean {
    return this.m_name === otherTag.m_name;  // Tags are equal if their names match
  }

  toString(): string {
    const locationStrings = this.m_location.map(loc => {
      return `${loc.uri.fsPath}:${loc.range.start.line}`;
    });
    const definitionLengths = this.m_definition.map(def => {
      return `${def.length}`;
    });

    return `Tag[name: ${this.m_name}, Definitions: [${definitionLengths.join(", ")}], Locations: [${locationStrings.join(", ")}]]`;
  }

  // Comparison method for sorting
  compareTo(otherTag: Tag): number {
    return this.m_name.localeCompare(otherTag.m_name);
  }

  // Make the class iterable so you can use array destructuring. is can use a loop like: for (const [name, definitions, locations] of tags)
  *[Symbol.iterator](): IterableIterator<[string, string[], vscode.Location[]]> {
    yield [this.m_name, this.m_definition, this.m_location];
  }

  // Method to check if the tag is in the specified file path
  isInFilePath(filepath: string): boolean {
    const uriToCheck = vscode.Uri.file(filepath);  // Convert filepath string to vscode.Uri

    // Iterate through each location's URI and check if it matches
    for (let loc of this.m_location) {
      if (loc.uri.fsPath === uriToCheck.fsPath) {  // Compare file system path
        return true;
      }
    }
    return false;
  }

  // Method to get the file paths as an array of strings
  getFilePaths(): string[] {
    return this.m_location.map(loc => loc.uri.fsPath);  // Map each location to its fsPath and return as an array
  }

  addDefinition(newDefinition: string, newLocation: vscode.Location): void {
    const newKey = newDefinition + '::' + newLocation.uri.fsPath + ':' + newLocation.range.start.line;

    for (let i = 0; i < this.m_definition.length; i++) {
      const existingKey = this.m_definition[i] + '::' + this.m_location[i].uri.fsPath + ':' + this.m_location[i].range.start.line;
      if (existingKey === newKey) {
        return; // Already exists, do not add again
      }
    }

    // If unique, add
    this.m_definition.push(newDefinition);
    this.m_location.push(newLocation);
  }

  hasName(tagName: string) : boolean{
    return canonicalLowerCase(tagName) === this.m_name;
  }

  getName(): string {
    return this.m_name;
  }

  getDefinition(): string[] {
    return this.m_definition;
  }

  getLocation(): vscode.Location[] {
    return this.m_location;
  }

  removeIthDefinitionLocation(i: number) : void {
    this.m_location.splice(i, 1);
    this.m_definition.splice(i, 1);
  }
}


class Tags implements Iterable<Tag> {
  private m_tags: Map<string, Tag>;

  constructor(tags: Tag[] = []) {
    this.m_tags = new Map(tags.map(tag => [tag.getName(), tag])); // Map of tag names to tag objects
  }

  addTag(tag: Tag): void {
    if (this.m_tags.has(tag.getName())) {
      const existingTag = this.m_tags.get(tag.getName())!;
      const combined = existingTag.combine(tag);
      this.m_tags.set(tag.getName(), combined);
    } else {
      this.m_tags.set(tag.getName(), tag);
    }
  }

  addTags(tags: Tag[]): void {
    for (const tag of tags) {
      this.addTag(tag); // Leverages your existing logic
    }
  }

  getTags(): Tag[] {
    return Array.from(this.m_tags.values());
  }

  getTagNames(): string[] {
    return Array.from(this.m_tags.keys());
  }

  getTagDefinition(tag:string): string[] | undefined {
    return this.m_tags.get(canonicalLowerCase(tag))?.getDefinition();
  }

  getTagLocation(tag:string): vscode.Location[] | undefined {
    return this.m_tags.get(canonicalLowerCase(tag))?.getLocation();
  }

  removeTagsFromFilePath(filePath: string): void {
    const uriToRemove = vscode.Uri.file(filePath);

    // First pass: Iterate through the Map entries (key-value pairs)
    for (const [key, tag] of this.m_tags) {
      // Iterate over the locations in reverse order
      for (let i = tag.getLocation().length - 1; i >= 0; i--) {
        if (tag.getLocation()[i].uri.fsPath === uriToRemove.fsPath) {
          tag.removeIthDefinitionLocation(i);
        }
      }

      // If the tag has no definitions or locations left, remove it from the Map
      if (tag.getDefinition().length === 0) {
        this.m_tags.delete(key);
      }
    }
  }

  //Maps iterate in insertion order, so redoing the map puts everything in order
  sort(): void {
    this.m_tags = new Map(
      Array.from(this.m_tags.entries()).sort(([nameA, tagA], [nameB, tagB]) => tagA.compareTo(tagB))
    );
  }

  toString(): string {
    return Array.from(this.m_tags.values()).map(tag => tag.toString()).join('\n');
  }

  // Iterable implementation
  [Symbol.iterator](): Iterator<Tag> {
    return this.m_tags.values()[Symbol.iterator]();
  }

  clear(): void {
    this.m_tags.clear();
  }
}


let allTags = new Tags;


/**
 * Parses a single CIF DDL1 dictionary content into an array of Tags
 */
function parseDDL1Dictionary(content: string, filePath: string): Tag[] {
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


/**
 * Parses a single CIF DDL2 dictionary content into an array of Tags
 */
function parseDDL2Dictionary(content: string, filePath: string): Tag[] {
  let tags: Tag[] = []
  let lineLengths = stringToLineLengths(content);

  const saveframeRegex = /(?<=^|\s)save_?(_\S+)([\s\S]*?)save_(?=\s|$)/g;
  let match: RegExpExecArray | null;

  while ((match = saveframeRegex.exec(content))) {
    const fullSaveframe = match[0];
    const saveframeName = match[1];
    const index = match.index;
    const lineNumber = lineNumberFromIndex(index, lineLengths);

    tags.push(new Tag(saveframeName, fullSaveframe, filePath, lineNumber))
  }

  return tags;
}


function parseDDLmDictionary(content: string, filePath: string): Tag[] {
  let tags: Tag[] = []
  let lineLengths = stringToLineLengths(content);

  const saveframeRegex = /(?<=^|\s)save(_\S+)([\s\S]*?)save_(?=\s|$)/g;
  let match: RegExpExecArray | null;

  while ((match = saveframeRegex.exec(content))) {
    const fullSaveframe = match[0];
    const saveframeName = match[1];
    const index = match.index;
    const lineNumber = lineNumberFromIndex(index, lineLengths);

    tags.push(new Tag(saveframeName, fullSaveframe, filePath, lineNumber))
  }

  return tags;
}


function stringToLineLengths(content: string): number[] {
  const lines = content.split('\n');
  const cumulative: number[] = [];

  let total = 0;
  lines.forEach(line => {
    total += line.length + 1; // +1 for '\n'
    cumulative.push(total);
  });

  return cumulative;
}


function lineNumberFromIndex(index: number, lineLengths: number[]): number {
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
    } else {
      // If the middle element is not greater, search the right half
      left = mid + 1;
    }
  }

  return -1; // No element greater than the comparison found}
}


/**
 * Detects the DDL format (DDL1, DDL2, or DDLm) of a CIF dictionary file.
 * Reads the file line-by-line and resolves as soon as a match is found.
 *
 * @param filePath Path to the CIF dictionary file
 * @returns A Promise that resolves to "1", "2", "m", or null if no format matched
 */
function detectDDLFormat(content: string): "1" | "2" | "m" | null {

  const lines = content.split('\n'); // Split the content by lines

  for (const line of lines) {
      const trimmed = line.trim();

      //heuristics taken from https://github.com/cod-developers/cod-tools/blob/11adb93cd531a87d7c07493785de3da9123f9cff/scripts/cif_validate#L4321
      // Heuristic for DDLm
      if (trimmed.includes('_dictionary.ddl_conformance')) { return "m"; }

      // Heuristic for DDL2
      if (trimmed.includes('_dictionary.datablock_id')) { return "2"; }

      // Heuristic for DDL1
      if (trimmed.includes('data_on_this_dictionary')) { return "1"; }
  }
  return null;
}


/**
 * Parses a single CIF dictionary content into a map of tag -> saveframe
 */
function parseDictionary(content: string, filePath: string): Tag[] {
  const format = detectDDLFormat(content)

  console.log(`Detected DDL format: ${format}`);

  switch (format) {
    case "1":
      return parseDDL1Dictionary(content, filePath);
    case "2":
      return parseDDL2Dictionary(content, filePath)
    case "m":
      return parseDDLmDictionary(content, filePath);
    default:
      console.log("Unknown format.");
      return [];
  }
}


/**
 * Loads multiple dictionary files, merges their tag -> saveframe mappings
 */
function loadDictionaries(paths: string[], reloadPath: string = "") {
  //a hack to reload a dictionary upon the file changing
  if(reloadPath == "") { //then it's a normal reload everything
    console.log("Loading dictionaries...");
    allTags.clear();
  } else {
    console.log(`Reloading dictionary: ${reloadPath}`);
    allTags.removeTagsFromFilePath(reloadPath);
    paths = [reloadPath] //so I don't need to change the remaining code
  }

  let remaining = paths.length;

  let dictPatherr: String="";
  try {
    for (const dictPath of paths) {
      console.log(`Reading file: ${dictPath}`);
      dictPatherr = dictPath;
      let data = fs.readFileSync(dictPath, 'utf8');

      // Normalize all line endings to \n to simplify regex
      data = data.replace(/\r\n?/g, '\n');

      console.log(`Parsing file: ${dictPath}`);
      const newTags = parseDictionary(data, dictPath);
      console.log(`Parsed dictionary, found ${newTags.length} tags.`);

      allTags.addTags(newTags);
    }

    allTags.sort();
    console.log(`Loaded all dictionaries.`);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to load CIF dictionary (${dictPatherr}): ${err.message}`);
  }

   console.log(`Loaded all dictionaries.`);
}


/**
 * Returns an array of full paths to CIF dictionary files.
 * - If the user has specified "cifTools.dictionaryPaths" in settings, those are returned.
 * - Otherwise, it returns all `.dic` and `.cif` files from the bundled "dictionaries" folder.
 */
function getDictionaryPaths(context: vscode.ExtensionContext): string[] {
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


/**
 * Watch specific CIF dictionary files for changes, using paths from settings.
 */
function watchDictionaryFiles(dictPaths: string []) {
   dictPaths.forEach(dictPath => {
    const uri = vscode.Uri.file(dictPath);
    //const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath);
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(path.dirname(dictPath), path.basename(dictPath))
    );
    watcher.onDidChange(() => {
      //console.log(`Dictionary file changed: ${dictPath}`);
      loadDictionaries([],dictPath); // Reload just this file
    });

    watcher.onDidCreate(() => {
      //console.log(`Dictionary file created: ${dictPath}`);
      loadDictionaries([],dictPath);
    });

    watcher.onDidDelete(() => {
      //console.log(`Dictionary file deleted: ${dictPath}`);
      // Optionally remove data related to this file if needed
      loadDictionaries([],dictPath);
    });

    //console.log(`Watching file: ${dictPath}`);
  });
}


/**
 * Provides auto-suggestions for CIF tags
 */
function provideCifCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.CompletionItem[] | Thenable<vscode.CompletionItem[]> {
  // Get the current word at the cursor
  const currentWord = document.getText(document.getWordRangeAtPosition(position));

  // Create an array to store completion items
  let completionItems: vscode.CompletionItem[] = [];

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


// Call this to get dictionary paths
function loadConfiguredOrDefaultDictionaries(context: vscode.ExtensionContext): string[] {
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


/**
 * Activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
  if (alreadyActivated) {
    return;
  }
  alreadyActivated = true;

  vscode.window.showInformationMessage('CIF Extension activated. DDL2');

  const dictPaths = loadConfiguredOrDefaultDictionaries(context);

  loadDictionaries(dictPaths);
  watchDictionaryFiles(dictPaths);

  //to allow hover text to work
  const hoverProvider = vscode.languages.registerHoverProvider('cif', {
    provideHover(document, position, token) {
      const range = document.getWordRangeAtPosition(position, /_[\w\d.-]+/);
      if (!range) return;

      const tagName = document.getText(range);
      const saveframes = allTags.getTagDefinition(tagName);
      const locations = allTags.getTagLocation(tagName);
      if (!saveframes || saveframes.length === 0) return;
      if (!locations || locations.length === 0) return;

      // Start building the hover content
      let hoverText = "";
      if(saveframes.length > 1){
        saveframes.forEach((definition, index) => {
          const file = locations[index].uri.fsPath; // Access the second array using the same index
          hoverText += `${file}\n${definition}`;
          if(index < locations.length - 1) { hoverText += "\n\n---\n\n"; }
        });
      } else {
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
      const range = document.getWordRangeAtPosition(position, /_[\w\d.-]+/);
      if (!range) return;

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
  }, '_');  // Trigger on '_' character, adjust this as needed

  // Add to subscriptions to handle cleanup on deactivation
  context.subscriptions.push(completionProvider);

    // Register the new command
  let disposable = vscode.commands.registerCommand('cifTools.showAllTags', () => {
      vscode.window.showInformationMessage('Check console for all tags.');
      console.log('All Tags written to file.');
      //console.log(allTags.toString()); // Display tags in console
      fs.writeFileSync('debug-tag-output.txt', allTags.toString());
  });
  context.subscriptions.push(disposable); // Clean up when extension is deactivated

  console.log("End of activation.");
}


/**
 * Optional: clean up when extension deactivates
 */
export function deactivate() {
  allTags.clear();
}
