"use client";

import React, { useEffect, useState } from 'react';

type DateFormatterProps = {
    startsAt?: Date | null;
    endsAt?: Date | null;
    submissionsOpenAt?: Date | null;
    submissionsCloseAt: Date;
    timeZone: string;
    showStatus?: boolean;
    showAbsolute?: boolean;
    className?: string;
};

export function EventDateFormatter({
    startsAt,
    endsAt,
    submissionsOpenAt,
    submissionsCloseAt,
    timeZone,
    showStatus = true,
    showAbsolute = true,
    className = ""
}: DateFormatterProps) {
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const formatOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: timeZone || 'UTC'
    };

    let formattedDate = "";
    try {
        formattedDate = new Intl.DateTimeFormat('en-US', formatOptions).format(submissionsCloseAt);
    } catch (e) {
        // Fallback if timezone is invalid
        formatOptions.timeZone = 'UTC';
        formattedDate = new Intl.DateTimeFormat('en-US', formatOptions).format(submissionsCloseAt);
    }

    if (!now) {
        // Server-side rendering or initial hydration
        return (
            <div className={className}>
                {showStatus && <span className="font-semibold text-gray-500">Loading status...</span>}
                {showAbsolute && <div className="text-sm text-gray-600">{formattedDate} ({timeZone})</div>}
            </div>
        );
    }

    let statusLabel = "";
    let statusClass = "";

    if (submissionsOpenAt && now < submissionsOpenAt) {
        let openFormatted = "";
        try {
            openFormatted = new Intl.DateTimeFormat('en-US', formatOptions).format(submissionsOpenAt);
        } catch (e) {
            openFormatted = submissionsOpenAt.toLocaleString();
        }
        statusLabel = `Opens ${openFormatted}`;
        statusClass = "text-blue-700 bg-blue-100";
    } else if (now < submissionsCloseAt) {
        statusLabel = `Submissions open; closes ${formattedDate}`;
        statusClass = "text-green-700 bg-green-100";
    } else {
        statusLabel = `Submissions closed ${formattedDate}`;
        statusClass = "text-red-700 bg-red-100";
    }

    if (!submissionsCloseAt) {
        statusLabel = "Schedule unavailable";
        statusClass = "text-red-700 bg-red-100";
    }

    return (
        <div className={className}>
            {showStatus && (
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusClass}`}>
                    {statusLabel}
                </span>
            )}
            {showAbsolute && (
                <div className="text-sm text-gray-600 mt-1">
                    Deadline: {formattedDate}
                </div>
            )}
        </div>
    );
}
