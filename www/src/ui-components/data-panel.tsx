import React, { useEffect, useState, useRef } from "react"
import { registerDataListener } from "../data-listeners"

type DataValues = Record<string, string | number>

interface Position {
    x: number
    y: number
}

export function DataPanel() {
    const [data, setData] = useState<DataValues>({})
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const unsubscribe = registerDataListener((incomingData: unknown) => {
            if (incomingData && typeof incomingData === "object") {
                setData((prevData) => ({
                    ...prevData,
                    ...incomingData,
                }))
            }
        })

        return () => {
            unsubscribe()
        }
    }, [])

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!panelRef.current) return

        const rect = panelRef.current.getBoundingClientRect()
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        })
        setIsDragging(true)
    }

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return

        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y

        setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove)
            window.addEventListener("mouseup", handleMouseUp)

            return () => {
                window.removeEventListener("mousemove", handleMouseMove)
                window.removeEventListener("mouseup", handleMouseUp)
            }
        }
    }, [isDragging, dragOffset])

    const panelItems = [
        { label: "IAS", key: "ias", unit: "kn" },
        { label: "TAS", key: "tas", unit: "kn" },
        { label: "Heading", key: "mag-heading", unit: "°" },
        { label: "Altitude", key: "altitude", unit: "ft" },
        { label: "Latitude", key: "lat", unit: "°" },
        { label: "Longitude", key: "lon", unit: "°" },
        { label: "Gear", key: "gear" },
        { label: "Parking Brake", key: "parking-brake" },
    ]

    const formatValue = (value: unknown): string | number => {
        if (value === undefined || value === null) return "—"
        if (typeof value === "number") {
            return Math.round(value * 10) / 10
        }
        return String(value)
    }

    const panelStyle: React.CSSProperties = {
        position: "fixed",
        left: position.x !== 0 ? `${position.x}px` : undefined,
        top: position.y !== 0 ? `${position.y}px` : undefined,
        right: position.x === 0 && position.y === 0 ? 0 : undefined,
        cursor: isDragging ? "grabbing" : "grab",
    }

    return (
        <div
            ref={panelRef}
            className="data-panel"
            style={panelStyle}
            onMouseDown={handleMouseDown}
        >
            {panelItems.map((item) => (
                <div key={item.key} className="data">
                    <div className="data-item">{item.label}</div>
                    <span className="data-value">
                        {formatValue(data[item.key])}
                    </span>
                    {item.unit && (
                        <span className="data-unit"> {item.unit}</span>
                    )}
                </div>
            ))}
        </div>
    )
}
