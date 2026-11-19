#!/bin/sh
set -eu
umask 077

# Bootstrap imports an existing SQLite volume before considering demo seed data.
# PostgreSQL credentials come from the platform; /data retains private uploads/backups.
# /data must be a durable volume writable by container UID/GID 1000.
node apps/api/bootstrap.js
exec "$@"
