import { generateCSV } from "../lib/csv";
import { describe, it, expect } from 'vitest';

describe('Phase 7 Tests', () => {
    it('CSV generator escapes formulas and commas correctly', () => {
        const data = [
            { id: 1, name: "Normal", value: 10 },
            { id: 2, name: "=1+1", value: 20 },
            { id: 3, name: "-200", value: -200 },
            { id: 4, name: "Has, Comma", value: 30 },
            { id: 5, name: "@Cmd", value: -5 },
            { id: 6, name: "\tTabbed", value: 40 }
        ];
        
        const csvStr = generateCSV(data, [
            { header: "ID", key: "id" },
            { header: "Name", key: "name" },
            { header: "Val", key: "value" }
        ]);
        
        expect(csvStr).toContain("'=1+1");
        expect(csvStr).toContain("'@Cmd");
        expect(csvStr).toContain("'\tTabbed");
        expect(csvStr).toContain('"-200",-200');
        expect(csvStr).toContain('"Has, Comma"');
    });
});
