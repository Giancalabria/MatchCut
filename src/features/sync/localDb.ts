import * as SQLite from 'expo-sqlite';

import type {
  InteractionAction,
  TitleInteraction,
} from '@/src/features/interactions/api';
import type { RoomMatch, RoomSwipe, RoomVote } from '@/src/features/rooms/api';
import type { Genre, MediaType, WatchProvider } from '@/src/features/tmdb/types';

export type CachedTitleMeta = {
  media_type: MediaType;
  tmdb_id: number;
  region: string;
  title: string | null;
  poster_path: string | null;
  vote_average: number | null;
  runtime: number | null;
  genres: Genre[];
  providers: WatchProvider[];
  details_fetched_at: string | null;
  providers_fetched_at: string | null;
};

function normalizeRegion(region?: string | null): string {
  return region?.trim() ? region.trim().toUpperCase() : '*';
}

export async function getCachedTitleMeta(
  mediaType: MediaType,
  tmdbId: number,
  region?: string | null,
): Promise<CachedTitleMeta | null> {
  const db = await getDb();
  const regionKey = normalizeRegion(region);
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM tmdb_title_cache
     WHERE media_type = ? AND tmdb_id = ? AND region = ?`,
    [mediaType, tmdbId, regionKey],
  );
  if (!row) {
    return null;
  }

  let genres: Genre[] = [];
  let providers: WatchProvider[] = [];
  try {
    genres = row.genres_json ? (JSON.parse(String(row.genres_json)) as Genre[]) : [];
  } catch {
    genres = [];
  }
  try {
    providers = row.providers_json
      ? (JSON.parse(String(row.providers_json)) as WatchProvider[])
      : [];
  } catch {
    providers = [];
  }

  return {
    media_type: row.media_type as MediaType,
    tmdb_id: Number(row.tmdb_id),
    region: String(row.region),
    title: row.title == null ? null : String(row.title),
    poster_path: row.poster_path == null ? null : String(row.poster_path),
    vote_average: row.vote_average == null ? null : Number(row.vote_average),
    runtime: row.runtime == null ? null : Number(row.runtime),
    genres,
    providers,
    details_fetched_at: row.details_fetched_at == null ? null : String(row.details_fetched_at),
    providers_fetched_at:
      row.providers_fetched_at == null ? null : String(row.providers_fetched_at),
  };
}

export async function upsertCachedTitleMeta(input: {
  mediaType: MediaType;
  tmdbId: number;
  region?: string | null;
  title?: string | null;
  posterPath?: string | null;
  voteAverage?: number | null;
  runtime?: number | null;
  genres?: Genre[];
  providers?: WatchProvider[];
  touchDetails?: boolean;
  touchProviders?: boolean;
}): Promise<void> {
  const db = await getDb();
  const regionKey = normalizeRegion(input.region);
  const existing = await getCachedTitleMeta(input.mediaType, input.tmdbId, regionKey);
  const now = new Date().toISOString();

  const title = input.title !== undefined ? input.title : (existing?.title ?? null);
  const posterPath =
    input.posterPath !== undefined ? input.posterPath : (existing?.poster_path ?? null);
  const voteAverage =
    input.voteAverage !== undefined ? input.voteAverage : (existing?.vote_average ?? null);
  const runtime = input.runtime !== undefined ? input.runtime : (existing?.runtime ?? null);
  const genres = input.genres !== undefined ? input.genres : (existing?.genres ?? []);
  const providers =
    input.providers !== undefined ? input.providers : (existing?.providers ?? []);
  const detailsFetchedAt = input.touchDetails
    ? now
    : (existing?.details_fetched_at ?? null);
  const providersFetchedAt = input.touchProviders
    ? now
    : (existing?.providers_fetched_at ?? null);

  await db.runAsync(
    `INSERT INTO tmdb_title_cache
      (media_type, tmdb_id, region, title, poster_path, vote_average, runtime,
       genres_json, providers_json, details_fetched_at, providers_fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(media_type, tmdb_id, region) DO UPDATE SET
       title = excluded.title,
       poster_path = excluded.poster_path,
       vote_average = excluded.vote_average,
       runtime = excluded.runtime,
       genres_json = excluded.genres_json,
       providers_json = excluded.providers_json,
       details_fetched_at = excluded.details_fetched_at,
       providers_fetched_at = excluded.providers_fetched_at`,
    [
      input.mediaType,
      input.tmdbId,
      regionKey,
      title,
      posterPath,
      voteAverage,
      runtime,
      JSON.stringify(genres),
      JSON.stringify(providers),
      detailsFetchedAt,
      providersFetchedAt,
    ],
  );
}

export type OutboxOp = 'interaction_upsert' | 'interaction_delete_nope' | 'room_vote';

export type OutboxRow = {
  id: number;
  user_id: string;
  op: OutboxOp;
  entity_key: string;
  payload: string;
  updated_at: string;
  attempts: number;
};

const DB_NAME = 'matchcut_local.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS title_interactions (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          tmdb_id INTEGER NOT NULL,
          media_type TEXT NOT NULL,
          action TEXT NOT NULL,
          rating INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(user_id, tmdb_id, media_type)
        );

        CREATE TABLE IF NOT EXISTS room_swipes (
          id TEXT PRIMARY KEY NOT NULL,
          room_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          tmdb_id INTEGER NOT NULL,
          media_type TEXT NOT NULL,
          vote TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(room_id, user_id, tmdb_id, media_type)
        );

        CREATE TABLE IF NOT EXISTS room_matches (
          id TEXT PRIMARY KEY NOT NULL,
          room_id TEXT NOT NULL,
          tmdb_id INTEGER NOT NULL,
          media_type TEXT NOT NULL,
          matched_at TEXT NOT NULL,
          UNIQUE(room_id, tmdb_id, media_type)
        );

        CREATE TABLE IF NOT EXISTS sync_outbox (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          op TEXT NOT NULL,
          entity_key TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS tmdb_title_cache (
          media_type TEXT NOT NULL,
          tmdb_id INTEGER NOT NULL,
          region TEXT NOT NULL,
          title TEXT,
          poster_path TEXT,
          vote_average REAL,
          runtime INTEGER,
          genres_json TEXT,
          providers_json TEXT,
          details_fetched_at TEXT,
          providers_fetched_at TEXT,
          PRIMARY KEY (media_type, tmdb_id, region)
        );

        CREATE INDEX IF NOT EXISTS idx_interactions_user_action
          ON title_interactions (user_id, action, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_room_swipes_room_user
          ON room_swipes (room_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_room_matches_room
          ON room_matches (room_id, matched_at DESC);
        CREATE INDEX IF NOT EXISTS idx_outbox_user
          ON sync_outbox (user_id, id ASC);
      `);
      return db;
    })();
  }
  return dbPromise;
}

