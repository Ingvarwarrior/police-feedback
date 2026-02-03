import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface Officer {
    id: string
    badgeNumber: string
    firstName: string
    lastName: string
    imageUrl: string | null
    rank: string | null
    department: string | null
    status: string
    avgScore: number
    totalEvaluations: number
    totalResponses: number
    phone?: string | null
}

interface AdminState {
    officers: Officer[]
    lastFetched: number | null
    scrollPosition: number
    searchTerm: string
    setOfficers: (officers: Officer[]) => void
    removeOfficer: (id: string) => void
    updateOfficer: (id: string, updates: Partial<Officer>) => void
    setScrollPosition: (pos: number) => void
    setSearchTerm: (term: string) => void
    clearCache: () => void
}

export const useAdminStore = create<AdminState>()(
    persist(
        (set) => ({
            officers: [],
            lastFetched: null,
            scrollPosition: 0,
            searchTerm: "",

            setOfficers: (officers) => set({ officers, lastFetched: Date.now() }),
            removeOfficer: (id) => set((state) => ({
                officers: state.officers.filter(o => o.id !== id)
            })),
            updateOfficer: (id, updates) => set((state) => ({
                officers: state.officers.map(o => o.id === id ? { ...o, ...updates } : o)
            })),
            setScrollPosition: (scrollPosition) => set({ scrollPosition }),
            setSearchTerm: (searchTerm) => set({ searchTerm }),
            clearCache: () => set({ officers: [], lastFetched: null, scrollPosition: 0 })
        }),
        {
            name: 'admin-officers-cache',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                scrollPosition: state.scrollPosition,
                searchTerm: state.searchTerm
            })
        }
    )
)
