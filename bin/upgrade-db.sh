#!/bin/bash -e

main() {

# Authorize the execution of this script from anywhere
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/.."

docker compose -f docker-compose.dev.old.yml up -d

docker exec -t platon_postgres pg_dumpall -U platon > /tmp/platon_db_backup.sql

echo "Database backup completed. Backup file: /tmp/platon_db_backup.sql"
echo "Please check the backup file to ensure it was created successfully before proceeding with the upgrade."
echo "less /tmp/platon_db_backup.sql"
echo "tail /tmp/platon_db_backup.sql"
echo "Is the backup file valid and complete? (yes/No)"
read answer

if [[ "$answer" =~ ^[Yy]$ ]]; then
    echo "Proceeding with the database upgrade..."
else
    echo "Database upgrade aborted. Please ensure you have a valid backup before proceeding."
    exit 1
fi

docker compose -f docker-compose.dev.old.yml down

postgres_container=$(docker compose -f docker-compose.dev.yml run -d postgres)

echo "Waiting for the new PostgreSQL container to initialize..."
sleep 10

echo "Restoring the database from the backup..."
cat /tmp/platon_db_backup.sql | docker exec -i ${postgres_container} psql -U platon -d platon_db

DB_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
if [ -n "$DB_PASSWORD" ]; then
    echo "Upgrading user 'platon' password hashing to SCRAM-SHA-256..."
    docker exec -t ${postgres_container} psql -U platon -d platon_db -c "ALTER USER platon WITH PASSWORD '$DB_PASSWORD';"
fi

docker exec -t ${postgres_container} vacuumdb -U platon --all --analyze-in-stages
docker stop ${postgres_container}
docker rm ${postgres_container}

bin/docker/up.sh -d

echo "Database upgrade completed successfully."
echo "Please verify the application functionality and check for any issues after the upgrade."
echo "Are problem free and the application is working as expected? (yes/No)"
read answer

if [[ "$answer" =~ ^[Yy]$ ]]; then
    echo "Removing the backup file /tmp/platon_db_backup.sql"
    rm /tmp/platon_db_backup.sql
    docker volume rm platon_postgresdata
else
    echo "You can find the backup file at /tmp/platon_db_backup.sql. Please keep it safe until you are sure the upgrade was successful."
    echo "You can also use the volume platon_postgresdata to restore the previous database state if needed."
fi

}

main "$@"
