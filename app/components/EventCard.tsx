import Link from "next/link";
import { EventDateFormatter } from "./EventDateFormatter";

type EventCardProps = {
    event: {
        id: string;
        name: string;
        description: string | null;
        startsAt: Date | null;
        endsAt: Date | null;
        submissionsOpenAt: Date | null;
        submissionsCloseAt: Date;
        timeZone: string;
        prizes: { amount: string | null, currency: string | null }[];
        _count: { tracks: number };
    }
};

export function EventCard({ event }: EventCardProps) {
    return (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col h-full hover:border-primary/50 transition-colors group">
            <h3 className="text-xl font-bold mb-2 text-foreground line-clamp-2 font-heading group-hover:text-primary transition-colors">{event.name}</h3>
            
            <EventDateFormatter 
                startsAt={event.startsAt}
                endsAt={event.endsAt}
                submissionsOpenAt={event.submissionsOpenAt}
                submissionsCloseAt={event.submissionsCloseAt}
                timeZone={event.timeZone}
                className="mb-4"
            />

            <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                {event.description || "No description provided."}
            </p>

            <div className="flex justify-between items-center text-sm text-muted-foreground mb-6 mt-auto">
                <div>
                    <span className="font-semibold text-foreground">{event._count.tracks}</span> track{event._count.tracks !== 1 ? 's' : ''}
                </div>
                {event.prizes.length > 0 && (
                    <div className="text-right">
                        <span className="font-semibold text-success">Prizes available</span>
                    </div>
                )}
            </div>

            <Link href={`/events/${event.id}`} className="block w-full text-center py-2.5 px-4 bg-muted border border-border text-foreground rounded-md font-medium hover:bg-muted-foreground/20 transition-colors text-sm">
                View event
            </Link>
        </div>
    );
}
