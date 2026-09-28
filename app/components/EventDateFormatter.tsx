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
                {showStatus && <span className="font-semibold text-muted-foreground">Loading status...</span>}
                {showAbsolute && <div className="text-sm text-muted-foreground">{formattedDate} ({timeZone})</div>}
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
        statusClass = "text-warning bg-warning/10 border border-warning/20";
    } else if (now < submissionsCloseAt) {
        statusLabel = `Submissions open; closes ${formattedDate}`;
        statusClass = "text-success bg-success/10 border border-success/20";
    } else {
        statusLabel = `Submissions closed ${formattedDate}`;
        statusClass = "text-destructive-text bg-destructive/10 border border-destructive/20";
    }

    if (!submissionsCloseAt) {
        statusLabel = "Schedule unavailable";
        statusClass = "text-destructive-text bg-destructive/10 border border-destructive/20";
    }

    return (
        <div className={className}>
            {showStatus && (
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusClass}`}>
                    {statusLabel}
                </span>
            )}
            {showAbsolute && (
                <div className="text-sm text-muted-foreground mt-2">
                    Deadline: {formattedDate}
                </div>
            )}
        </div>
    );
}
