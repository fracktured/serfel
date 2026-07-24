import { AsyncLocalStorage } from 'async_hooks';
import { randomBytes } from 'crypto';

interface TraceContext {
  traceId: string;
  [key: string]: any;
}

class TraceContextManager {
  private static instance: TraceContextManager;
  private asyncLocalStorage: AsyncLocalStorage<TraceContext>;

  private constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage<TraceContext>();
  }

  public static getInstance(): TraceContextManager {
    if (!TraceContextManager.instance) {
      TraceContextManager.instance = new TraceContextManager();
    }
    return TraceContextManager.instance;
  }

  public run<T>(context: TraceContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  public runAsync<T>(context: TraceContext, callback: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(context, callback);
  }

  public getContext(): TraceContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  public getTraceId(): string | undefined {
    const context = this.getContext();
    return context?.traceId;
  }

  public setContext(key: string, value: any): void {
    const context = this.getContext();
    if (context) {
      context[key] = value;
    }
  }

  public generateTraceId(): string {
    // Usar crypto.randomBytes en lugar de uuid para evitar problemas con ES modules
    return randomBytes(16).toString('hex');
  }

  public createContext(additionalData?: Record<string, any>): TraceContext {
    return {
      traceId: this.generateTraceId(),
      ...additionalData
    };
  }
}

export const traceContext = TraceContextManager.getInstance();
export { TraceContext };
