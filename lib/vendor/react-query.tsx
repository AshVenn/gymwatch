'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type QueryKey = ReadonlyArray<unknown>

type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

interface QueryState<TData> {
  data?: TData
  error?: unknown
  status: QueryStatus
}

function hashQueryKey(key: QueryKey): string {
  return JSON.stringify(key)
}

function matchesKey(target: QueryKey, filter?: QueryKey): boolean {
  if (!filter || filter.length === 0) return true
  if (filter.length > target.length) return false
  return filter.every((value, index) => Object.is(value, target[index]))
}

export class QueryClient {
  private cache = new Map<string, unknown>()
  private listeners = new Map<string, Set<() => void>>()
  private keyMap = new Map<string, QueryKey>()

  getQueryData<TData>(queryKey: QueryKey): TData | undefined {
    return this.cache.get(hashQueryKey(queryKey)) as TData | undefined
  }

  setQueryData<TData>(queryKey: QueryKey, data: TData) {
    const hash = hashQueryKey(queryKey)
    this.cache.set(hash, data)
    this.keyMap.set(hash, queryKey)
    this.listeners.get(hash)?.forEach((listener) => listener())
  }

  subscribe(queryKey: QueryKey, listener: () => void) {
    const hash = hashQueryKey(queryKey)
    const listeners = this.listeners.get(hash) ?? new Set<() => void>()
    listeners.add(listener)
    this.listeners.set(hash, listeners)
    this.keyMap.set(hash, queryKey)

    return () => {
      const current = this.listeners.get(hash)
      current?.delete(listener)
      if (!current || current.size === 0) {
        this.listeners.delete(hash)
        this.keyMap.delete(hash)
      }
    }
  }

  invalidateQueries(partialKey?: QueryKey) {
    for (const [hash, key] of this.keyMap.entries()) {
      if (matchesKey(key, partialKey)) {
        this.listeners.get(hash)?.forEach((listener) => listener())
      }
    }
  }
}

const QueryClientContext = createContext<QueryClient | null>(null)

export function QueryClientProvider({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>
}

export function useQueryClient() {
  const client = useContext(QueryClientContext)
  if (!client) throw new Error('useQueryClient must be used within a QueryClientProvider')
  return client
}

interface UseQueryOptions<TData> {
  queryKey: QueryKey
  queryFn: () => Promise<TData>
  enabled?: boolean
  initialData?: TData
}

interface UseQueryResult<TData> extends QueryState<TData> {
  data: TData | undefined
  refetch: () => Promise<void>
  isLoading: boolean
  isError: boolean
}

export function useQuery<TData>(options: UseQueryOptions<TData>): UseQueryResult<TData> {
  const { queryKey, queryFn, enabled = true, initialData } = options
  const client = useQueryClient()
  const cached = useMemo(() => client.getQueryData<TData>(queryKey), [client, queryKey])
  const [state, setState] = useState<QueryState<TData>>(() => {
    if (cached !== undefined) {
      return { data: cached, status: 'success' }
    }
    if (initialData !== undefined) {
      return { data: initialData, status: 'success' }
    }
    return { status: 'idle' }
  })

  const latestQueryFn = useRef(queryFn)
  useEffect(() => {
    latestQueryFn.current = queryFn
  }, [queryFn])

  const fetchQuery = useCallback(async () => {
    if (!enabled) return
    setState((prev) => ({ data: prev.data, status: 'loading', error: undefined }))
    try {
      const data = await latestQueryFn.current()
      client.setQueryData(queryKey, data)
      setState({ data, status: 'success' })
    } catch (error) {
      setState({ error, status: 'error' })
    }
  }, [client, enabled, queryKey])

  useEffect(() => {
    if (!enabled) return
    fetchQuery()
    return client.subscribe(queryKey, fetchQuery)
  }, [client, fetchQuery, queryKey, enabled])

  return {
    data: state.data,
    error: state.error,
    status: state.status,
    refetch: fetchQuery,
    isLoading: state.status === 'loading',
    isError: state.status === 'error',
  }
}

interface UseMutationOptions<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>
  onSuccess?: (data: TData, variables: TVariables, context?: TContext) => void | Promise<void>
  onError?: (error: unknown, variables: TVariables, context?: TContext) => void | Promise<void>
  onSettled?: (
    data: TData | undefined,
    error: unknown,
    variables: TVariables,
    context?: TContext
  ) => void | Promise<void>
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  isPending: boolean
  isSuccess: boolean
  error: unknown
}

export function useMutation<TData, TVariables, TContext = unknown>(
  options: UseMutationOptions<TData, TVariables, TContext>
): UseMutationResult<TData, TVariables> {
  const { mutationFn, onSuccess, onError, onSettled, onMutate } = options
  const [status, setStatus] = useState<QueryStatus>('idle')
  const [error, setError] = useState<unknown>(null)

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setStatus('loading')
      setError(null)
      let context: TContext | undefined
      let data: TData | undefined
      let caughtError: unknown

      try {
        context = await onMutate?.(variables)
        data = await mutationFn(variables)
        setStatus('success')
        await onSuccess?.(data, variables, context)
        return data
      } catch (err) {
        caughtError = err
        setStatus('error')
        setError(err)
        await onError?.(err, variables, context)
        throw err
      } finally {
        await onSettled?.(data, caughtError, variables, context)
      }
    },
    [mutationFn, onError, onMutate, onSettled, onSuccess]
  )

  return {
    mutate: (variables: TVariables) => {
      mutateAsync(variables).catch(() => null)
    },
    mutateAsync,
    isPending: status === 'loading',
    isSuccess: status === 'success',
    error,
  }
}
