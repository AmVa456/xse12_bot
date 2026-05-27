export type RedisClient = {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
};

class InMemoryRedisClient implements RedisClient {
  private values = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.values.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.values.delete(key);
  }
}

export async function createRedisClient(redisUrl?: string): Promise<RedisClient | undefined> {
  if (!redisUrl) {
    return undefined;
  }

  return new InMemoryRedisClient();
}
