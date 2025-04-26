import * as vscode from 'vscode';
import { canonicalLowerCase } from '@utils';


export class Tag {
    private m_name: string;
    private m_definition: string[];
    private m_location: vscode.Location[];

    constructor(tagName: string, definition: string, filePath: string, lineNumber: number) {
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

    hasName(tagName: string): boolean {
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

    removeIthDefinitionLocation(i: number): void {
        this.m_location.splice(i, 1);
        this.m_definition.splice(i, 1);
    }
}
