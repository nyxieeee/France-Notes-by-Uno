import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

type RequestError = { message: string; code?: string }
const expired = (error: RequestError | null) => !!error && /jwt.*expired|token.*expired/i.test(error.message)
let refreshing: Promise<Session> | null = null

function refresh(): Promise<Session> {
  if (!refreshing) {
    refreshing = (async () => {
      const { data, error } = await supabase.auth.refreshSession()
      if (error || !data.session) throw new Error('Your session could not be renewed. Please sign in again, then retry.')
      return data.session
    })().finally(() => { refreshing = null })
  }
  return refreshing
}

/** Retry only an expired-token rejection, never an ambiguous failed write. */
export async function sessionRequest<T extends { error: RequestError | null }>(request: (userId: string) => PromiseLike<T>): Promise<T> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('Please sign in again to load or save your data.')
  let session = data.session
  const userId = session.user.id
  if (session.expires_at && session.expires_at <= Date.now() / 1000 + 30) session = await refresh()
  if (session.user.id !== userId) throw new Error('Your account changed. Reload Notes before continuing.')
  const result = await request(userId)
  if (!expired(result.error)) return result
  session = await refresh()
  if (session.user.id !== userId) throw new Error('Your account changed. Reload Notes before continuing.')
  const retried = await request(userId)
  if (expired(retried.error)) throw new Error('Your session is still expired. Please sign in again, then retry.')
  return retried
}
