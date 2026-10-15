# Database Backup & Restore Utility

A utility script `dbBackupRestore.js` is available to perform database backups and restorations for the following collections:
*   **Admins** (`Admin`)
*   **Products** (`Product`)
*   **Quotations** (`Quotation`)
*   **Settings** (`Setting`)

Backup files are saved in JSON format under the `./backups` directory.

---

## Commands

You can run the backup utility using `npm` commands inside the `backend` directory:

### 1. Perform a Database Backup
```bash
npm run db:backup
```
*   **Description**: Connects to the database, reads all records from the collections, and exports them to a timestamped JSON file.
*   **Output Path**: `./backups/backup_YYYY-MM-DDTHH-mm-ss-SSSZ.json`

### 2. Restore Database from a Backup File
```bash
npm run db:restore -- <backup_filename_or_path>
```
*   **Description**: Overwrites existing database records in the targeted collections with the data found in the backup file.
*   **Warning**: This operation will delete all existing data in those collections before importing.
*   **Example**:
    ```bash
    npm run db:restore -- backup_2026-07-10T11-20-00.json
    ```

---

## Manual CLI Execution

If you prefer to run the utility script directly via Node:

*   **Backup**:
    ```bash
    node dbBackupRestore.js --backup
    # or
    node dbBackupRestore.js -b
    # or
    npm run db:backup
    ```

*   **Restore**:
    ```bash
    node dbBackupRestore.js --import <filename_or_path>
    # or
    node dbBackupRestore.js -i <filename_or_path>
    # or 
    npm run db:restore -- <backup_filename_or_path>
    ```
