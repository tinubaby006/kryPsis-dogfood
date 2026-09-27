import { z } from "zod";

export const createEventSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  submissionsOpenAt: z.string().optional().nullable(),
  submissionsCloseAt: z.string().min(1, "Deadline is required"),
  visibility: z.enum(["DRAFT", "PUBLIC"]).default("DRAFT"),
  maxTeamSize: z.coerce.number().min(1).max(20).default(4),
}).superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt) {
        if (new Date(data.startsAt) > new Date(data.endsAt)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "startsAt must be before endsAt",
                path: ["startsAt"]
            });
        }
    }
    if (data.submissionsOpenAt && data.submissionsCloseAt) {
        if (new Date(data.submissionsOpenAt) >= new Date(data.submissionsCloseAt)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "submissionsOpenAt must be strictly before submissionsCloseAt",
                path: ["submissionsOpenAt"]
            });
        }
    }
});

export const updateTrackSchema = z.object({
    id: z.string().optional(), // If no ID, it's new
    name: z.string().min(1, "Track name is required"),
    description: z.string().optional(),
    sortOrder: z.coerce.number().default(0),
});

export const updatePrizeSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Prize name is required"),
    description: z.string().optional(),
    amount: z.coerce.number().min(0).optional(),
    currency: z.string().optional(),
    sortOrder: z.coerce.number().default(0),
}).superRefine((data, ctx) => {
    if ((data.amount !== undefined) && !data.currency) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Currency is required if amount is set",
            path: ["currency"]
        });
    }
});

export const updateCustomQuestionSchema = z.object({
    id: z.string().optional(),
    key: z.string().min(1).regex(/^[a-zA-Z0-9_]+$/),
    label: z.string().min(1),
    type: z.enum(["TEXT", "LONG_TEXT", "URL", "NUMBER", "SELECT", "BOOLEAN"]),
    required: z.boolean().default(false),
    options: z.any().optional(), // Should be string[] for SELECT
    isPublic: z.boolean().default(false),
    sortOrder: z.coerce.number().default(0),
});
