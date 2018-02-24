#!/bin/bash

. _scripts/base.sh
. _scripts/listBackups.sh

if [ "x$2" = "x" ]; then
    echo "Usage: $0 <project> <date>"
    echo
    echo "<date>: The timestamp of the backup to flatten, in the format yyyyMMdd."
    listBackups $PROJECT
    exit 1
fi

FINAL_BACKUP_ID=$2

if [ ! -e /backups/$PROJECT/backup_${FINAL_BACKUP_ID}.tar.gz ]; then
    echo "Backup not found: /backups/$PROJECT/backup_${FINAL_BACKUP_ID}.tar.gz"
    listBackups $PROJECT
    exit 1
fi

FLAT_BACKUP_FILE=$PROJECT/flat-backups/backup_${FINAL_BACKUP_ID}.tar.gz
if [ -e "$FLAT_BACKUP_FILE" ]; then
    echo "File $FLAT_BACKUP_FILE already exists. Skipping"
    exit 0
fi

rm -fr "$PROJECT/flat-backups/tmp"
mkdir -p "$PROJECT/flat-backups/tmp"

function copyFinalSQL() {
    SQL_FILE=`basename $FLAT_BACKUP_FILE .tar.gz`.sql.bz2
    echo "Copy $SQL_FILE"
    cp "/backups/$PROJECT/$SQL_FILE" "$PROJECT/flat-backups/$SQL_FILE"
}

FINAL_BACKUP="/backups/$PROJECT/backup_${FINAL_BACKUP_ID}.tar.gz"
ALL_BACKUPS="`ls -1 /backups/$PROJECT/*.tar.gz | sort`"

if [ "`echo $FINAL_BACKUP`" = "`ls -1 /backups/$PROJECT/*.tar.gz | sort | head -1`" ]; then
    if [ "_$WIPEOUT_INCREMENTAL" = "_YES" ]; then
        echo "Output is identical to input. Nothing to wipe out."
        exit 0
    fi
    echo "Output is identical to input. Just copy."
    cp $FINAL_BACKUP $FLAT_BACKUP_FILE
    copyFinalSQL
else
    if [ "_$WIPEOUT_INCREMENTAL" = "_YES" ]; then
        echo "Warning: In 10 seconds, I will delete incremental backups up to $FINAL_BACKUP_ID!"
        sleep 10
    fi
    copyFinalSQL

    N=0
    for BACKUP_FILE in $ALL_BACKUPS; do
        N=$((N + 1))
        echo "$N. extracting ${BACKUP_FILE}..."
        # Should we report errors?
        set +e
        tar --listed-incremental=/dev/null -xzf $BACKUP_FILE --directory="$PROJECT/flat-backups/tmp"
        set -e
        if [ $BACKUP_FILE = $FINAL_BACKUP ]; then
            echo "All good! We reached the final incremental backup."
            break
        fi
    done

    if [ "_$WIPEOUT_INCREMENTAL" = "_YES" ]; then
        echo "Removing incremental backups..."
        for BACKUP_FILE in $ALL_BACKUPS; do
            rm -f $BACKUP_FILE
            rm -f /backups/$PROJECT/`basename $BACKUP_FILE .tar.gz`.sql.bz2
            if [ $BACKUP_FILE = $FINAL_BACKUP ]; then
                break
            fi
        done
    fi

    echo "Assembling back into $FLAT_BACKUP_FILE"
    tar -C $PROJECT/flat-backups/tmp -czf $FLAT_BACKUP_FILE .
fi
rm -fr "$PROJECT/flat-backups/tmp"

if [ "_$WIPEOUT_INCREMENTAL" = "_YES" ]; then
    mv $FLAT_BACKUP_FILE /backups/$PROJECT
    mv "$PROJECT/flat-backups/$SQL_FILE" "/backups/$PROJECT/$SQL_FILE"
fi
