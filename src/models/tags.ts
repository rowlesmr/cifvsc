import * as vscode from 'vscode';
import { Tag } from './tag';
import { canonicalLowerCase } from '@utils';

export class Tags implements Iterable<Tag> {
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

    getTagDefinition(tag: string): string[] | undefined {
        return this.m_tags.get(canonicalLowerCase(tag))?.getDefinition();
    }

    getTagLocation(tag: string): vscode.Location[] | undefined {
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
