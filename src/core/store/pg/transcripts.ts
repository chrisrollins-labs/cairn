import type { Transcript, TranscriptStore } from "@/core/ai/transcript";
import type { AiFlow, AiMessage } from "@/core/ai/types";
import type { QueryExecutor } from "@/core/db/executor";

interface TranscriptRow {
  id: string;
  owner_id: string;
  flow: AiFlow;
  model: string;
  provider: string;
  prompt_template_id: string;
  prompt_template_version: number;
  messages: AiMessage[];
  response: string;
  prompt_tokens: number;
  completion_tokens: number;
  zero_data_retention: boolean;
  created_at: string;
}

const COLUMNS =
  "id, owner_id, flow, model, provider, prompt_template_id, prompt_template_version, " +
  "messages, response, prompt_tokens, completion_tokens, zero_data_retention, created_at";

function mapRow(r: TranscriptRow): Transcript {
  return {
    id: r.id,
    ownerId: r.owner_id,
    flow: r.flow,
    model: r.model,
    provider: r.provider,
    promptTemplateId: r.prompt_template_id,
    promptTemplateVersion: r.prompt_template_version,
    messages: r.messages,
    response: r.response,
    usage: { promptTokens: r.prompt_tokens, completionTokens: r.completion_tokens },
    zeroDataRetention: r.zero_data_retention,
    createdAt: Number(r.created_at),
  };
}

export class PgTranscriptStore implements TranscriptStore {
  constructor(private readonly db: QueryExecutor) {}

  async insert(t: Transcript): Promise<void> {
    await this.db.query(
      `insert into public.transcripts (${COLUMNS})
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        t.id,
        t.ownerId,
        t.flow,
        t.model,
        t.provider,
        t.promptTemplateId,
        t.promptTemplateVersion,
        JSON.stringify(t.messages),
        t.response,
        t.usage.promptTokens,
        t.usage.completionTokens,
        t.zeroDataRetention,
        t.createdAt,
      ],
    );
  }

  async get(ownerId: string, id: string): Promise<Transcript | null> {
    const { rows } = await this.db.query<TranscriptRow>(
      `select ${COLUMNS} from public.transcripts where owner_id = $1 and id = $2`,
      [ownerId, id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }
}
