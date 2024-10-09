import { defineEventHandler, sendError, H3Event } from "h3";
import { setupDatabaseConnection } from "../../database/dbConnection";
import { fetchData } from "../../database/dbOperations";

export default defineEventHandler(async (event: H3Event) => {
  const { table } = event.context.params as { table: string };

  const {
    configDatabase,
    database,
    dbHost,
    dbUser,
    dbPassword,
    dbPort,
    dbSsl,
    isSqlite,
    sqliteDbPath,
  } = useRuntimeConfig() as unknown as {
    configDatabase: string;
    database: string;
    dbHost: string;
    dbUser: string;
    dbPassword: string;
    dbPort: string;
    dbSsl: boolean;
    isSqlite: boolean;
    sqliteDbPath: string;
  };

  const configDb = await setupDatabaseConnection(
    /* isConfigDb */ true,
    isSqlite,
    sqliteDbPath,
    configDatabase,
    database,
    dbHost,
    dbUser,
    dbPassword,
    dbPort,
    dbSsl,
  );

  if (!configDb) {
    throw new Error("Failed to connect to configDb");
  }

  const db = await setupDatabaseConnection(
    /* isConfigDb */ false,
    isSqlite,
    sqliteDbPath,
    database,
    database,
    dbHost,
    dbUser,
    dbPassword,
    dbPort,
    dbSsl,
  );

  try {
    const { mainData, columnsData } = await fetchData(db, table, isSqlite);
    return { data: mainData, columns: columnsData };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching data on API side:", error.message);
      return sendError(event, new Error(error.message));
    } else {
      console.error("Unknown error fetching data on API side:", error);
      return sendError(event, new Error("An unknown error occurred"));
    }
  }
});