export function interactionEntityKey(userId: string, tmdbId: number, mediaType: MediaType): string {
  return `interaction:${userId}:${tmdbId}:${mediaType}`;
}

export function roomVoteEntityKey(
  roomId: string,
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
): string {
  return `room_vote:${roomId}:${userId}:${tmdbId}:${mediaType}`;
}

function mapInteraction(row: Record<string, unknown>): TitleInteraction {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    tmdb_id: Number(row.tmdb_id),
    media_type: row.media_type as MediaType,
    action: row.action as InteractionAction,
    rating: row.rating == null ? null : Number(row.rating),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapRoomSwipe(row: Record<string, unknown>): RoomSwipe {
  return {
    id: String(row.id),
    room_id: String(row.room_id),
    user_id: String(row.user_id),
    tmdb_id: Number(row.tmdb_id),
    media_type: row.media_type as MediaType,
    vote: row.vote as RoomVote,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapRoomMatch(row: Record<string, unknown>): RoomMatch {
  return {
    id: String(row.id),
    room_id: String(row.room_id),
    tmdb_id: Number(row.tmdb_id),
    media_type: row.media_type as MediaType,
    matched_at: String(row.matched_at),
  };
}

export async function listLocalInteractions(userId: string): Promise<TitleInteraction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM title_interactions WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId],
  );
  return rows.map(mapInteraction);
}

export async function listLocalInteractionsByAction(
  userId: string,
  action: InteractionAction,
): Promise<TitleInteraction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM title_interactions
     WHERE user_id = ? AND action = ?
     ORDER BY updated_at DESC`,
    [userId, action],
  );
  return rows.map(mapInteraction);
}

export async function upsertLocalInteraction(row: TitleInteraction): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO title_interactions
      (id, user_id, tmdb_id, media_type, action, rating, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, tmdb_id, media_type) DO UPDATE SET
       id = excluded.id,
       action = excluded.action,
       rating = excluded.rating,
       updated_at = excluded.updated_at
     WHERE excluded.updated_at >= title_interactions.updated_at`,
    [
      row.id,
      row.user_id,
      row.tmdb_id,
      row.media_type,
      row.action,
      row.rating,
      row.created_at,
      row.updated_at,
    ],
  );
}

/** Force-write local mutation (always wins over existing local row). */
export async function writeLocalInteraction(row: TitleInteraction): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO title_interactions
      (id, user_id, tmdb_id, media_type, action, rating, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, tmdb_id, media_type) DO UPDATE SET
       id = excluded.id,
       action = excluded.action,
       rating = excluded.rating,
       updated_at = excluded.updated_at`,
    [
      row.id,
      row.user_id,
      row.tmdb_id,
      row.media_type,
      row.action,
      row.rating,
      row.created_at,
      row.updated_at,
    ],
  );
}

export async function deleteLocalInteraction(
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM title_interactions
     WHERE user_id = ? AND tmdb_id = ? AND media_type = ?`,
    [userId, tmdbId, mediaType],
  );
}

