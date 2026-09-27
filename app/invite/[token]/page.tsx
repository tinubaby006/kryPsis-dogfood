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
        <div className="container mx-auto py-20 px-4 max-w-2xl">
            <div className="bg-white p-10 rounded-xl shadow border text-center">
                <h1 className="text-3xl font-bold mb-2">Team Invitation</h1>
                
                {error ? (
                    <div className="mt-8 p-6 bg-red-50 text-red-800 rounded-lg border border-red-200">
                        <p className="font-semibold text-lg">{error}</p>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-600 mb-8">
                            You have been invited to join the team <span className="font-bold text-black">{invite.team.name}</span> for the event <span className="font-bold text-black">{invite.team.event.name}</span>.
                        </p>
                        
                        {!session?.user ? (
                            <div className="p-6 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                                <p className="mb-4 font-medium">You must be logged in to accept this invitation.</p>
                                <Link href={`/sign-in?callbackUrl=/invite/${token}`} className="bg-yellow-600 text-white px-6 py-2 rounded font-medium hover:bg-yellow-700">
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
