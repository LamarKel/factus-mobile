export default function AppSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex animate-pulse">
            {/* Sidebar (desktop) */}
            <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0">
                <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="h-4 w-20 rounded bg-gray-200" />
                </div>
                <div className="flex-1 p-3 space-y-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="h-9 rounded-xl bg-gray-100" />
                    ))}
                </div>
            </aside>

            <div className="flex-1 flex flex-col lg:ml-56 min-h-screen">
                {/* Topbar */}
                <div className="h-14 px-4 flex items-center gap-3 bg-white border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 lg:hidden" />
                    <div className="h-4 w-24 rounded bg-gray-200" />
                </div>

                {/* Contenido */}
                <div className="flex-1 p-4 lg:p-6 space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100" />
                        ))}
                    </div>
                    <div className="h-48 rounded-2xl bg-white border border-gray-100" />
                    <div className="h-32 rounded-2xl bg-white border border-gray-100" />
                </div>
            </div>

            {/* Bottom nav (móvil) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100" />
        </div>
    );
}
