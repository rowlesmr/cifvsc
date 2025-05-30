# CIF Syntax Highlighter and more

[![Visual Studio Marketplace](https://img.shields.io/badge/VS%20Marketplace-MatthewRowles%2Fcifvsc-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=MatthewRowles.cifvsc)
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

A minimal set of CIF dictionary files are provided. These include

DDL1 dictionaries:
- [cif_core.dic](https://github.com/COMCIFS/DDL1-legacy-dictionaries/raw/refs/heads/main/dictionaries/cif_core.dic)
- [ddl_core.dic](https://github.com/COMCIFS/DDL1-legacy-dictionaries/raw/refs/heads/main/dictionaries/ddl_core.dic)
- [cif_pd.dic](https://github.com/COMCIFS/DDL1-legacy-dictionaries/raw/refs/heads/main/dictionaries/cif_pd.dic)

DDL2 dictionary:
- [mmcif_pdbx_v50.dic](https://mmcif.wwpdb.org/dictionaries/ascii/mmcif_pdbx_v50.dic)
- [mmcif_ddl.dic](https://mmcif.wwpdb.org/dictionaries/ascii/mmcif_ddl.dic)

DDLm dictionaries:
- [cif_core.dic](https://github.com/COMCIFS/cif_core/raw/refs/heads/master/cif_core.dic)
- [ddl.dic](https://github.com/COMCIFS/cif_core/raw/refs/heads/master/ddl.dic)
- [templ_attr.cif](https://github.com/COMCIFS/cif_core/raw/refs/heads/master/templ_attr.cif)
- [templ_enum.cif](https://github.com/COMCIFS/cif_core/raw/refs/heads/master/templ_enum.cif)
- [cif_pow.dic](https://github.com/COMCIFS/Powder_Dictionary/raw/refs/heads/master/cif_pow.dic)
- [multi_block_core.dic](https://github.com/COMCIFS/MultiBlock_Dictionary/raw/refs/heads/main/multi_block_core.dic)


If you want to use your own, customised set of dictionaries, you can specify them in your `settings.json`:

```json
  "cifTools.dictionaryPaths": [
    "path/to/dictionary1.dic",
    "path/to/dictionary2.dic"
  ]
```

Specifying your own dictionaries will override all default dictionaries.

See the [COMCIFS github](https://github.com/COMCIFS) or [PDBx/mmCIF Dictionary Resources](https://mmcif.wwpdb.org/dictionaries/downloads.html) for other available dictionaries.

## License

[MIT](LICENSE)


## Installation

### 🌐 Install from the Visual Studio Code Marketplace

The easiest way to install **CIF Syntax Support** is directly from the Visual Studio Code Marketplace.

#### Option 1: Using the Extensions View

1. Open **Visual Studio Code**.
2. Go to the **Extensions** view:
   - Click the Extensions icon in the Activity Bar on the side.
   - Or press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS).
3. In the **search bar**, type:
   ```
   CIF Syntax Support
   ```
4. Look for the extension by **MatthewRowles** and click **Install**.

#### Option 2: Install via Command Palette

1. Open the **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Type and select:
   ```
   Extensions: Install Extensions
   ```
3. Search for `CIF Syntax Support` and click **Install**.

Or visit the [Visual Studio Marketplace page](https://marketplace.visualstudio.com/items?itemName=MatthewRowles.cifvsc) to install it directly.

### 🛠️ Manual Installation from VSIX File

If you have a `.vsix` file (e.g., provided via email, GitHub release, or another source), you can manually install the extension in Visual Studio Code.

#### Download the `.vsix` file from Github

- Visit the **[Releases](https://github.com/rowlesmr/cifvsc)** page.
- Download the latest `.vsix` file (it will look like `cifvsc-x.y.z.vsix`).

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

