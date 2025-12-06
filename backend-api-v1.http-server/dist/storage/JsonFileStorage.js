import fs from 'fs/promises';
import path from 'path';
export class JsonFileStorage {
    constructor(dataDir = 'data') {
        this.dataDir = path.join(process.cwd(), dataDir);
    }
    async ensureDir() {
        try {
            await fs.access(this.dataDir);
        }
        catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }
    async save(filename, data) {
        await this.ensureDir();
        const filePath = path.join(this.dataDir, filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    async load(filename) {
        await this.ensureDir();
        const filePath = path.join(this.dataDir, filename);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            // Return null if file doesn't exist or is invalid
            return null;
        }
    }
}
export const jsonStorage = new JsonFileStorage();
