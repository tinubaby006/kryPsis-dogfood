import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AcceptInviteForm } from "./AcceptInviteForm";

export default async function InvitePreviewPage({ params }: { params: Promise<{ token: string }> }) {
    const session = await getSession();
    const { token } = await params;
    
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = await prisma.teamInvite.findUnique({
        where: { tokenHash },
        include: {
            team: { include: { event: true, members: true } }
        }
    });

    if (!invite) notFound();

    const isRevoked = !!invite.revokedAt;
    const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
    const isFull = invite.uses >= invite.maxUses;
    const teamFull = invite.team.members.length >= invite.team.event.maxTeamSize;

    const error = isRevoked ? "This invitation has been revoked by the team owner." :
                  isExpired ? "This invitation link has expired." :
                  isFull ? "This invitation link has reached its maximum number of uses." :
                  teamFull ? "This team is already at maximum capacity." : null;

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
            <div className="bg-card p-10 rounded-xl border border-border shadow-sm text-center max-w-2xl w-full">
                <h1 className="text-3xl font-bold mb-4 font-heading text-foreground">Team Invitation</h1>
                
                {error ? (
                    <div className="mt-8 p-6 bg-destructive/10 text-destructive-text rounded-lg border border-destructive/20 text-sm font-medium">
                        <p>{error}</p>
                    </div>
                ) : (
                    <>
                        <p className="text-muted-foreground mb-10 text-lg">
                            You have been invited to join the team <span className="font-bold text-foreground">{invite.team.name}</span> for the event <span className="font-bold text-foreground">{invite.team.event.name}</span>.
                        </p>
                        
                        {!session?.user ? (
                            <div className="p-8 bg-warning/10 text-warning-foreground rounded-lg border border-warning/20">
                                <p className="mb-6 font-medium text-warning text-lg">You must be logged in to accept this invitation.</p>
                                <Link href={`/sign-in?callbackUrl=/invite/${token}`} className="bg-warning text-warning-foreground px-6 py-3 rounded-md font-medium hover:bg-warning/90 transition-colors shadow-sm inline-block">
                                    Sign In or Create Account
                                </Link>
                            </div>
                        ) : (
                            <AcceptInviteForm token={token} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
