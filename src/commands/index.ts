import * as vscode from 'vscode';
import { Tags } from '@models';
import { registerShowAllTagsCommand } from './show-all-tags-command';

/**
 * Registers all commands for the extension.
 */
export function registerCommands(context: vscode.ExtensionContext, tags: Tags): void {
    context.subscriptions.push(registerShowAllTagsCommand(tags));
}
