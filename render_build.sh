#!/usr/bin/env bash
# exit on error
set -o errexit

npm ci
npm run build

python -m pip install --upgrade pip
python -m pip install -r requirements.txt
flask --app src/app.py db upgrade
