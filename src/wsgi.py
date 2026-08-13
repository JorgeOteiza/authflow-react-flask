# WSGI entry point used by production servers such as Gunicorn.

from app import app as application

if __name__ == "__main__":
    application.run()
