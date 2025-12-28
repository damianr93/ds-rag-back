import { randomUUID } from 'crypto';

export class Uuid {
    static v4(): string {
        return randomUUID();
    }
}