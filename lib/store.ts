import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { generateId } from './utils'

export type SurveyData = {
    // Step 0: Consent
    hasConsent: boolean;

    // Step 1: Contact Preference
    wantContact: boolean;

    // Step 2: Contact Details
    contactName: string;
    contactPhone: string;

    // Step 3: Context
    districtOrCity: string;
    interactionDate: string | null; // ISO Date string
    interactionTime: string; // Time interval (e.g., "09:00-12:00")
    incidentType: string;
    responseTime: string;

    // Step 4: Patrol
    patrolRef: string;
    officerName: string;
    badgeNumber: string;

    // Step 5: Geo
    // stored as simple object
    geoPoint: {
        lat: number;
        lon: number;
        accuracyMeters?: number;
        precisionMode?: 'approx' | 'exact';
        label?: string; // e.g. address
    } | null;

    // Step 6: Photos
    // We store array of uploaded attachment IDs
    attachmentIds: string[];

    // Step 7: Ratings
    ratings: {
        politeness: number;
        professionalism: number;
        effectiveness: number;
        overall: number;
    };

    // Step 8: Comment
    comment: string;

    // Meta
    clientGeneratedId: string;
}

interface SurveyState {
    currentStep: number;
    formData: SurveyData;
    setStep: (step: number) => void;
    updateData: (data: Partial<SurveyData>) => void;
    resetSurvey: () => void;
    setClientGeneratedId: (id: string) => void;
}

const initialData: SurveyData = {
    hasConsent: false,
    wantContact: false,
    contactName: '',
    contactPhone: '',
    districtOrCity: '',
    interactionDate: null,
    interactionTime: '',
    incidentType: '',
    responseTime: '',
    patrolRef: '',
    officerName: '',
    badgeNumber: '',
    geoPoint: null,
    attachmentIds: [],
    ratings: {
        politeness: 0,
        professionalism: 0,
        effectiveness: 0,
        overall: 0,
    },
    comment: '',
    clientGeneratedId: '',
}

export const useSurveyStore = create<SurveyState>()(
    persist(
        (set) => ({
            currentStep: 0,
            formData: initialData,
            setStep: (step) => set({ currentStep: step }),
            updateData: (data) =>
                set((state) => ({
                    formData: { ...state.formData, ...data },
                })),
            resetSurvey: () =>
                set({
                    currentStep: 0,
                    formData: { ...initialData, clientGeneratedId: generateId() },
                }),
            setClientGeneratedId: (id) =>
                set((state) => ({
                    formData: { ...state.formData, clientGeneratedId: id },
                })),
        }),
        {
            name: 'police-survey-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                currentStep: state.currentStep,
                formData: state.formData,
            }),
        }
    )
)
