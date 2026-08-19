import { z } from 'zod';

export const keyListSchema = z
  .array(z.string().min(1).max(200))
  .max(5000, 'Too many keys in one request; send them in batches of 5000.');

export const lookupRequestSchema = z.object({
  keys: keyListSchema,
});

export const registerCatalogsSchema = z.object({
  keys: keyListSchema,
});

export const createImportSchema = z.object({
  kind: z.enum(['jira_csv', 'catalog_csv', 'list_csv']),
  filename: z.string().max(500).optional(),
});

export const updateImportSchema = z.object({
  status: z.enum(['running', 'ok', 'error']),
  rowCount: z.number().int().nonnegative().optional(),
  ticketCount: z.number().int().nonnegative().optional(),
  keyCount: z.number().int().nonnegative().optional(),
  error: z.string().max(2000).nullable().optional(),
});

const parsedTicketSchema = z.object({
  ticketKey: z.string().min(1).max(100),
  summary: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  issueType: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  reporter: z.string().nullable().optional(),
  jiraCreatedAt: z.string().nullable().optional(),
  jiraUpdatedAt: z.string().nullable().optional(),
  // Tolerant of nulls: a single ragged CSV field must never 400 a whole batch.
  raw: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).default({}),
  keys: z
    .array(
      z.object({
        key: z.string().min(1).max(200),
        column: z.string().max(300),
        rawMatch: z.string().max(200),
      })
    )
    .max(2000),
});

export const importJiraBatchSchema = z.object({
  importId: z.coerce.number().int().positive().nullable().optional(),
  dryRun: z.boolean().default(false),
  batch: z.array(parsedTicketSchema).min(1).max(500),
});

export const createListSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  source: z.enum(['manual', 'csv']).default('manual'),
  items: z
    .array(
      z.object({
        key: z.string().min(1).max(200),
        rawInput: z.string().max(200).optional(),
        note: z.string().max(500).nullable().optional(),
      })
    )
    .max(5000),
});

export const updateListSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const repeatsQuerySchema = z.object({
  minLists: z.coerce.number().int().min(0).default(0),
  country: z.enum(['USA', 'BRA', 'MEX']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type ParsedTicket = z.infer<typeof parsedTicketSchema>;
export type ImportJiraBatch = z.infer<typeof importJiraBatchSchema>;
export type CreateListInput = z.infer<typeof createListSchema>;
