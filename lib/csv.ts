export function generateCSV<T>(
    data: T[], 
    columns: { header: string; key: keyof T | ((row: T) => string | number | null | undefined) }[]
): string {
    // UTF-8 BOM for Excel
    const BOM = "\uFEFF";

    const escapeValue = (val: any): string => {
        if (val === null || val === undefined) return "";
        
        if (typeof val === "number") {
            return String(val);
        }

        let str = String(val);
        
        if (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "") {
            return `"${str}"`;
        }

        // Neutralize formula-like payloads in text fields (not pure numbers)
        // Check if starts with '=', '+', '-', '@', '\t', '\r' and prepend a single quote to neutralize
        if (/^[=+\-@\t\r]/.test(str)) {
            str = "'" + str;
        }

        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const headerRow = columns.map(c => escapeValue(c.header)).join(",");
    
    const dataRows = data.map(row => {
        return columns.map(c => {
            const val = typeof c.key === 'function' ? c.key(row) : row[c.key as keyof T];
            return escapeValue(val);
        }).join(",");
    });

    return BOM + [headerRow, ...dataRows].join("\n");
}
