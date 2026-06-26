#!/bin/bash
set -e

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Starting Uvicorn server..."
exec uvicorn reposage.asgi:application --host 0.0.0.0 --port 8000