export async function getLocalInteraction(
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<TitleInteraction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM title_interactions
     WHERE user_id = ? AND tmdb_id = ? AND media_type = ?`,
    [userId, tmdbId, mediaType],
  );
  return row ? mapInteraction(row) : null;
}

export async function countLocalUnrated(userId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM title_interactions
     WHERE user_id = ? AND action = 'seen' AND rating IS NULL`,
    [userId],
  );
  return row?.count ?? 0;
}

export async function listLocalRoomSwipes(roomId: string): Promise<RoomSwipe[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM room_swipes WHERE room_id = ? ORDER BY updated_at DESC`,
    [roomId],
  );
  return rows.map(mapRoomSwipe);
}

export async function listLocalOwnRoomSwipes(roomId: string, userId: string): Promise<RoomSwipe[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM room_swipes WHERE room_id = ? AND user_id = ? ORDER BY updated_at DESC`,
    [roomId, userId],
  );
  return rows.map(mapRoomSwipe);
}

export async function upsertLocalRoomSwipe(row: RoomSwipe, force = false): Promise<void> {
  const db = await getDb();
  if (force) {
    await db.runAsync(
      `INSERT INTO room_swipes
        (id, room_id, user_id, tmdb_id, media_type, vote, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(room_id, user_id, tmdb_id, media_type) DO UPDATE SET
         id = excluded.id,
         vote = excluded.vote,
         updated_at = excluded.updated_at`,
      [
        row.id,
        row.room_id,
        row.user_id,
        row.tmdb_id,
        row.media_type,
        row.vote,
        row.created_at,
        row.updated_at,
      ],
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO room_swipes
      (id, room_id, user_id, tmdb_id, media_type, vote, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(room_id, user_id, tmdb_id, media_type) DO UPDATE SET
       id = excluded.id,
       vote = excluded.vote,
       updated_at = excluded.updated_at
     WHERE excluded.updated_at >= room_swipes.updated_at`,
    [
      row.id,
      row.room_id,
      row.user_id,
      row.tmdb_id,
      row.media_type,
      row.vote,
      row.created_at,
      row.updated_at,
    ],
  );
}

export async function listLocalRoomMatches(roomId: string): Promise<RoomMatch[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM room_matches WHERE room_id = ? ORDER BY matched_at DESC`,
    [roomId],
  );
  return rows.map(mapRoomMatch);
}

export async function upsertLocalRoomMatch(row: RoomMatch): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO room_matches (id, room_id, tmdb_id, media_type, matched_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(room_id, tmdb_id, media_type) DO UPDATE SET
       id = excluded.id,
       matched_at = excluded.matched_at`,
    [row.id, row.room_id, row.tmdb_id, row.media_type, row.matched_at],
  );
}

export async function enqueueOutbox(input: {
  userId: string;
  op: OutboxOp;
  entityKey: string;
  payload: unknown;
}): Promise<void> {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  const payload = JSON.stringify(input.payload);

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM sync_outbox WHERE user_id = ? AND entity_key = ?`, [
      input.userId,
      input.entityKey,
    ]);
    await db.runAsync(
      `INSERT INTO sync_outbox (user_id, op, entity_key, payload, updated_at, attempts)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [input.userId, input.op, input.entityKey, payload, updatedAt],
    );
  });
}

export async function listOutbox(userId: string): Promise<OutboxRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sync_outbox WHERE user_id = ? ORDER BY id ASC`,
    [userId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    user_id: String(row.user_id),
    op: row.op as OutboxOp,
    entity_key: String(row.entity_key),
    payload: String(row.payload),
    updated_at: String(row.updated_at),
    attempts: Number(row.attempts),
  }));
}

export async function deleteOutboxRow(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sync_outbox WHERE id = ?`, [id]);
}

export async function bumpOutboxAttempts(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE sync_outbox SET attempts = attempts + 1 WHERE id = ?`, [id]);
}

export async function hasPendingOutbox(userId: string, entityKey: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_outbox WHERE user_id = ? AND entity_key = ?`,
    [userId, entityKey],
  );
  return (row?.count ?? 0) > 0;
}

export async function clearUserLocalData(userId: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM title_interactions WHERE user_id = ?`, [userId]);
    await db.runAsync(`DELETE FROM room_swipes WHERE user_id = ?`, [userId]);
    await db.runAsync(`DELETE FROM sync_outbox WHERE user_id = ?`, [userId]);
    // Matches are room-scoped; clear all cached matches on user switch for simplicity.
    await db.runAsync(`DELETE FROM room_matches`);
  });
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM title_interactions`);
    await db.runAsync(`DELETE FROM room_swipes`);
    await db.runAsync(`DELETE FROM room_matches`);
    await db.runAsync(`DELETE FROM sync_outbox`);
  });
}
