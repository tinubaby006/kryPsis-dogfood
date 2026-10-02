export default function Loading() {
    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-muted rounded-full"></div>
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute inset-0"></div>
            </div>
            <div className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
                Loading...
            </div>
        </div>
    );
}
