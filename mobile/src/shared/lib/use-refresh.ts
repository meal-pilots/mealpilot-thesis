import { useState, useCallback } from 'react'

/**
 * Wires a refetch callback to a `RefreshControl` so swipe-to-refresh works on
 * any `ScrollView` / `FlatList`.  Pass `refetch` from React Query and return
 * the resulting `{ refreshing, onRefresh }`.
 */
export function useRefresh(refetch: () => Promise<unknown> | unknown) {
    const [refreshing, setRefreshing] = useState(false)

    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true)
            await refetch()
        } finally {
            setRefreshing(false)
        }
    }, [refetch])

    return { refreshing, onRefresh }
}
