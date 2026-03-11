'use client'

/**
 * Centralized error handling for Supabase operations.
 * Provides user-friendly messages instead of raw Supabase errors.
 */

const ERROR_MAP: Record<string, string> = {
    '23505': 'This record already exists. Please check for duplicates.',
    '23503': 'Cannot complete this action — a related record is missing.',
    '23514': 'Invalid data. Please check your inputs.',
    '42501': 'You do not have permission to perform this action.',
    'PGRST301': 'You do not have permission to access this data.',
    '23502': 'A required field is missing.',
}

interface SupabaseError {
    message: string
    code?: string
    details?: string
    hint?: string
}

/**
 * Convert a Supabase error into a user-friendly message
 */
export function friendlyError(error: SupabaseError | null | undefined): string {
    if (!error) return 'An unknown error occurred'
    
    // Check for known Postgres error codes
    if (error.code && ERROR_MAP[error.code]) {
        return ERROR_MAP[error.code]
    }
    
    // Check for specific message patterns
    const msg = error.message?.toLowerCase() || ''
    if (msg.includes('duplicate key')) return 'This record already exists.'
    if (msg.includes('foreign key')) return 'Cannot delete — this record is referenced by other data.'
    if (msg.includes('not null')) return 'A required field is missing.'
    if (msg.includes('permission denied')) return 'You do not have permission for this action.'
    if (msg.includes('jwt expired')) return 'Your session has expired. Please log in again.'
    if (msg.includes('network')) return 'Network error. Please check your connection.'
    
    // Fallback to original message (but clean it up)
    return error.message || 'Something went wrong. Please try again.'
}

/**
 * Wrap a Supabase operation with error handling
 */
export async function safeQuery<T>(
    operation: () => Promise<{ data: T | null; error: SupabaseError | null }>,
    context?: string,
): Promise<{ data: T | null; error: string | null }> {
    try {
        const { data, error } = await operation()
        if (error) {
            console.error(`[FlatOS${context ? ` ${context}` : ''}]`, error)
            return { data: null, error: friendlyError(error) }
        }
        return { data, error: null }
    } catch (err) {
        console.error(`[FlatOS${context ? ` ${context}` : ''}] Unexpected:`, err)
        return { data: null, error: 'An unexpected error occurred. Please try again.' }
    }
}
