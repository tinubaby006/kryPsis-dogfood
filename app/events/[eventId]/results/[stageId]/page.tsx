import { prisma } from "@/lib/db";
import { Trophy, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PublicResults({ params }: { params: Promise<{ eventId: string, stageId: string }> }) {
    const { eventId, stageId } = await params;

    const stage = await prisma.judgingStage.findUnique({
        where: { id: stageId, eventId },
        include: { event: true, track: true }
    });

    if (!stage) notFound();

    // Secure checking: the payload must be published.
    if (!stage.publishedSnapshotId) {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-8 text-center pt-20">
                <ShieldCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-foreground mb-2">Results Embargoed</h1>
                <p className="text-muted-foreground">The results for {stage.name} have not yet been released to the public. Please check back later.</p>
                <div className="mt-8">
                    <Link href={`/`} className="text-link hover:underline font-medium">Return Home</Link>
                </div>
            </div>
        );
    }

    const snapshot = await prisma.finalizationSnapshot.findUnique({
        where: { id: stage.publishedSnapshotId },
        include: { 
            calculationRun: { 
                include: { projectResults: { include: { project: true } } } 
            } 
        }
    });

    if (!snapshot || !snapshot.calculationRun) notFound();

    const run = snapshot.calculationRun;
    const results = run.projectResults.sort((a,b) => (a.rank||0) - (b.rank||0));

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-foreground flex items-center justify-center gap-3 mb-2">
                    <Trophy className="w-10 h-10 text-warning" /> 
                    {stage.name} Results
                </h1>
                <p className="text-muted-foreground">
                    {stage.event.name} {stage.track && `— ${stage.track.name}`}
                </p>
            </div>

            <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted text-muted-foreground uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Rank</th>
                                <th className="px-6 py-4">Project</th>
                                {(stage.outputPolicy as any)?.publicScoreVisible && (
                                    <th className="px-6 py-4 text-right">Score</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {results.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                                        No placements available.
                                    </td>
                                </tr>
                            )}
                            {results.map((r: any) => (
                                <tr key={r.projectId} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {r.rank === 1 && <Trophy className="w-5 h-5 text-warning mr-2" />}
                                            {r.rank === 2 && <Trophy className="w-5 h-5 text-slate-400 mr-2" />}
                                            {r.rank === 3 && <Trophy className="w-5 h-5 text-amber-600 mr-2" />}
                                            <span className={`font-bold text-lg ${r.rank <= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                #{r.rank}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-foreground text-lg">{r.project.title || 'Untitled Project'}</div>
                                        <div className="text-sm text-muted-foreground font-mono">{r.projectId}</div>
                                    </td>
                                    {(stage.outputPolicy as any)?.publicScoreVisible && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center justify-center bg-primary/10 text-primary font-bold px-4 py-2 rounded-full text-lg border border-primary/20">
                                                {r.displayedMean.toFixed(2)}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {run.method === "PAIR_OVERLAP_WLS" && (
                <div className="mt-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Officially Verified & Calibrated Results
                </div>
            )}
        </div>
    );
}
