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

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Preparing backup..."
ARCHIVE_DATE=$(date '+%Y%m%d_%H%M%S')
ARCHIVE_DIR="/backups/DELETED"
ARCHIVE_NAME="${ARCHIVE_DATE}_${PROJECT}.tgz"

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Debug: Project directory contents on host:"
ls -la "$PROJECT"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Creating backup archive..."
if ! docker run --rm --privileged \
    -v "$(readlink -f "$PROJECT"):/project:ro" \
    -v "$(readlink -f "$ARCHIVE_DIR"):/archive" \
    alpine sh -c "
        # Verify mount points first
        echo 'Debug: Resolving mount points...'
        df -h /project
        ls -la /project
        
        if [ ! -f '/project/config' ]; then
            echo 'ERROR: Project directory not mounted correctly!'
            exit 1
        fi
        
        cd /project
        
        echo 'Debug: Project directory contents:'
        ls -la
        
        # Debug: Show directory contents and permissions
        echo 'Directory contents and permissions:'
        ls -la
        
        # Create a list of files to backup with better error handling
        echo 'Creating file list...'
        {
            # First try normal files
            find . -type f ! -path './volumes/mysql/*' ! -path './.*' 2>/dev/null || true
            
            # Then try hidden files
            find . -type f -name '.*' 2>/dev/null || true
            
            # Finally mysql data if it exists
            if [ -d './volumes/mysql' ]; then
                find ./volumes/mysql -type f 2>/dev/null || true
            fi
        } | sort > /tmp/files.txt
        
        # Show summary of files to backup
        TOTAL_FILES=\$(wc -l < /tmp/files.txt)
        echo \"Found \$TOTAL_FILES files to backup\"
        
        if [ \$TOTAL_FILES -eq 0 ]; then
            echo 'ERROR: No files found to backup!'
            echo 'Directory structure:'
            find . -type d 2>/dev/null || true
            exit 1
        fi
        
        echo 'First few files:'
        head -n 5 /tmp/files.txt
        if [ \$TOTAL_FILES -gt 10 ]; then
            echo '...'
            echo 'Last few files:'
            tail -n 5 /tmp/files.txt
        fi
        
        # Create the archive without verbose output
        echo 'Creating archive...'
        if ! tar czf /archive/$ARCHIVE_NAME -T /tmp/files.txt 2>/tmp/tar.err; then
            echo 'tar command failed:'
            cat /tmp/tar.err
            exit 1
        fi
        
        # Verify the archive
        echo 'Verifying archive...'
        if ! tar tzf /archive/$ARCHIVE_NAME >/dev/null 2>&1; then
            echo 'Archive verification failed!'
            exit 1
        fi
        
        # Check archive size
        ARCHIVE_SIZE=\$(stat -f %z /archive/$ARCHIVE_NAME 2>/dev/null || stat -c %s /archive/$ARCHIVE_NAME)
        if [ \$ARCHIVE_SIZE -lt 1024 ]; then  # Less than 1KB
            echo 'Warning: Archive seems too small!'
            exit 1
        fi
        
        echo 'Backup completed successfully'
    "; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed!"
    exit 1
fi

# Verify the backup exists and has reasonable size
if [ ! -f "$ARCHIVE_DIR/$ARCHIVE_NAME" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup file not found!"
    exit 1
fi

BACKUP_SIZE=$(stat -f %z "$ARCHIVE_DIR/$ARCHIVE_NAME" 2>/dev/null || stat -c %s "$ARCHIVE_DIR/$ARCHIVE_NAME")
if [ "$BACKUP_SIZE" -lt 1024 ]; then  # Less than 1KB
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup file is too small!"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created successfully: $ARCHIVE_NAME ($(numfmt --to=iec-i --suffix=B $BACKUP_SIZE))"

# Remove the heredoc and update the deletion code
# Do file operations in a privileged container
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning up project..."
if ! docker run --rm --privileged \
    -v "$(readlink -f "$PROJECT"):/project" \
    -v "$(readlink -f "/etc/nginx/sites-enabled"):/nginx" \
    alpine sh -c "
        echo 'Debug: Verifying mount points...'
        df -h /project /nginx
        
        echo 'Removing nginx configuration...'
        if [ -L \"/nginx/$PROJECT\" ]; then
            rm -f \"/nginx/$PROJECT\"
        fi

        echo 'Debug: Files to be removed:'
        ls -la /project

        echo 'Cleaning up project directory...'
        rm -rf /project/* /project/.[!.]* 2>/dev/null || true
        
        echo 'Verifying cleanup...'
        if [ -n \"\$(ls -A /project)\" ]; then
            echo 'WARNING: Some files remain in project directory'
            ls -la /project
            exit 1
        fi
        
        echo 'All operations completed successfully'
    "; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Cleanup failed!"
    exit 1
fi

# Now remove the backup directory from the host
if [ -d "/backups/$PROJECT" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removing backup directory..."
    rm -rf "/backups/$PROJECT" 2>/dev/null || true
fi

# And remove the project directory from the host
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removing project directory..."
rmdir "$PROJECT" 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Project '$PROJECT' has been deleted successfully"
