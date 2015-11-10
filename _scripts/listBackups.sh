function listBackups() {
    echo
    echo "Available backups:"
    ls -1 $1/backups|cut -d_ -f2|cut -d. -f1|sort|uniq
    echo
}
