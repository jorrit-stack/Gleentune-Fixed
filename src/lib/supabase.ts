import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingEnvError = new Error(
  'Supabase is not configured. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable backend data.'
);

type NoopResponse<T = unknown> = {
  data: T | null;
  error: Error;
  count?: number | null;
};

const noopPromise = <T = unknown>(): Promise<NoopResponse<T>> =>
  Promise.resolve({
    data: null,
    error: missingEnvError,
    count: null
  });

const createNoopQueryBuilder = () => {
  const builder: any = {
    then(onFulfilled?: (value: NoopResponse) => unknown, onRejected?: (reason: unknown) => unknown) {
      return noopPromise().then(onFulfilled, onRejected);
    },
    catch(onRejected?: (reason: unknown) => unknown) {
      return noopPromise().catch(onRejected);
    },
    finally(onFinally?: () => void) {
      return noopPromise().finally(onFinally);
    }
  };

  const chainableMethods = [
    'select',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'ilike',
    'like',
    'not',
    'in',
    'contains',
    'overlaps',
    'textSearch',
    'filter',
    'match',
    'or',
    'order',
    'limit',
    'range',
    'single',
    'maybeSingle',
    'returns',
    'insert',
    'update',
    'upsert',
    'delete',
    'rpc'
  ];

  chainableMethods.forEach(method => {
    builder[method] = () => builder;
  });

  return builder;
};

const createNoopSupabaseClient = (): SupabaseClient => {
  const builderFactory = () => createNoopQueryBuilder();

  const noopClient: any = {
    from() {
      return builderFactory();
    },
    rpc() {
      return builderFactory();
    },
    channel() {
      return {
        subscribe: () => ({ error: missingEnvError }),
        unsubscribe: () => undefined
      };
    },
    removeChannel() {
      return { error: missingEnvError };
    },
    removeAllChannels() {
      return { error: missingEnvError };
    },
    getChannels() {
      return [];
    },
    functions: {
      invoke: () => noopPromise()
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: missingEnvError }),
      getUser: () => Promise.resolve({ data: { user: null }, error: missingEnvError }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => undefined
          }
        },
        error: missingEnvError
      }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: missingEnvError }),
      signOut: () => Promise.resolve({ error: missingEnvError })
    }
  };

  return noopClient as SupabaseClient;
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY. Falling back to a no-op client so the UI can render.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createNoopSupabaseClient();
