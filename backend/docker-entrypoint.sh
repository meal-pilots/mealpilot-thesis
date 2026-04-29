#!/usr/bin/env bash
set -euo pipefail

CMD="${1:-web}"

run_web() {
    if [[ "${RUN_MIGRATIONS_ON_BOOT:-0}" == "1" ]]; then
        python manage.py migrate --noinput
    fi
    if [[ "${RUN_COLLECTSTATIC_ON_BOOT:-1}" == "1" ]]; then
        python manage.py collectstatic --noinput
    fi
    exec gunicorn config.wsgi:application \
        --bind "0.0.0.0:${PORT:-8000}" \
        --workers "${GUNICORN_WORKERS:-3}" \
        --threads "${GUNICORN_THREADS:-2}" \
        --worker-class gthread \
        --timeout "${GUNICORN_TIMEOUT:-60}" \
        --keep-alive 5 \
        --access-logfile - \
        --error-logfile - \
        --log-level "${GUNICORN_LOG_LEVEL:-info}"
}

run_worker() {
    exec celery -A config worker \
        --loglevel="${CELERY_LOG_LEVEL:-INFO}" \
        --concurrency="${CELERY_CONCURRENCY:-2}" \
        --queues="${CELERY_QUEUES:-default,planning,push}" \
        --max-tasks-per-child="${CELERY_MAX_TASKS_PER_CHILD:-200}"
}

run_beat() {
    exec celery -A config beat \
        --loglevel="${CELERY_LOG_LEVEL:-INFO}" \
        --scheduler django_celery_beat.schedulers:DatabaseScheduler
}

run_migrate() {
    exec python manage.py migrate --noinput
}

run_shell() {
    exec python manage.py shell
}

case "$CMD" in
    web) run_web ;;
    worker) run_worker ;;
    beat) run_beat ;;
    migrate) run_migrate ;;
    shell) run_shell ;;
    *)
        exec "$@"
        ;;
esac
