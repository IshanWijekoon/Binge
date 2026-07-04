import { notFound } from "../../shared/errors";

export type Row = Record<string, unknown>;

export class D1Repository {
  constructor(protected readonly db: D1Database) {}

  protected async first<T extends Row>(query: string, ...params: unknown[]): Promise<T | null> {
    return this.db.prepare(query).bind(...params).first<T>();
  }

  protected async required<T extends Row>(query: string, message: string, ...params: unknown[]): Promise<T> {
    const row = await this.first<T>(query, ...params);
    if (!row) {
      throw notFound(message);
    }
    return row;
  }

  protected async all<T extends Row>(query: string, ...params: unknown[]): Promise<T[]> {
    const result = await this.db.prepare(query).bind(...params).all<T>();
    return result.results;
  }

  protected async run(query: string, ...params: unknown[]): Promise<void> {
    await this.db.prepare(query).bind(...params).run();
  }
}
