import { useQuery } from '@tanstack/react-query'

import {
    getActiveGroup,
    getGroup,
    getGroupPreferences,
    listGroupMembers,
    listGroups,
} from './api/groups-api'

export const groupKeys = {
    all: ['groups'] as const,
    list: () => [...groupKeys.all, 'list'] as const,
    active: () => [...groupKeys.all, 'active'] as const,
    detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
    members: (id: string) => [...groupKeys.all, id, 'members'] as const,
    preferences: (id: string) => [...groupKeys.all, id, 'preferences'] as const,
}

export function useActiveGroup() {
    return useQuery({
        queryKey: groupKeys.active(),
        queryFn: getActiveGroup,
        staleTime: 60_000,
    })
}

export function useGroups() {
    return useQuery({
        queryKey: groupKeys.list(),
        queryFn: listGroups,
        staleTime: 60_000,
    })
}

export function useGroup(groupId: string | undefined | null) {
    return useQuery({
        queryKey: groupId ? groupKeys.detail(groupId) : ['groups', 'detail', 'none'],
        queryFn: () => getGroup(groupId as string),
        enabled: Boolean(groupId),
        staleTime: 60_000,
    })
}

export function useGroupMembers(groupId: string | undefined | null) {
    return useQuery({
        queryKey: groupId ? groupKeys.members(groupId) : ['groups', 'none', 'members'],
        queryFn: () => listGroupMembers(groupId as string),
        enabled: Boolean(groupId),
        staleTime: 60_000,
    })
}

export function useGroupPreferences(groupId: string | undefined | null) {
    return useQuery({
        queryKey: groupId ? groupKeys.preferences(groupId) : ['groups', 'none', 'prefs'],
        queryFn: () => getGroupPreferences(groupId as string),
        enabled: Boolean(groupId),
        staleTime: 60_000,
    })
}
