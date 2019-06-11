function listBackups() {
    echo
    echo "Available backups:"
    ls -1 /backups/$1|cut -d_ -f2|cut -d. -f1|sort|uniq
    echo
}
