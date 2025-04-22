import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

let alreadyActivated = false;

let tagToSaveframes = new Map<string, string[]>();
let tagToLocations = new Map<string, vscode.Location[]>();
let tagToFiles = new Map<string, string[]>();

let tagList: string[] = []; // This will hold just the tags (keys)

/**
 * Parses a single CIF dictionary content into a map of tag -> saveframe
 */
function parseDictionary(content: string): Map<string, string> {

  const isDDL2 = content.trimStart().startsWith('#\\#CIF_2.0');
  const map = isDDL2 ? parseDDL2Dictionary(content) : parseDDL1Dictionary(content);

  return map;
}

/**
 * Parses a single CIF DDL2 dictionary content into a map of tag -> saveframe
 */
function parseDDL2Dictionary(content: string): Map<string, string> {

  const map = new Map<string, string>();

  // Normalize all line endings to \n to simplify regex
  content = content.replace(/\r\n?/g, '\n');

  const saveframeRegex = /save(_\S+)\n([\s\S]*?)(?=\nsave_\S+|\n#|\n\s*$)/g;
  let match: RegExpExecArray | null;

  while ((match = saveframeRegex.exec(content))) {
    const saveframeName = match[1];
    const saveframeBody = match[2];
    const fullSaveframe = `save${saveframeName}\n${saveframeBody.trim()}`;

    map.set(saveframeName, fullSaveframe);
  }

  return map;
}

/**
 * Parses a single CIF DDL1 dictionary content into a map of tag -> data block
 */
function parseDDL1Dictionary(content: string): Map<string, string> {
  const map = new Map<string, string>();
  content = content.replace(/\r\n?/g, '\n');

  const blockRegex = /data_(\S+)[\s\S]*?(?=data_\S+|$)/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content))) {
    const blockBody = match[0];

    // Check for looped _name values
    const loopNameMatch = blockBody.match(/loop_\s+(_name)\s+([\s\S]*?)(?=\s+_\S)/);
    let tagNames: string[] = [];

    if (loopNameMatch && loopNameMatch[1] == ('_name')) {
      // We're in a loop_ with _name lines
      let names = loopNameMatch[2].replace(/\s+/g, '\n').replace(/['"]/g, '');

      const nameLines = names
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith("'_") || line.startsWith('"_') || line.startsWith('_'));

      tagNames = nameLines.map(line => line.replace(/^['"]?/, '').replace(/['"]?$/, ''));
    } else {
      // Try to find a single _name outside of loop_
      const singleNameMatch = blockBody.match(/_name\s+([\s\S]*?)(?=\s+_\S)/);
      if (singleNameMatch) {
        tagNames = [singleNameMatch[1].replace(/['"]/g, '')];
      }
    }

    for (const tag of tagNames) {
      map.set(tag, blockBody.trim());
    }
  }

  return map;
}


/**
 * Loads multiple dictionary files, merges their tag -> saveframe mappings
 */
function loadDictionaries(paths: string[], reloadPath: string = "") {
  //a hack to reload a dictionary upon the file changing
  if(reloadPath == "") { //then it's a normal reload everything
    console.log("Loading dictionaries...");

    tagToSaveframes.clear();
    tagToLocations.clear();
    tagToFiles.clear();


  } else {
    console.log(`Reloading dictionary: ${reloadPath}`);
    //delete all existing references to the reloadPath
    for (const [tag, filePaths] of tagToFiles) {
      let deleteIndex = -1;
      for(const [index, file] of filePaths.entries()) {
        if(file == reloadPath){
          deleteIndex = index;
        }
      }
      if(deleteIndex == -1){
        continue;
      }

      //deleteIndex is a valid index to a thing to delete
      if(filePaths.length == 1) { //there is only one thing to delete
        tagToSaveframes.delete(tag);
        tagToLocations.delete(tag);
        tagToFiles.delete(tag);
      } else { //there is more than one entry in the value array, and so it must be preserved
        let tmpSave = tagToSaveframes.get(tag);
        if(tmpSave) { tmpSave.splice(deleteIndex, 1); }

        let tmpLoc = tagToLocations.get(tag);
        if(tmpLoc) { tmpLoc.splice(deleteIndex, 1); }

        let tmpFile = tagToFiles.get(tag);
        if(tmpFile) { tmpFile.splice(deleteIndex, 1); }
      }


    }
    paths = [reloadPath] //so I don't need to change the remaining code
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
          const saveLine = lines.findIndex(line => line.startsWith(`save${tag}`) || line.endsWith(`'${tag}'`));
          if (saveLine !== -1) {
            const uri = vscode.Uri.file(dictPath);
            const position = new vscode.Position(saveLine, 0); // Position at the start of the saveframe
            const location = new vscode.Location(uri, position);

            // Add to arrays instead of setting single values
            if (!tagToSaveframes.has(tag)) {
              tagToSaveframes.set(tag, []);
            }
            tagToSaveframes.get(tag)!.push(saveframe);

            if (!tagToLocations.has(tag)) {
              tagToLocations.set(tag, []);
            }
            tagToLocations.get(tag)!.push(location);

            if (!tagToFiles.has(tag)) {
              tagToFiles.set(tag, []);
            }
            tagToFiles.get(tag)!.push(dictPath);
              console.log("something");
          }
        }

      console.log(`Loaded CIF dictionary: ${path.basename(dictPath)}`);
      remaining--;

      if(remaining == 0) {
        checkMultipleDefinitions();
        updateTagList();
      }

    });
   });

   console.log(`Loaded all dictionaries.`);
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
  const dictPaths: string[] = config.get<string[]>('dictionaryPaths') || [];

  dictPaths.forEach(dictPath => {
    const uri = vscode.Uri.file(dictPath);
    //const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath);
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(path.dirname(dictPath), path.basename(dictPath))
    );
    watcher.onDidChange(() => {
      console.log(`Dictionary file changed: ${dictPath}`);
      loadDictionaries([],dictPath); // Reload just this file
    });

    watcher.onDidCreate(() => {
      console.log(`Dictionary file created: ${dictPath}`);
      loadDictionaries([],dictPath);
    });

    watcher.onDidDelete(() => {
      console.log(`Dictionary file deleted: ${dictPath}`);
      // Optionally remove data related to this file if needed
      loadDictionaries([],dictPath);
    });

    console.log(`Watching file: ${dictPath}`);
  });
}



function updateTagList() {
  // Update the tagList whenever the dictionaries are loaded or updated
  tagList = Array.from(tagToSaveframes.keys());
  console.log("Updating tag list.");
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
  tagList.forEach(tag => {
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


function downloadAndSaveDictionaries(context: vscode.ExtensionContext) {
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

function downloadFile(url: string, directory: string, filename: string): Promise<void> {
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
        fs.unlink(filePath, () => {}); // Delete the file if error occurs during writing
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
export function activate(context: vscode.ExtensionContext) {
  if (alreadyActivated) {
    return;
  }
  alreadyActivated = true;

  vscode.window.showInformationMessage('CIF Extension activated.');
  const config = vscode.workspace.getConfiguration('cifTools');
  const dictPaths = config.get<string[]>('dictionaryPaths') || [];

  if (dictPaths.length > 0) {
    loadDictionaries(dictPaths);
    watchDictionaryFiles();
  } else {
    //vscode.window.showWarningMessage('No CIF dictionary paths configured. Tag definitions will not be available.');
    vscode.window.showWarningMessage(
      'No CIF dictionaries configured. Would you like to add them from a single directory now? If you have many directories, edit your settings.json manually; see the readme.md.',
      'Select Files',
      'Open Settings',
      'Download default files'
    ).then(selection => {
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
            vscode.workspace.getConfiguration().update(
              'cifTools.dictionaryPaths',
              paths,
              vscode.ConfigurationTarget.Global
            ).then(() => {
              vscode.window.showInformationMessage(`CIF dictionary paths saved.`);
              loadDictionaries(paths);
              watchDictionaryFiles();
            });
          }
        });
      } else if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettingsJson');
      } else if (selection === 'Download default files') {
        downloadAndSaveDictionaries(context);
      }
    });

  }

  //to allow hover text to work
  const hoverProvider = vscode.languages.registerHoverProvider('cif', {
    provideHover(document, position, token) {
      const range = document.getWordRangeAtPosition(position, /_[\w\d.]+/);
      if (!range) return;

      const word = document.getText(range);
      const saveframes = tagToSaveframes.get(word);
      const files = tagToFiles.get(word);
      if (!saveframes || saveframes.length === 0) return;
      if (!files || files.length === 0) return;

      // Start building the hover content
      let hoverText = "";
      if(saveframes.length > 1){
        saveframes.forEach((definition, index) => {
          const file = files[index]; // Access the second array using the same index
          hoverText += `${file}\n${definition}\n\n---\n\n`;
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
      const range = document.getWordRangeAtPosition(position, /_[\w\d.]+/);
      if (!range) return;

      const word = document.getText(range);
      const locations = tagToLocations.get(word);
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




}

/**
 * Optional: clean up when extension deactivates
 */
export function deactivate() {
  tagToSaveframes.clear();
  tagToLocations.clear();
  tagToFiles.clear();
}
