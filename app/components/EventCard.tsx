import Link from "next/link";
import { EventDateFormatter } from "./EventDateFormatter";
import { Prisma } from "@prisma/client";

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold mb-2 text-gray-900 line-clamp-2">{event.name}</h3>
            
            <EventDateFormatter 
                startsAt={event.startsAt}
                endsAt={event.endsAt}
                submissionsOpenAt={event.submissionsOpenAt}
                submissionsCloseAt={event.submissionsCloseAt}
                timeZone={event.timeZone}
                className="mb-4"
            />

            <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">
                {event.description || "No description provided."}
            </p>

            <div className="flex justify-between items-center text-sm text-gray-500 mb-6 mt-auto">
                <div>
                    <span className="font-semibold text-gray-700">{event._count.tracks}</span> track{event._count.tracks !== 1 ? 's' : ''}
                </div>
                {event.prizes.length > 0 && (
                    <div className="text-right">
                        {/* We only show one top prize info or a general hint since summing them might not be meaningful if currencies differ or prizes are non-monetary */}
                        <span className="font-semibold text-green-700">Prizes available</span>
                    </div>
                )}
            </div>

            <Link href={`/events/${event.id}`} className="block w-full text-center py-2 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                View event
            </Link>
        </div>
    );
}
