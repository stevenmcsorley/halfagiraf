#!/bin/sh
set -e

host="$1"
user="$2"
db="$3"
shift 3
cmd="$@"

echo "Waiting for Postgres at $host to be ready..."
until pg_isready -h "$host" -U "$user" -d "$db" >/dev/null 2>&1; do
    echo >&2 "Postgres is unavailable - sleeping"
    sleep 1
done

echo >&2 "Postgres is up - executing command"
exec $cmd
