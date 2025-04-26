import * as vscode from 'vscode';
import { Tags } from '@models';
import { createHoverProvider } from './hover-provider';
import { createDefinitionProvider } from './definition-provider';
import { createCompletionProvider } from './completion-provider';


/**
 * Registers all language providers for the CIF extension.
 */
export function registerProviders(context: vscode.ExtensionContext, allTags: Tags): void {
    // Register the completion item provider
    const completionProvider = vscode.languages.registerCompletionItemProvider('cif', createCompletionProvider(allTags), '_');
    context.subscriptions.push(completionProvider);

    // Register the definition provider
    const definitionProvider = vscode.languages.registerDefinitionProvider('cif', createDefinitionProvider(allTags));
    context.subscriptions.push(definitionProvider);

    // Register the hover provider
    const hoverProvider = vscode.languages.registerHoverProvider('cif', createHoverProvider(allTags));
    context.subscriptions.push(hoverProvider);
}
