// app/models/directoryUsers.server.ts

import { client } from "~/utils/db.server";

export interface DirectoryUser {
  id: number;
  directory_id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieve all users associated with a given directory.
 */
export async function getDirectoryUsers(
  directoryId: number
): Promise<DirectoryUser[]> {
  const result = await client.query<DirectoryUser>(
    `
    SELECT *
    FROM directory_users
    WHERE directory_id = $1
    ORDER BY username ASC
  `,
    [directoryId]
  );
  return result.rows;
}
