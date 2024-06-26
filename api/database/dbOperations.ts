const checkTableExists = (
  db: any,
  table: string | undefined,
  isSQLite: string | undefined,
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    let query: string;
    if (isSQLite === "YES") {
      query = `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`;
      db.all(query, (err: Error, rows: any[]) => {
        if (err) reject(err);
        resolve(rows.length > 0);
      });
    } else {
      query = `SELECT to_regclass('${table}')`;
      db.query(query, (err: Error, result: { rows: any[] }) => {
        if (err) reject(err);
        resolve(result.rows[0].to_regclass !== null);
      });
    }
  });
};

const fetchDataFromTable = async (
  db: any,
  table: string | undefined,
  isSQLite: string | undefined,
): Promise<any[]> => {
  let query: string;
  if (isSQLite === "YES") {
    query = `SELECT * FROM ${table}`;
    return new Promise((resolve, reject) => {
      db.all(query, (err: Error, rows: any[]) => {
        if (err) reject(err);
        if (
          rows.length > 0 &&
          Object.keys(rows[0]).some((key) => isNaN(Number(key)))
        ) {
          rows.shift();
        }
        resolve(rows);
      });
    });
  } else {
    query = `SELECT * FROM ${table}`;
    return new Promise((resolve, reject) => {
      db.query(query, (err: Error, result: { rows: any[] }) => {
        if (err) reject(err);
        resolve(result.rows);
      });
    });
  }
};

const fetchData = async (
  db: any,
  table: string | undefined,
  isSQLite: string | undefined,
): Promise<{
  mainData: any[];
  columnsData: any[] | null;
  metadata: any[] | null;
}> => {
  console.log("Fetching data from", table, "...");
  // Fetch data
  const mainDataExists = await checkTableExists(db, table, isSQLite);
  let mainData = null;
  if (mainDataExists) {
    mainData = await fetchDataFromTable(db, table, isSQLite);
  } else {
    throw new Error("Main table does not exist");
  }

  // Fetch mapping columns
  const columnsTable = `${table}__columns`;
  const columnsTableExists = await checkTableExists(db, columnsTable, isSQLite);
  let columnsData = null;
  if (columnsTableExists) {
    columnsData = await fetchDataFromTable(db, columnsTable, isSQLite);
  }

  // Fetch metadata
  const metadataTable = `${table}__metadata`;
  const metadataTableExists = await checkTableExists(
    db,
    metadataTable,
    isSQLite,
  );
  let metadata = null;
  if (metadataTableExists) {
    metadata = await fetchDataFromTable(db, metadataTable, isSQLite);
  }

  console.log("Successfully fetched data from", table, "!");

  return { mainData, columnsData, metadata };
};

export default fetchData;
