export type DataListener = (data: unknown) => void

const listeners: Set<DataListener> = new Set()

export function registerDataListener(listener: DataListener): () => void {
    listeners.add(listener)

    // Return unsubscribe function
    return () => {
        listeners.delete(listener)
    }
}

export function broadcastData(data: unknown): void {
    listeners.forEach((listener) => {
        try {
            listener(data)
        } catch (error) {
            console.error("Error in data listener", error)
        }
    })
}
