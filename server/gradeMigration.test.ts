import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { migrateGradeRange } from "./database";

it("expands existing grade constraints without losing learners or dependent records", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE learners(id TEXT PRIMARY KEY,name TEXT NOT NULL,grade INTEGER NOT NULL CHECK (grade IN (6, 7, 8)),context TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE history(id TEXT PRIMARY KEY,learner_id TEXT REFERENCES learners(id));
      INSERT INTO learners VALUES('existing','Existing learner',6,'independent','2026-09-10');
      INSERT INTO history VALUES('history','existing');`);
    migrateGradeRange(db);
    db.prepare("INSERT INTO learners VALUES(?,?,?,?,?)").run("primary","Primary learner",1,"independent","2026-09-10");
    expect(db.prepare("SELECT * FROM history WHERE learner_id='existing'").get()).toBeDefined();
    expect(db.prepare("SELECT COUNT(*) AS count FROM learners").get()?.count).toBe(2);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(() => db.exec("INSERT INTO history VALUES('invalid','absent')")).toThrow();
    migrateGradeRange(db);
  } finally { db.close(); }
});
