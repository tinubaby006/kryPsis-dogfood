import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
            <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Project Not Found</h2>
            <p className="text-gray-600 max-w-md mb-8">
                The project you are looking for does not exist, has not been submitted yet, or you do not have permission to view it.
            </p>
            <Link href="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
                Return Home
            </Link>
        </div>
    );
}
