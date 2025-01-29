#!/bin/bash

BACKUP_DIR="./backups"
DB_CONTAINER="zenzen-db-1"
DB_NAME="postgres"
DB_USER="postgres"
# Load DB password from environment variable
DB_PASSWORD="${POSTGRES_PASSWORD}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"

# Function to create a backup
create_backup() {
    local BACKUP_TYPE=$1
    local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    local BACKUP_FILE="$BACKUP_DIR/$BACKUP_TYPE/backup_${BACKUP_TYPE}_${TIMESTAMP}.sql"
    
    echo "Creating $BACKUP_TYPE backup..."
    docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE"
    gzip "$BACKUP_FILE"
    
    echo "Backup created: ${BACKUP_FILE}.gz"
}

# Function to clean up old backups
cleanup_old_backups() {
    local BACKUP_TYPE=$1
    local RETENTION_DAYS=$2
    
    echo "Cleaning up old $BACKUP_TYPE backups..."
    find "$BACKUP_DIR/$BACKUP_TYPE" -name "backup_${BACKUP_TYPE}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
}

# Create daily backup
if [ "$1" = "daily" ]; then
    create_backup "daily"
    # Keep daily backups for 7 days
    cleanup_old_backups "daily" 7

# Create weekly backup
elif [ "$1" = "weekly" ]; then
    create_backup "weekly"
    # Keep weekly backups for 30 days
    cleanup_old_backups "weekly" 30

# Test backup restoration
elif [ "$1" = "test-restore" ]; then
    # Get the latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR/daily"/backup_daily_*.sql.gz | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        echo "No backup found to test restoration"
        exit 1
    fi
    
    echo "Testing backup restoration using: $LATEST_BACKUP"
    gunzip -c "$LATEST_BACKUP" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d "${DB_NAME}_test"
    
    if [ $? -eq 0 ]; then
        echo "Backup restoration test successful"
    else
        echo "Backup restoration test failed"
        exit 1
    fi

else
    echo "Usage: $0 [daily|weekly|test-restore]"
    exit 1
fi 