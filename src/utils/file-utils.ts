


export function stringToLineLengths(content: string): number[] {
    const lines = content.split('\n');
    const cumulative: number[] = [];

    let total = 0;
    lines.forEach(line => {
        total += line.length + 1; // +1 for '\n'
        cumulative.push(total);
    });

    return cumulative;
}


export function lineNumberFromIndex(index: number, lineLengths: number[]): number {
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
