export interface IRepository<T> {
  findAll(): Promise<T[]>

  findOne(criteria: Record<string, any>): Promise<T | null>

  save(item: T): Promise<T>

  remove(criteria: Record<string, any>): Promise<boolean>
}
