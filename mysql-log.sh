#!/bin/bash 

. ./project.conf

logfile="/var/log/mysql/${SITE}.log"
touch $logfile
chmod go+rw $logfile

if [ -z "$logfile" ]; then
  echo "General log file is not defined"
  exit
fi

trap 'mysql -u $USER -p$PASSWORD -h $HOST $DATABASE -e "set global general_log = 'OFF'"; unlink "$logfile"' INT

mysql -u $USER -p$PASSWORD -h $HOST $DATABASE -e "set global general_log_file = '$logfile'" && \
mysql -u $USER -p$PASSWORD -h $HOST $DATABASE -e "set global general_log = 'ON'" && \
tail -f $logfile | sed -r s/^\\s*\([0-9].*\)\\s+\(SELECT\|INSERT\|UPDATE\|SET\)/\\n------------\\n\\n\\2/ && \
mysql -u $USER -p$PASSWORD -h $HOST $DATABASE -e "set global general_log = 'OFF'"
