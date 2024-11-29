#!/bin/bash

cd "$(dirname "$0")"
set -e

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting project deletion script..."

. config/base
. _scripts/base.sh
shift

# Ensure project is specified
if [ -z "$PROJECT" ]; then
    echo "Error: PROJECT must be specified"
    exit 1
fi

# Check if project directory exists
if [ ! -d "$PROJECT" ]; then
    echo "Error: Project directory '$PROJECT' does not exist"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Validating project state..."
# Check if project is disabled
if ! grep -q "STATE=DISABLED" "$PROJECT/config" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Project must be disabled first"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking for running containers..."
# Check for running containers - only if docker-compose.yml exists
if [ -f "$PROJECT/docker-compose.yml" ]; then
    if docker-compose -f "$PROJECT/docker-compose.yml" ps --quiet 2>/dev/null | grep -q .; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Containers are still running"
        exit 1
    fi
fi

# Parse
AUTO_CONFIRM=0
while getopts "y" opt; do
    case $opt in
        y) AUTO_CONFIRM=1 ;;
        *) 
            echo "Invalid option: -$OPTARG"
            exit 1 ;;
    esac
done
shift $((OPTIND-1))

# Modified confirmation section
if [ $AUTO_CONFIRM -eq 0 ]; then
    echo "WARNING: This will permanently delete project '$PROJECT' and all its data!"
    echo "Are you sure you want to continue? (type 'yes' to confirm)"
    read -r confirmation

    if [ "$confirmation" != "yes" ]; then
        echo "Deletion cancelled"
        exit 1
    fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting deletion process for project '$PROJECT'..."

# Kill any remaining containers
if [ -f "$PROJECT/docker-compose.yml" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning up Docker resources..."
    docker-compose -f "$PROJECT/docker-compose.yml" kill 2>/dev/null || true
    docker-compose -f "$PROJECT/docker-compose.yml" rm -vf 2>/dev/null || true
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removing Docker network..."
docker network rm "${PROJECT}_default" 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Preparing for deletion..."
ARCHIVE_DATE=$(date '+%Y%m%d_%H%M%S')
ARCHIVE_DIR="/backups/DELETE_SITES"
ARCHIVE_NAME="${ARCHIVE_DATE}_${PROJECT}.tgz"

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# Do ALL file operations in a privileged container
docker run --rm --privileged \
    -v "$PROJECT:/project" \
    -v "$ARCHIVE_DIR:/archive" \
    -v "/backups/$PROJECT:/backup" \
    -v "/etc/nginx/sites-enabled:/nginx" \
    alpine sh -c "
        echo 'Setting permissions...'
        find /project -type d -exec chmod 755 {} + 2>/dev/null
        find /project -type f -exec chmod 644 {} + 2>/dev/null
        
        echo 'Creating archive...'
        cd /project
        tar czf /archive/$ARCHIVE_NAME \
            config \
            docker-compose.override.yml \
            php.ini \
            php.ini.patch \
            cron.sh \
            docker-compose.yml \
            nginx-site \
            ssl \
            volumes \
            2>/dev/null || true
        
        echo 'Removing old backups...'
        if [ -d '/backup' ]; then
            # Clear contents but preserve mount point
            rm -rf /backup/* /backup/.[!.]* 2>/dev/null || true
        fi

        echo 'Removing nginx configuration...'
        if [ -L \"/nginx/$PROJECT\" ]; then
            rm -f \"/nginx/$PROJECT\"
        fi

        echo 'Final cleanup...'
        rm -rf /project/* /project/.[!.]* 2>/dev/null || true
        
        echo 'All operations completed successfully'
    "

# Now remove the backup directory from the host
if [ -d "/backups/$PROJECT" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removing backup directory..."
    rmdir "/backups/$PROJECT" 2>/dev/null || true
fi

# And remove the project directory from the host
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removing project directory..."
rmdir "$PROJECT" 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Project '$PROJECT' has been deleted successfully"
