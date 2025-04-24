# CIF Syntax Highlighter and more

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/MatthewRowles.cif?color=blue&label=Marketplace&logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=MatthewRowles.cif)
[![GitHub](https://img.shields.io/badge/GitHub-rowlesmr%2Fcifvsc-blue?logo=github)](https://github.com/rowlesmr/cifvsc)

The CIF extension helps crystallographers and materials scientists work more efficiently with `.cif` and `.dic` files by providing syntax highlighting, hover tooltips, and intelligent auto-completion inside Visual Studio Code.


## Contributing

Found a bug or have a feature request? Open an issue or submit a pull request on [GitHub](https://github.com/rowlesmr/cifvsc).

## Features

- Syntax highlighting for CIF tags, data blocks, save frames, strings, and comments
- Designed for working with CIF dictionaries and data files
- Hover text for tags showing tag definition from loaded dictionaries
- Auto-complete CIF tags based on loaded dictionaries

## File Extensions Supported

- `.cif`
- `.dic`

## Preview

Here's what CIF syntax highlighting looks like in VS Code:

![screenshot](https://raw.githubusercontent.com/rowlesmr/cifvsc/main/assets/syntax-preview.png)

Here's what the CIF hover text looks like in VS Code:

![screenshot](https://raw.githubusercontent.com/rowlesmr/cifvsc/main/assets/hover_text.png)


## Future Ideas

- 💡 Have an idea? Open a feature request [here](https://github.com/rowlesmr/cifvsc/issues)!

# Configuration

To use the CIF extension, specify the dictionary file paths in your `settings.json`:

```json
  "cifTools.dictionaryPaths": [
    "path/to/dictionary1.dic",
    "path/to/dictionary2.dic"
  ]
```

For DDL1 dictionaries, the recommended minimum files are:
- [cif_core.dic](https://github.com/COMCIFS/DDL1-legacy-dictionaries/raw/refs/heads/main/dictionaries/cif_core.dic)
- [ddl_core.dic](https://github.com/COMCIFS/DDL1-legacy-dictionaries/raw/refs/heads/main/dictionaries/ddl_core.dic)

Additionally, if working with powder diffraction files, include the following:
- [cif_pd.dic](https://github.com/COMCIFS/DDL1-legacy-dictionaries/raw/refs/heads/main/dictionaries/cif_pd.dic)


For DDL2 dictionaries, the recommended minimum files are:
- [cif_core.dic](https://github.com/COMCIFS/cif_core/raw/refs/heads/master/cif_core.dic)
- [ddl.dic](https://github.com/COMCIFS/cif_core/raw/refs/heads/master/ddl.dic)
- [templ_attr.cif](https://github.com/COMCIFS/cif_core/raw/refs/heads/master/templ_attr.cif)
- [templ_enum.cif](https://github.com/COMCIFS/cif_core/raw/refs/heads/master/templ_enum.cif)

Additionally, if working with powder diffraction files, include the following, noting that they are drafts:
- [cif_pow.dic](https://github.com/COMCIFS/Powder_Dictionary/raw/refs/heads/master/cif_pow.dic)
- [multi_block_core.dic](https://github.com/COMCIFS/MultiBlock_Dictionary/raw/refs/heads/main/multi_block_core.dic)

See the [COMCIFS github](https://github.com/COMCIFS) for other available dictionaries.

## License

[MIT](LICENSE)


## Installation

### 🛠️ Manual Installation from VSIX File

If you have a `.vsix` file (e.g., provided via email, GitHub release, or another source), you can manually install the extension in Visual Studio Code.

#### Download the `.vsix` file from Github

- Visit the **[Releases](https://github.com/rowlesmr/cifvsc)** page.
- Download the latest `.vsix` file (it will look like `cif-x.y.z.vsix`).

Then:

#### Option 1: Using the Extensions View

1. Open **Visual Studio Code**.
2. Open the **Extensions** view:
   - Click the squares icon in the left sidebar
     **or**
   - Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS).
3. Click the **More Actions (⋯)** menu at the top-right of the Extensions panel.
4. Select **Install from VSIX...**
5. Browse to and select your `.vsix` file.
6. The extension will install, and you may be prompted to **Reload** the window.

#### Option 2: Using the Command Palette

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) to open the **Command Palette**.
2. Type and select:  `Extensions: Install from VSIX...`
3. Choose the `.vsix` file from your system.
4. Wait for the installation to finish and reload if prompted.

