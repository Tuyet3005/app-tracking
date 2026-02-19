import { count, eq } from "drizzle-orm";
import { type SessionData, Store } from "express-session";
import { db, schema } from "./db/index.js";

type Callback = (_err?: unknown, _data?: any) => any;
function optionalCb(err: unknown, data: unknown, cb?: Callback) {
  if (cb) return cb(err, data);
  if (err) throw err;
  return data;
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

type RawSessionData = typeof schema.sessions.$inferSelect;

const parseSession = (
  s: RawSessionData | RawSessionData[] | undefined | null,
): SessionData | SessionData[] | null => {
  if (!s) return null;

  if (Array.isArray(s)) {
    return s.map((i) => parseSession(i) as SessionData);
  }

  return {
    userId: s.userId,
    cookie: JSON.parse(s.cookies),
    ...JSON.parse(s.sessionData),
  } satisfies SessionData;
};

export class DrizzleStore extends Store {
  constructor() {
    super();
  }

  // This optional method is used to get all sessions in the store as an array.
  // The callback should be called as callback(error, sessions).
  override async all(cb?: Callback) {
    try {
      const sessions = await db.select().from(schema.sessions);

      return optionalCb(null, parseSession(sessions), cb);
    } catch (err) {
      return optionalCb(err, null, cb);
    }
  }

  // This required method is used to destroy/delete a session from the store given a session ID (sid).
  // The callback should be called as callback(error) once the session is destroyed.
  async destroy(sid: string, cb?: Callback) {
    try {
      await db.delete(schema.sessions).where(eq(schema.sessions.id, sid));
      return optionalCb(null, null, cb);
    } catch (err) {
      return optionalCb(err, null, cb);
    }
  }

  // This optional method is used to delete all sessions from the store.
  // The callback should be called as callback(error) once the store is cleared.
  override async clear(cb?: Callback) {
    try {
      await db.delete(schema.sessions);
      return optionalCb(null, null, cb);
    } catch (err) {
      return optionalCb(err, null, cb);
    }
  }

  // This optional method is used to get the count of all sessions in the store.
  // The callback should be called as callback(error, len).
  override async length(cb?: Callback) {
    try {
      const countResult = await db
        .select({ count: count() })
        .from(schema.sessions)
        .get();
      return optionalCb(null, countResult?.count ?? 0, cb);
    } catch (err) {
      return optionalCb(err, null, cb);
    }
  }

  // This required method is used to get a session from the store given a session ID (sid).
  // The callback should be called as callback(error, session).
  // The session argument should be a session if found,
  // otherwise null or undefined if the session was not found (and there was no error).
  // A special case is made when error.code === 'ENOENT' to act like callback(null, null).
  async get(sid: string, cb?: Callback) {
    try {
      const session = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, sid))
        .limit(1)
        .get();

      return optionalCb(null, parseSession(session), cb);
    } catch (err) {
      return optionalCb(err, null, cb);
    }
  }

  // This required method is used to upsert a session into the store
  // given a session ID (sid) and session (session) object.
  // The callback should be called as callback(error) once the session has been set in the store.
  async set(sid: string, sess: SessionData, cb?: Callback) {
    const { expiresAt, isExpired } = this.getExpiresAt(sess);
    const { cookie, ...sessionData } = sess;

    try {
      if (isExpired) {
        return this.destroy(sid, cb);
      }

      await db
        .insert(schema.sessions)
        .values({
          id: sid,
          userId: sess.userId || null,
          cookies: JSON.stringify(cookie),
          sessionData: JSON.stringify(sessionData),
          expiresAt,
        })
        .onConflictDoUpdate({
          target: schema.sessions.id,
          set: {
            userId: sess.userId || null,
            cookies: JSON.stringify(cookie),
            sessionData: JSON.stringify(sessionData),
            expiresAt,
          },
        });

      return optionalCb(null, null, cb);
    } catch (err) {
      return optionalCb(err, null, cb);
    }
  }

  // This recommended method is used to "touch" a given session
  // given a session ID (sid) and session (session) object.
  // The callback should be called as callback(error) once the session has been touched.
  // This is primarily used when the store will automatically delete idle sessions
  // and this method is used to signal to the store the given session is active,
  // potentially resetting the idle timer.
  override async touch(sid: string, sess: SessionData, cb?: Callback) {
    const newCookies: SessionData["cookie"] = { ...sess.cookie, expires: null };
    const { expiresAt } = this.getExpiresAt({
      ...sess,
      cookie: newCookies,
    });
    newCookies.expires = new Date(expiresAt * 1000);

    try {
      await db
        .update(schema.sessions)
        .set({ expiresAt, cookies: JSON.stringify(newCookies) })
        .where(eq(schema.sessions.id, sid));

      return optionalCb(null, null, cb);
    } catch (err) {
      return optionalCb(err, null, cb);
    }
  }

  private getExpiresAt(sess: SessionData) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = sess.cookie?.expires
      ? Math.floor(new Date(sess.cookie.expires).getTime() / 1000)
      : now + 24 * 60 * 60; // Default to 1 day

    return {
      expiresAt,
      isExpired: expiresAt < now,
    };
  }
}
