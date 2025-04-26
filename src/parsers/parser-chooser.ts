

/**
 * Detects the DDL format (DDL1, DDL2, or DDLm) of a CIF dictionary file.
 * Reads the file line-by-line and resolves as soon as a match is found.
 *
 * @param filePath Path to the CIF dictionary file
 * @returns A Promise that resolves to "1", "2", "m", or null if no format matched
 */
export function detectDDLFormat(content: string): "1" | "2" | "m" | null {

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
