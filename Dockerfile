FROM python:3.12-slim
LABEL org.opencontainers.image.title="Photos" \
      org.opencontainers.image.description="Wizard app: back up your phone's photos to your own photo server." \
      org.opencontainers.image.licenses="MIT"
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PHOTOS_APP_HOST=0.0.0.0 PHOTOS_APP_PORT=9418
WORKDIR /app
COPY app/server.py LICENSE ./
COPY app/static/ ./static/
USER 1000:1000
EXPOSE 9418
HEALTHCHECK --interval=15s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:9418/photos/api/health',timeout=2)"
CMD ["python", "server.py"]
