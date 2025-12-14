export function AnnuniciatorContainer({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <div className="control-annunciator-container">
            <div className="control-annunciator-light-label">{title}</div>
            {children}
        </div>
    )
}
