#!/bin/bash

DUMP=$1

. ./project.conf

# regexp switch to sed by system type
if [[ "`uname`" == "Linux" ]]; then
        sed_ex_switch="-r"
else
        sed_ex_switch="-E"
fi

if [ -z "$PASSWORD" ]; then
  echo -n Password:
  stty -echo
  read -r PASSWORD
  stty echo
fi

# Default Engine InnoDB
[[ -z $ENGINE ]] && ENGINE=InnoDB

echo -n "Dropping all tables with prefix \`${PREFIX}\` from database \`${DATABASE}\`..."

mysqldump -u $USER -p$PASSWORD -h $HOST --add-drop-table --no-data $DATABASE | grep "^DROP TABLE IF EXISTS .${PREFIX}" | mysql -u $USER -p$PASSWORD -h $HOST $DATABASE && echo ' done.'

echo -n "Importing as $ENGINE database... "

cat $1 | sed $sed_ex_switch "s/^\) ENGINE=[^ ]+/\) ENGINE=$ENGINE/" | mysql -A -u $USER -p$PASSWORD -h $HOST $DATABASE && echo ' done.'


