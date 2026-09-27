import Link from "next/link";

export default function JudgeStubPage({ params }: { params: Promise<{ eventId: string }> }) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Judging Dashboard</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl">
                Judge landing states T2 is not implemented.
            </p>
            <div className="space-x-4">
                <Link href="/" className="text-blue-600 hover:underline font-medium">Return Home</Link>
            </div>
        </div>
    );
}
