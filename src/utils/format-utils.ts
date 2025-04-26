
export function canonicalLowerCase(str: string): string {
    return str.normalize('NFD').toLocaleLowerCase().normalize('NFD');
}
