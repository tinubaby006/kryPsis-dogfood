import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { reviewProposal } from "@/app/actions/admin-proposals";
import { revalidatePath } from "next/cache";

export default async function AdminProposalsPage() {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.isPlatformAdmin) redirect("/");

    const proposals = await prisma.eventProposal.findMany({
        where: { status: "SUBMITTED" },
        include: { applicant: true },
        orderBy: { submittedAt: "desc" }
    });

    async function handleReview(formData: FormData) {
        "use server";
        const proposalId = formData.get("proposalId") as string;
        const revision = parseInt(formData.get("revision") as string, 10);
        const action = formData.get("action") as "APPROVE" | "REJECT";
        const reason = formData.get("reason") as string;
        await reviewProposal(proposalId, revision, action, reason);
        revalidatePath("/admin/proposals");
    }

    return (
        <div className="py-10 px-4 md:px-8 max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold font-heading text-foreground">Review Event Proposals</h1>
            {proposals.length === 0 ? (
                <p className="text-muted-foreground">No pending proposals.</p>
            ) : (
                <div className="space-y-4">
                    {proposals.map(p => (
                        <div key={p.id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold">{p.name}</h2>
                            <p className="text-sm text-muted-foreground mb-4">Slug: {p.proposedSlug} | Applicant: {p.applicant.name}</p>
                            <p className="mb-4">{p.description}</p>
                            <form action={handleReview} className="flex gap-2">
                                <input type="hidden" name="proposalId" value={p.id} />
                                <input type="hidden" name="revision" value={p.revision} />
                                <input type="text" name="reason" placeholder="Reason (optional)" className="border rounded p-2 text-sm flex-1" />
                                <button type="submit" name="action" value="APPROVE" className="bg-success text-success-foreground px-4 py-2 rounded">Approve</button>
                                <button type="submit" name="action" value="REJECT" className="bg-destructive text-destructive-foreground px-4 py-2 rounded">Reject</button>
                            </form>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
